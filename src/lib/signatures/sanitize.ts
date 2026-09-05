/**
 * Saneado de una firma — lógica pura.
 *
 * Quien escribe es ANÓNIMO y su texto se va a mostrar tal cual a todos los
 * demás invitados. Eso lo pone en la misma categoría que las respuestas del
 * RSVP: nada de lo que llega es de fiar, y la validación de la UI no cuenta
 * porque la llave pública permite hablarle a la base sin pasar por la página.
 *
 * Los topes viven también como CHECK en la `0023`. Aquí se repiten a propósito:
 * la base rechaza, pero rechazar con un `23514` en la cara del invitado es una
 * mala experiencia. Este módulo existe para poder decirle qué le falta.
 */

/** Tope del nombre. Coincide con el CHECK de la 0023. */
export const MAX_NAME_LENGTH = 60;
/** Tope del mensaje. Coincide con el CHECK de la 0023. */
export const MAX_MESSAGE_LENGTH = 500;

export type SignatureInput = { guestName: unknown; message: unknown };
export type SignatureClean = { guestName: string; message: string };
export type SignatureResult =
  | { ok: true; value: SignatureClean }
  | { ok: false; error: string };

/**
 * Normaliza los espacios sin destruir la intención.
 *
 * Se colapsan los espacios horizontales y se recortan los extremos, pero los
 * saltos de línea SE CONSERVAN: alguien que firma en tres renglones lo hizo a
 * propósito. Lo que sí se recorta es la avalancha de saltos —más de dos
 * seguidos— que se usa para empujar las demás firmas fuera de la pantalla.
 */
export function normalizeSignatureText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((linea) => linea.trim())
    .join("\n")
    .trim();
}

/**
 * ¿Esto es una firma que se puede guardar?
 *
 * Devuelve el motivo en español y listo para enseñar, no un código: quien lo
 * lee es un invitado en una boda, no un desarrollador.
 */
export function sanitizeSignature(input: SignatureInput): SignatureResult {
  if (typeof input.guestName !== "string" || typeof input.message !== "string") {
    return { ok: false, error: "Faltan datos de la firma." };
  }

  const guestName = normalizeSignatureText(input.guestName);
  const message = normalizeSignatureText(input.message);

  if (!guestName) return { ok: false, error: "Escribe tu nombre." };
  if (guestName.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `El nombre no puede pasar de ${MAX_NAME_LENGTH} caracteres.`,
    };
  }

  if (!message) return { ok: false, error: "Escribe tu mensaje." };
  if (message.length > MAX_MESSAGE_LENGTH) {
    // No se recorta en silencio: el invitado escribió algo y merece saber que
    // no cupo, en vez de descubrir después que su mensaje quedó a la mitad.
    return {
      ok: false,
      error: `El mensaje no puede pasar de ${MAX_MESSAGE_LENGTH} caracteres. Llevas ${message.length}.`,
    };
  }

  return { ok: true, value: { guestName, message } };
}

/**
 * ¿Esta firma es la misma que la anterior del mismo evento?
 *
 * El doble clic y el "no pasó nada, le doy otra vez" son la causa real de las
 * firmas duplicadas, no el spam. Se comparan nombre y mensaje ya normalizados
 * y sin acentos ni mayúsculas, porque "Ana" y "ana " son la misma persona
 * dándole dos veces al botón.
 */
export function isDuplicateSignature(
  nueva: SignatureClean,
  previa: { guest_name: string; message: string } | null | undefined,
): boolean {
  if (!previa) return false;
  const plano = (s: string) =>
    s
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  return (
    plano(nueva.guestName) === plano(previa.guest_name) &&
    plano(nueva.message) === plano(previa.message)
  );
}
