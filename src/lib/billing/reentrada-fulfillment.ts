/**
 * ¿Un webhook repetido se puede cortar como idempotente, o todavía queda
 * trabajo por hacer?
 *
 * El defecto que cierra (§7 del roadmap, 2026-09-10): `isRedundantTransition`
 * mira SÓLO el estado de la ORDEN, pero el trabajo que puede faltar es el
 * ENTITLEMENT. Secuencia real:
 *
 *   1. `UPDATE orders → 'paid'` commitea.
 *   2. Falla el upsert del entitlement → `ok: false`.
 *   3. La ruta responde 500 y Mercado Pago reintenta — que es TODO el
 *      argumento de seguridad de ese `ok: false`.
 *   4. En el reintento `order.status` ya es `'paid'`, así que el guard corta
 *      con `ok: true` y **el entitlement no se crea nunca**.
 *
 * Resultado: el cliente pagó y no tiene acceso, que es exactamente el
 * desenlace que el arreglo del `ok: false` venía a cerrar. El reintento
 * apuntaba a una puerta cerrada.
 *
 * Vive aquí y no en `fulfillment.ts` porque ese módulo es `server-only` y
 * habla con la base de PRODUCCIÓN: ahí la decisión no se puede probar. Aquí es
 * una decisión pura sobre datos ya leídos.
 *
 * Se acota a `paid` A PROPÓSITO. En el camino de `refunded` el trabajo que
 * podría quedar pendiente es despublicar la invitación, y eso NO deja a nadie
 * sin lo que pagó: el gate público exige `is_entitlement_active`
 * (`0054:47`), así que con el entitlement ya revocado la invitación se ve
 * como caducada aunque `is_published` siga en `true`. Es desalineación
 * cosmética, no dinero.
 */

/** Estado mínimo de la orden que hace falta para decidir. */
export interface OrdenParaReentrada {
  /** Estado interno al que mapea el pago que acaba de llegar. */
  nuevoEstado: string;
  productType: string | null;
  invitationId: string | null;
  planId: string | null;
}

/**
 * ¿Vale la pena mirar el entitlement antes de cortar por idempotencia?
 *
 * Es la guarda que evita una consulta extra en el camino que no la necesita:
 * sólo una orden de plan, pagada y con invitación y plan resueltos puede tener
 * un entitlement pendiente.
 */
export function puedeQuedarEntitlementPendiente(
  orden: OrdenParaReentrada,
): boolean {
  return (
    orden.nuevoEstado === "paid" &&
    orden.productType === "plan" &&
    Boolean(orden.invitationId) &&
    Boolean(orden.planId)
  );
}

/**
 * Con el entitlement ya leído: ¿hay trabajo pendiente que justifique reentrar?
 *
 * `null` = no existe la fila. Un `status` que no sea `active` tampoco da
 * acceso, así que las dos cosas son trabajo pendiente.
 *
 * Un entitlement `active` de OTRO plan NO es trabajo pendiente: es la decisión
 * deliberada de `decidirEntitlement` de no degradar un plan superior. Y uno
 * `active` ya vencido tampoco: esa fila se escribió bien y venció después, que
 * es el ciclo de vida normal.
 */
export function hayEntitlementPendiente(
  entitlement: { status: string | null } | null,
): boolean {
  return !entitlement || entitlement.status !== "active";
}
