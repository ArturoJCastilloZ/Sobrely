import { createHash } from "node:crypto";

/**
 * Reglas puras del embudo (T05): qué eventos existen, qué parámetros admite cada
 * uno y cómo se vuelve opaca la clave de idempotencia. Sin `server-only` para
 * poder probarlas; el que escribe en la base es `embudo.ts`.
 *
 * Lista y parámetros: docs/auditoria-2026-10/07-embudo-y-analytics.md §4.
 * `page_view` no está a propósito: lo cubre Vercel Web Analytics.
 */
export const EVENTOS_EMBUDO = [
  "view_category",
  "view_template",
  "start_customization",
  "sign_up",
  "complete_draft",
  "view_pricing",
  "begin_checkout",
  "payment_failed",
  "purchase",
] as const;

export type EventoEmbudo = (typeof EVENTOS_EMBUDO)[number];

type Tipo = "string" | "number" | "boolean";

/** Lista permitida por evento. Todo lo que no esté aquí se descarta. */
const PARAMETROS: Record<EventoEmbudo, Record<string, Tipo>> = {
  view_category: { event_type: "string" },
  view_template: { template_slug: "string", event_type: "string" },
  start_customization: {
    template_slug: "string",
    event_type: "string",
    is_guest: "boolean",
  },
  sign_up: { method: "string" },
  complete_draft: { template_slug: "string", modules_count: "number" },
  view_pricing: { from: "string" },
  begin_checkout: { plan_code: "string", value: "number", currency: "string" },
  payment_failed: { plan_code: "string", reason_code: "string" },
  purchase: {
    transaction_id: "string",
    plan_code: "string",
    value: "number",
    currency: "string",
  },
};

const LARGO_MAXIMO = 80;

export type ParametrosEmbudo = Record<string, string | number | boolean>;

export function esEventoEmbudo(valor: string): valor is EventoEmbudo {
  return (EVENTOS_EMBUDO as readonly string[]).includes(valor);
}

/**
 * Deja solo los parámetros permitidos para el evento y con el tipo correcto.
 * Los textos se recortan y pierden los caracteres de control. Devuelve `null`
 * si el evento no existe.
 */
export function filtrarParametros(
  evento: string,
  crudos: Record<string, unknown> | undefined,
): ParametrosEmbudo | null {
  if (!esEventoEmbudo(evento)) return null;
  const permitidos = PARAMETROS[evento];
  const salida: ParametrosEmbudo = {};
  for (const [clave, tipo] of Object.entries(permitidos)) {
    const valor = crudos?.[clave];
    if (tipo === "string" && typeof valor === "string") {
      const limpio = valor.replace(/[\u0000-\u001f\u007f]/g, "").trim();
      if (limpio) salida[clave] = limpio.slice(0, LARGO_MAXIMO);
    } else if (tipo === "number" && typeof valor === "number" && Number.isFinite(valor)) {
      salida[clave] = valor;
    } else if (tipo === "boolean" && typeof valor === "boolean") {
      salida[clave] = valor;
    }
  }
  return salida;
}

/**
 * Huella opaca de la clave de idempotencia. La misma clave siempre da la misma
 * huella (eso es lo que permite no contar dos veces) y la tabla no guarda el id
 * original.
 */
export function claveOpaca(evento: EventoEmbudo, clave: string): string {
  return createHash("sha256").update(`${evento}:${clave}`).digest("hex");
}
