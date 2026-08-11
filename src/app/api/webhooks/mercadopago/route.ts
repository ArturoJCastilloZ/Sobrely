import {
  mpPayment,
  verifyMercadoPagoSignature,
} from "@/lib/billing/mercadopago";
import { applyMercadoPagoPayment } from "@/lib/billing/fulfillment";

/**
 * Webhook de Mercado Pago.
 *
 * Reglas duras (dominio dinero):
 *  1. Valida la firma `x-signature` (HMAC) — fail-closed si no coincide.
 *  2. NO confía en el payload: consulta el estado real del pago a la API de MP.
 *  3. Idempotente / anti-duplicado: el fulfillment ignora órdenes ya pagadas y
 *     el índice único de `orders` bloquea pagos repetidos.
 *  4. Responde 200 salvo firma inválida (401) o error interno (500), para que MP
 *     reintente solo cuando tiene sentido.
 *
 * Nunca se activa un plan por visitar la página de éxito: solo aquí, tras
 * confirmar `approved` con MP.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const url = new URL(request.url);
  // MP manda el id del recurso por query (?data.id= / ?id=) y/o en el body.
  let dataId =
    url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? null;
  let topic =
    url.searchParams.get("type") ?? url.searchParams.get("topic") ?? null;

  let body: {
    type?: string;
    action?: string;
    data?: { id?: string };
  } = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    body = {};
  }
  dataId = dataId ?? body.data?.id ?? null;
  topic = topic ?? body.type ?? null;

  const signatureOk = verifyMercadoPagoSignature({
    signatureHeader: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret: process.env.MP_WEBHOOK_SECRET,
  });
  if (!signatureOk) {
    console.warn("[mercadopago webhook] firma inválida");
    return new Response("invalid signature", { status: 401 });
  }

  // Solo procesamos notificaciones de pago.
  if (topic && topic !== "payment") {
    return Response.json({ ignored: topic }, { status: 200 });
  }
  if (!dataId) {
    return Response.json({ ignored: "no data.id" }, { status: 200 });
  }

  try {
    // Fuente de verdad: el estado real del pago en MP.
    const payment = await mpPayment().get({ id: dataId });
    const orderId = payment.external_reference;
    const status = payment.status;

    if (!orderId || !status) {
      console.warn("[mercadopago webhook] pago sin external_reference/status", {
        paymentId: dataId,
      });
      return Response.json({ ok: true, note: "sin referencia" }, { status: 200 });
    }

    const result = await applyMercadoPagoPayment({
      orderId,
      paymentId: String(payment.id ?? dataId),
      mpStatus: status,
    });

    if (!result.ok) {
      console.error("[mercadopago webhook] fulfillment falló:", result.reason);
      // 500 → MP reintenta.
      return new Response("fulfillment error", { status: 500 });
    }

    return Response.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "error desconocido";
    console.error("[mercadopago webhook] error consultando pago:", message);
    return new Response("error", { status: 500 });
  }
}
