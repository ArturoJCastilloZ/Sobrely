import type { Currency } from "@/lib/billing/types";

/**
 * Configuración comercial global, dirigida por entorno.
 *
 * Estas variables permiten activar/desactivar la campaña de lanzamiento y
 * cambiar la moneda/proveedor sin tocar código de componentes. Los nombres
 * reales están documentados en `.env.example`.
 *
 * `NEXT_PUBLIC_*` es seguro en el navegador (solo flags y moneda, nunca
 * claves). `PAYMENT_PROVIDER` es server-side.
 */

/** Proveedor de pago activo. Se usa en el backend (Subfase 8.3+). */
export type PaymentProvider = "mercadopago" | "stripe" | "none";

const CURRENCIES: readonly Currency[] = [
  "MXN",
  "USD",
  "EUR",
  "COP",
  "CLP",
  "PEN",
  "ARS",
];

function parseCurrency(value: string | undefined): Currency {
  const v = (value ?? "").toUpperCase();
  return (CURRENCIES as readonly string[]).includes(v)
    ? (v as Currency)
    : "MXN";
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

/** Moneda por defecto para mostrar precios. */
export const DEFAULT_CURRENCY: Currency = parseCurrency(
  process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
);

/** Interruptor maestro de la campaña de precios de lanzamiento. */
export const PRICING_LAUNCH_ENABLED: boolean = parseBool(
  process.env.NEXT_PUBLIC_PRICING_LAUNCH_ENABLED,
  true,
);

/**
 * Fecha (ISO `YYYY-MM-DD`) en que termina la campaña de lanzamiento. Si está
 * definida y ya pasó, el precio de lanzamiento deja de aplicar aunque
 * `PRICING_LAUNCH_ENABLED` siga en true. `null` = sin fecha de corte.
 */
export const LAUNCH_CAMPAIGN_END_DATE: string | null =
  process.env.NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE || null;

/** Proveedor de pago (server-side). */
export const PAYMENT_PROVIDER: PaymentProvider = ((): PaymentProvider => {
  const v = (process.env.PAYMENT_PROVIDER ?? "mercadopago").toLowerCase();
  if (v === "mercadopago" || v === "stripe" || v === "none") return v;
  return "mercadopago";
})();

/**
 * ¿La campaña de lanzamiento está vigente ahora?
 *
 * @param now fecha de referencia (inyectable para tests). Por defecto la hora
 * actual.
 */
export function isLaunchCampaignActive(now: Date = new Date()): boolean {
  if (!PRICING_LAUNCH_ENABLED) return false;
  if (!LAUNCH_CAMPAIGN_END_DATE) return true;
  const end = new Date(`${LAUNCH_CAMPAIGN_END_DATE}T23:59:59`);
  if (Number.isNaN(end.getTime())) return true;
  return now.getTime() <= end.getTime();
}

/**
 * Monto de crédito (en la moneda por defecto) que recibe el referente cuando su
 * referido realiza una compra pagada. Configurable por entorno; default $50.
 */
export const REFERRAL_CREDIT_AMOUNT: number = ((): number => {
  const n = Number(process.env.NEXT_PUBLIC_REFERRAL_CREDIT_MXN);
  return Number.isFinite(n) && n >= 0 ? n : 50;
})();

/** Interruptor maestro del programa de referidos. */
export const REFERRAL_ENABLED: boolean = parseBool(
  process.env.NEXT_PUBLIC_REFERRAL_ENABLED,
  true,
);

/**
 * Número/enlace de WhatsApp de soporte para las instrucciones de contacto de
 * los servicios asistidos. Vacío = sin enlace directo (se muestra texto guía).
 */
export const SUPPORT_WHATSAPP: string =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "";

/** Formatea un monto en la moneda dada, con locale es-MX. */
export function formatPrice(
  amount: number,
  currency: Currency = DEFAULT_CURRENCY,
): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
