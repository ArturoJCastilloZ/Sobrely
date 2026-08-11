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
