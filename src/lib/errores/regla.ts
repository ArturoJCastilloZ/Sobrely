import { createHash } from "node:crypto";

/**
 * Reglas puras del registro propio de errores (T04). Qué se guarda, cómo se
 * limpia un mensaje antes de guardarlo y cuándo vale la pena avisar por correo.
 * Sin `server-only` para poder probarlas; el que escribe es `registrar.ts`.
 *
 * Principio: un mensaje de error puede traer lo que sea (un correo en un
 * `duplicate key`, una llave en una URL, un token en un encabezado). Se limpia
 * ANTES de tocar la base y la limpieza es por patrones conocidos más un filtro
 * de cualquier cadena larga y opaca. Es defensa en profundidad, no garantía: por
 * eso tampoco se guarda el stack ni el cuerpo de peticiones.
 */
export const ORIGENES_ERROR = [
  "webhook_pago",
  "checkout",
  "publicar",
  "auth",
  "reconciliar",
  "embudo",
  "servidor",
] as const;
export type OrigenError = (typeof ORIGENES_ERROR)[number];
export type Severidad = "critico" | "aviso";

export const LARGO_MENSAJE = 300;
export const TOPE_ERRORES_POR_MINUTO = 60;
export const ALERTA_ENFRIAMIENTO_MS = 60 * 60 * 1000;
export const TOPE_ALERTAS_POR_HORA = 10;

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Quita datos personales y secretos conocidos y recorta. */
export function limpiarMensaje(crudo: unknown): string {
  let m = typeof crudo === "string" ? crudo : crudo instanceof Error ? crudo.message : String(crudo);
  m = m
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]*:[^\s/@]*@\S+/gi, "[conexión]")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[correo]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]")
    .replace(/\b(?:APP_USR|TEST|sk|pk|rk|sb_secret|sb_publishable)[-_][\w-]{8,}/gi, "[llave]")
    .replace(/Bearer\s+\S+/gi, "Bearer [token]")
    .replace(UUID, "<id>")
    .replace(/\?[^\s"')]+/g, "?[…]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[tel]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[secreto]");
  m = m.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return m.length > LARGO_MENSAJE ? `${m.slice(0, LARGO_MENSAJE - 1)}…` : m;
}

/** Misma causa, misma huella: los números y ids del mensaje no la cambian. */
export function huellaDeError(origen: OrigenError, mensajeLimpio: string): string {
  const base = mensajeLimpio.toLowerCase().replace(/\d+/g, "#");
  return createHash("sha256").update(`${origen}:${base}`).digest("hex");
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ES_RUTA = /^\/[\w\-/[\].]{0,79}$/;

export type ContextoError = Record<string, string | number>;

/** Solo claves permitidas y con la forma esperada; lo demás se descarta. */
export function filtrarContexto(crudo: Record<string, unknown> | undefined): ContextoError {
  const salida: ContextoError = {};
  if (!crudo) return salida;
  for (const clave of ["order_id", "invitation_id"] as const) {
    const v = crudo[clave];
    if (typeof v === "string" && ES_UUID.test(v)) salida[clave] = v;
  }
  if (typeof crudo.http_status === "number" && Number.isInteger(crudo.http_status)) {
    salida.http_status = crudo.http_status;
  }
  if (typeof crudo.codigo === "string" && /^[\w.:-]{1,40}$/.test(crudo.codigo)) {
    salida.codigo = crudo.codigo;
  }
  if (typeof crudo.ruta === "string" && ES_RUTA.test(crudo.ruta)) salida.ruta = crudo.ruta;
  return salida;
}

/**
 * Para los errores no atrapados (`onRequestError`): de qué ruta salieron. Se usa
 * el PATRÓN de la ruta (`/g/[token]`), nunca la URL pedida, que puede traer un
 * token de invitado.
 */
export function clasificarRuta(rutaPatron: string): { origen: OrigenError; severidad: Severidad } {
  if (rutaPatron.includes("/webhooks/")) return { origen: "webhook_pago", severidad: "critico" };
  if (rutaPatron.includes("/cron/reconciliar")) return { origen: "reconciliar", severidad: "critico" };
  if (rutaPatron.startsWith("/billing") || rutaPatron.includes("checkout")) {
    return { origen: "checkout", severidad: "critico" };
  }
  if (rutaPatron.startsWith("/auth") || rutaPatron.startsWith("/(auth)")) {
    return { origen: "auth", severidad: "aviso" };
  }
  if (rutaPatron.startsWith("/api/embudo")) return { origen: "embudo", severidad: "aviso" };
  return { origen: "servidor", severidad: "aviso" };
}

export function superaTopeDeErrores(enElUltimoMinuto: number): boolean {
  return enElUltimoMinuto >= TOPE_ERRORES_POR_MINUTO;
}

/**
 * ¿Se manda correo? Solo errores críticos, uno por huella por hora y un tope
 * global por hora: una avería no debe volver el buzón inservible.
 */
export function debeAlertar(d: {
  severidad: Severidad;
  alertaPrevia: boolean;
  alertasEnLaUltimaHora: number;
}): boolean {
  if (d.severidad !== "critico") return false;
  if (d.alertaPrevia) return false;
  return d.alertasEnLaUltimaHora < TOPE_ALERTAS_POR_HORA;
}

/**
 * Errores que son del CLIENTE y no del servidor: el navegador cerró la conexión
 * (cambió de página, perdió señal) mientras se enviaba la respuesta. Next los
 * reporta como errores no atrapados y, sin este filtro, llenarían el registro
 * de ruido (se vio con `The destination stream closed early` en la primera
 * prueba local).
 */
export function esRuidoDeCliente(mensaje: string): boolean {
  return /destination stream closed early|socket hang up|ECONNRESET|aborted|client disconnected|premature close/i.test(
    mensaje,
  );
}
