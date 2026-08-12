/**
 * Mapeo puro del estado de pago de Mercado Pago al estado interno de la orden.
 *
 * Módulo PURO (sin `server-only`) para poder testearlo aislado. Lo consume
 * `fulfillment.ts` (server-only) al aplicar el resultado de un pago.
 */

/** Estados de pago de Mercado Pago que nos interesan. */
export type MpPaymentStatus =
  | "approved"
  | "authorized"
  | "in_process"
  | "pending"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | (string & {});

/** Mapea el estado de MP al estado interno de la orden. */
export function mapStatus(mpStatus: MpPaymentStatus): string {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "authorized":
    case "in_process":
    case "pending":
      return "pending";
    case "rejected":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

/**
 * ¿La transición de estado de la orden es redundante y debe ignorarse?
 *
 * Protege dos cosas a la vez (dominio dinero):
 *  - Webhook duplicado exacto (`current === next`) → ignorar.
 *  - Una orden ya `paid` NO se degrada por una notificación tardía/fuera de
 *    orden (p.ej. un `pending` que llega después del `approved`) → ignorar,
 *    **excepto** un `refunded` (reembolso/contracargo), que SÍ debe procesarse.
 *
 * Devuelve `true` si la transición debe cortarse como idempotente.
 */
export function isRedundantTransition(
  currentOrderStatus: string,
  nextOrderStatus: string,
): boolean {
  if (currentOrderStatus === nextOrderStatus) return true;
  if (currentOrderStatus === "paid" && nextOrderStatus !== "refunded") {
    return true;
  }
  return false;
}
