/**
 * ¿El pago que reporta Mercado Pago es de ESTA orden en monto y moneda? PURO.
 *
 * Una sola fuente de verdad para dos caminos que marcan una orden como `paid`: el
 * webhook y el job de reconciliación (vía `applyMercadoPagoPayment`). Antes solo
 * la reconciliación comparaba; el webhook marcaba `paid` con `approved` +
 * `external_reference` y nada más.
 *
 * Fail-closed: un monto o una moneda ausentes, no numéricos o distintos dan
 * `false`. «No sé cuánto se cobró» NO es «se cobró lo correcto».
 */
/**
 * Código de `reason` cuando Mercado Pago aprobó un pago cuyo monto o moneda no
 * son los de la orden. La ruta del webhook lo usa para NO pedir reintento: es una
 * condición definitiva, reintentar no la arregla.
 */
export const REASON_MONTO_DISTINTO = "amount_mismatch";

export type PagoCobrado = {
  amount: number | null;
  currency: string | null;
};

export type OrdenEsperada = {
  amount: number;
  currency: string;
};

/** Igualdad de dinero en centavos: 199 y «199.00» son lo mismo; 398.99 y 399 no. */
export function mismoMonto(pago: number | null, orden: number): boolean {
  if (pago === null || !Number.isFinite(pago)) return false;
  const esperado = Number(orden);
  if (!Number.isFinite(esperado)) return false;
  return Math.round(pago * 100) === Math.round(esperado * 100);
}

export function montoYMonedaCoinciden(
  pago: PagoCobrado,
  orden: OrdenEsperada,
): boolean {
  if (!mismoMonto(pago.amount, orden.amount)) return false;
  if (pago.currency === null || pago.currency === "") return false;
  if (!orden.currency) return false;
  return pago.currency.toUpperCase() === orden.currency.toUpperCase();
}
