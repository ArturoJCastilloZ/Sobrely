import crypto from "node:crypto";

/**
 * Verificación de la firma `x-signature` de un webhook de Mercado Pago.
 *
 * Módulo PURO (sin `server-only` ni secretos horneados: el secreto se pasa como
 * argumento) para poder testearlo de forma aislada.
 *
 * MP envía `x-signature: ts=<ts>,v1=<hmac>` y `x-request-id`. El manifiesto a
 * firmar es `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` con HMAC-SHA256 y
 * el secreto del webhook. Si el `data.id` es alfanumérico, MP lo compara en
 * minúsculas.
 *
 * Comparación en tiempo constante. Fail-closed: ante cualquier dato faltante o
 * firma que no coincide, devuelve false (no se confía en el evento).
 */
export function verifyMercadoPagoSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string | undefined;
}): boolean {
  const { signatureHeader, requestId, dataId, secret } = params;
  if (!signatureHeader || !requestId || !dataId || !secret) return false;

  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(",")) {
    const idx = segment.indexOf("=");
    if (idx === -1) continue;
    const key = segment.slice(0, idx).trim();
    const value = segment.slice(idx + 1).trim();
    if (key) parts[key] = value;
  }

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
