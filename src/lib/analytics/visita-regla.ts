/**
 * Reglas puras del endpoint de visitas (T05, parte 3). Las visitas llegan del
 * navegador, así que NADA de lo que traen se acepta sin validar: el evento debe
 * ser de visita, la sesión una cadena opaca de forma conocida y el valor un
 * texto corto. El endpoint además comprueba contra la base que la plantilla o
 * el tipo de evento existan, y deriva de ahí los parámetros que se guardan.
 */
export const EVENTOS_VISITA = ["view_category", "view_template", "view_pricing"] as const;
export type EventoVisita = (typeof EVENTOS_VISITA)[number];

export const TOPE_EVENTOS_POR_MINUTO = 300;
export const TAMANO_MAXIMO_CUERPO = 1024;

const SESION = /^[A-Za-z0-9-]{16,64}$/;
const VALOR = /^[\p{L}\p{N} _.\-]{1,80}$/u;

export type VisitaValida = { evento: EventoVisita; sesion: string; valor: string };

export function parsearVisita(crudo: unknown): VisitaValida | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const { evento, sesion, valor } = crudo as Record<string, unknown>;
  if (typeof evento !== "string" || !(EVENTOS_VISITA as readonly string[]).includes(evento)) return null;
  if (typeof sesion !== "string" || !SESION.test(sesion)) return null;
  if (typeof valor !== "string" || !VALOR.test(valor)) return null;
  return { evento: evento as EventoVisita, sesion, valor };
}

/**
 * Clave de idempotencia: una visita por sesión, evento y valor. La sesión es un
 * identificador al azar que vive en `sessionStorage` (se borra al cerrar la
 * pestaña, no sale a otros sitios y no es una cookie).
 */
export function claveVisita(v: VisitaValida): string {
  return `${v.sesion}:${v.valor}`;
}

const BOTS =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|preview|facebookexternalhit|whatsapp|curl|wget|python-requests|node-fetch|undici|go-http|java\//i;

/** Agente de usuario ausente o de rastreador/herramienta: no cuenta como visita. */
export function esBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return BOTS.test(userAgent);
}

/**
 * El navegador manda `Origin` en un POST. Se acepta solo el del propio sitio;
 * sin `Origin` (curl, scripts) no se acepta.
 */
export function mismoOrigen(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function superaTope(eventosEnElUltimoMinuto: number): boolean {
  return eventosEnElUltimoMinuto >= TOPE_EVENTOS_POR_MINUTO;
}
