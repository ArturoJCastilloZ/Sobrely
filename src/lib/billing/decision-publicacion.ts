import type { Plan, PlanCode } from "@/lib/billing/types";
import { formatPrice } from "@/lib/billing/config";
import { getEffectivePrice } from "@/lib/billing/plans";

/**
 * ¿Qué pasa cuando alguien pulsa «Publicar»? La decisión, sin efectos.
 *
 * Existe porque quitar la demo (Fase 3) cambia el significado de «no hay
 * entitlement»: ya no es «publica gratis 14 días», es «hay que pagar». Esa regla
 * decide si el cliente ve su invitación pública o un cobro, así que vive en una
 * función pura que se prueba y se muta, y `setPublished` solo la ejecuta.
 *
 *   - comp (cuenta de cortesía) o entitlement vigente → manda el GATE
 *     (`canPublishInvitation`): ¿el plan que ya tiene cubre lo que usa?
 *   - sin ninguno de los dos → NO se crea nada gratis: se pide el plan de pago
 *     más barato que cubra la invitación (`planDePagoRequerido`).
 *
 * Los entitlements Free que YA existen (demos publicadas antes de este cambio)
 * siguen vigentes hasta vencer: caen en la primera rama y el gate los trata como
 * siempre. Solo desaparece la CREACIÓN de demos nuevas.
 */
export type DecisionPublicacion =
  | { tipo: "publicar" }
  | {
      tipo: "pagar";
      planRequerido: PlanCode;
      /** `sin_plan`: nunca ha pagado. `plan_insuficiente`: tiene plan, pero usa más. */
      motivo: "sin_plan" | "plan_insuficiente";
      mensaje: string;
    }
  | { tipo: "sin_plan_disponible"; mensaje: string };

export type EntradaDecision = {
  tieneComp: boolean;
  entitlementVigente: boolean;
  /** Resultado de `canPublishInvitation`. Solo hace falta cuando hay comp o entitlement. */
  gate: { allowed: boolean; requiredPlanCode?: PlanCode; reason?: string } | null;
  /** `planDePagoRequerido` de la invitación. Solo hace falta sin comp ni entitlement. */
  planDePago: Plan | undefined;
};

export function decidirPublicacion(e: EntradaDecision): DecisionPublicacion {
  if (e.tieneComp || e.entitlementVigente) {
    // Sin gate no se puede afirmar que el plan cubre: ante la duda, NO publica.
    if (!e.gate) {
      return {
        tipo: "sin_plan_disponible",
        mensaje: "No se pudo comprobar tu plan. Inténtalo de nuevo.",
      };
    }
    if (e.gate.allowed) return { tipo: "publicar" };
    if (e.gate.requiredPlanCode) {
      return {
        tipo: "pagar",
        planRequerido: e.gate.requiredPlanCode,
        motivo: "plan_insuficiente",
        mensaje:
          e.gate.reason ?? "Necesitas un plan superior para publicar esta invitación.",
      };
    }
    return {
      tipo: "sin_plan_disponible",
      mensaje:
        e.gate.reason ??
        "Tu invitación usa elementos que no están disponibles en ningún plan activo.",
    };
  }

  if (!e.planDePago) {
    return {
      tipo: "sin_plan_disponible",
      mensaje:
        "Tu invitación usa elementos que no están disponibles en ningún plan activo.",
    };
  }
  return {
    tipo: "pagar",
    planRequerido: e.planDePago.code,
    motivo: "sin_plan",
    mensaje:
      `Publicar esta invitación requiere el plan ${e.planDePago.name} ` +
      `(${formatPrice(getEffectivePrice(e.planDePago), e.planDePago.currency)}, ` +
      `pago único por evento). Diseñar y editar es gratis.`,
  };
}
