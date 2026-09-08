/**
 * Validación pura del vanity slug (sin "use server"): normalización, formato y
 * palabras reservadas. La consumen las Server Actions y se puede testear aislado.
 */

/**
 * Palabras reservadas: rutas top-level de la app (una vanity no puede serlo).
 *
 * ⚠️ Esta lista se quedó VIEJA y era un defecto vivo: faltaban `blog`,
 * `privacidad`, `terminos` y las cinco landings `invitaciones-digitales-*`.
 * En Next un segmento LITERAL gana al dinámico, así que quien reclamara la
 * vanity `blog` se quedaba con una URL que nunca resuelve a su invitación —
 * y la vanity es una función que se cobra, así que el fallo era silencioso y
 * caro: pagas por un enlace que no lleva a ninguna parte.
 *
 * `vanity-reservados.test.ts` barre `src/app` y falla si aparece una ruta
 * top-level reclamable que no esté aquí, para que no vuelva a envejecer.
 * Los nombres de una y dos letras (`g`, `r`) no hacen falta: `isValidVanity`
 * exige 3 caracteres como mínimo.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "billing",
  "blog",
  "dashboard",
  "editor",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "plantilla",
  "pricing",
  "privacidad",
  "public",
  "terminos",
  "invitaciones-digitales-baby-shower",
  "invitaciones-digitales-boda",
  "invitaciones-digitales-corporativas",
  "invitaciones-digitales-cumpleanos",
  "invitaciones-digitales-xv-anos",
  "sitemap.xml",
  "robots.txt",
  "manifest.webmanifest",
  "opengraph-image",
  "favicon.ico",
  "_next",
]);

export function normalizeVanity(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Formato válido: 3–40, minúsculas alfanuméricas y guiones (no al inicio/fin). */
export function isValidVanity(slug: string): boolean {
  const s = normalizeVanity(slug);
  return /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(s);
}

export function isReservedVanity(slug: string): boolean {
  return RESERVED_SLUGS.has(normalizeVanity(slug));
}
