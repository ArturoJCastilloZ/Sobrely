/**
 * Validación pura del vanity slug (sin "use server"): normalización, formato y
 * palabras reservadas. La consumen las Server Actions y se puede testear aislado.
 */

/** Palabras reservadas: rutas top-level de la app (una vanity no puede serlo). */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "billing",
  "dashboard",
  "editor",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "pricing",
  "public",
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
