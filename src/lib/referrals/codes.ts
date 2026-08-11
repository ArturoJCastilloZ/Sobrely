/**
 * Generación y normalización de códigos de referido.
 *
 * Puro y testeable. El código es corto, legible (sin caracteres ambiguos como
 * 0/O, 1/I/L) y en mayúsculas. La unicidad la garantiza el índice único de la
 * columna `referral_codes.code`; el generador reintenta en caso de colisión
 * (ver `ensureReferralCode`).
 */

/** Alfabeto sin caracteres ambiguos. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 7;

/** Normaliza un código introducido por el usuario (trim + mayúsculas). */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** ¿El formato del código es plausible? (validación barata previa a la BD). */
export function isValidCodeFormat(code: string): boolean {
  const c = normalizeCode(code);
  return c.length >= 5 && c.length <= 12 && /^[A-Z0-9]+$/.test(c);
}

/** Genera un código aleatorio nuevo del alfabeto legible. */
export function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
