import { getPlan } from "@/lib/billing/plans";
import type { PlanCode } from "@/lib/billing/types";

/**
 * Qué escribir en el entitlement cuando llega un pago aprobado.
 *
 * El defecto que cierra: el fulfillment hacía un `upsert` a secas por
 * `invitation_id`, así que un pago de un plan INFERIOR reemplazaba un
 * entitlement activo de un plan superior. El cliente pagaba Esencial teniendo
 * Premium vigente y se quedaba con Esencial — pagó por perder acceso.
 *
 * Vive fuera de `fulfillment.ts` porque ahí no se puede probar: ese módulo es
 * `server-only` y habla con la base. Aquí es aritmética de planes y fechas, que
 * es justo lo que hay que blindar en dominio dinero.
 *
 * El orden de los planes NO se inventa: se compara por `priceRegular`, que es
 * el mismo criterio que ya usa `minimalPlanForModules` en `plans.ts` para
 * decidir cuál es el plan «mínimo».
 */
export type DecisionDeEntitlement =
  | { accion: "escribir"; planCode: PlanCode; expiresAt: Date; motivo: string }
  | { accion: "no-degradar"; motivo: string };

export function decidirEntitlement(params: {
  /** Plan que se acaba de pagar. */
  planPagado: PlanCode;
  /** Vencimiento que le tocaría al plan pagado. */
  expiraPagado: Date;
  /** Entitlement que ya existe, si hay alguno. */
  actual?: {
    planCode: PlanCode;
    /** `status` de la fila; sólo un `active` cuenta como acceso vigente. */
    status: string;
    /** `null` = sin vencimiento (ilimitado). */
    expiresAt: Date | null;
  } | null;
  /** Ahora, para saber si el actual sigue vigente. */
  ahora: Date;
}): DecisionDeEntitlement {
  const { planPagado, expiraPagado, actual, ahora } = params;

  const precio = (code: PlanCode): number =>
    getPlan(code)?.priceRegular ?? -1;

  // Sin fila previa, o con una que ya no da acceso: se escribe lo pagado.
  if (!actual || actual.status !== "active") {
    return {
      accion: "escribir",
      planCode: planPagado,
      expiresAt: expiraPagado,
      motivo: actual ? "el anterior no estaba activo" : "no habia entitlement",
    };
  }
  const vigente =
    actual.expiresAt === null || actual.expiresAt.getTime() > ahora.getTime();
  if (!vigente) {
    return {
      accion: "escribir",
      planCode: planPagado,
      expiresAt: expiraPagado,
      motivo: "el anterior estaba vencido",
    };
  }

  // Hay acceso vigente. Nunca se baja de plan.
  if (precio(actual.planCode) > precio(planPagado)) {
    // Pero el pago no se tira: si compra más tiempo, se conserva el plan ALTO
    // y se estira el vencimiento. Bajar el plan seria cobrarle por perder
    // acceso; ignorar el pago del todo seria cobrarle por nada.
    const estira =
      actual.expiresAt !== null &&
      expiraPagado.getTime() > actual.expiresAt.getTime();
    if (estira) {
      return {
        accion: "escribir",
        planCode: actual.planCode,
        expiresAt: expiraPagado,
        motivo: "se conserva el plan superior y se extiende el vencimiento",
      };
    }
    return {
      accion: "no-degradar",
      motivo: "hay un plan superior vigente y este pago no lo extiende",
    };
  }

  // Igual o mejor que el vigente: se escribe, con el vencimiento MÁS LEJANO de
  // los dos. Sin esto, renovar con el mismo plan podría acortar el acceso.
  const expiresAt =
    actual.expiresAt !== null && actual.expiresAt.getTime() > expiraPagado.getTime()
      ? actual.expiresAt
      : expiraPagado;
  return {
    accion: "escribir",
    planCode: planPagado,
    expiresAt,
    motivo:
      precio(planPagado) > precio(actual.planCode)
        ? "mejora de plan"
        : "renovacion del mismo plan",
  };
}
