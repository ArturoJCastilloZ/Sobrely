import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

// La verificación de firma vive en un módulo puro y testeable; se re-exporta
// para que el resto del código la importe desde aquí como antes.
export { verifyMercadoPagoSignature } from "@/lib/billing/mp-signature";

/**
 * Integración server-side de Mercado Pago (Checkout Pro).
 *
 * El `MP_ACCESS_TOKEN` es secreto y vive solo en el servidor. La clave pública
 * (`NEXT_PUBLIC_MP_PUBLIC_KEY`) es la única que puede ir al navegador.
 */

/** Config del SDK con el access token secreto. */
export function mpConfig(): MercadoPagoConfig {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no está configurado.");
  }
  return new MercadoPagoConfig({ accessToken });
}

/** Cliente de Preferencias (crear checkout). */
export function mpPreference(): Preference {
  return new Preference(mpConfig());
}

/** Cliente de Pagos (consultar estado real de un pago). */
export function mpPayment(): Payment {
  return new Payment(mpConfig());
}
