import { fuentesOG } from "@/lib/seo/fuentes-og";
import { imagenGenerica } from "@/lib/seo/imagen-generica";

/**
 * Imagen Open Graph de marketing (Fase 7.1). Se usa al compartir la landing en
 * redes/chat. Generada con next/og (sin assets externos ni fuentes remotas para
 * respetar el aislamiento y no depender de la red en build/runtime). Las
 * fuentes locales, si están, salen de `fuentesOG()` (ver `lib/seo/fuentes-og`).
 *
 * Las invitaciones públicas tienen su propio OG (Fase 3); esta es la de marca.
 */
export const alt = "Sobrely — Invitaciones digitales dinámicas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return imagenGenerica(await fuentesOG());
}
