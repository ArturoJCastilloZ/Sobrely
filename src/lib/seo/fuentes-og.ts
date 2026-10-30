import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageResponse } from "next/og";

/**
 * Fuentes de las imágenes Open Graph (`ImageResponse` / Satori).
 *
 * POR QUÉ. Sin `fonts`, Satori solo tiene la `Geist-Regular.ttf` que trae
 * `next/og`: no hay serif ni negrita (el `fontFamily: "serif"` y el
 * `fontWeight: 700` se ignoran) y, medido en PNG, deja espacios de ancho
 * irregular entre palabras («Valeria␣␣y Mateo», «diciembre␣␣de»). Con una
 * fuente estática propia los espacios salen parejos y el título en negrita.
 *
 * QUÉ FALTA (defecto documentado). La fuente prevista es Playfair Display
 * (OFL 1.1; es la `--font-display` de la marca), en TTF ESTÁTICO regular y
 * negrita — Satori no lee WOFF2 ni instancia fuentes variables, así que los
 * `.woff2` variables que `next/font` deja en `.next/` no sirven. Hoy el repo no
 * trae ningún TTF/OTF utilizable y bajarlo requiere permiso del dueño. Hasta
 * que se añadan en `DIR_FUENTES_OG` (con su `OFL.txt`), `cargarFuentesOG`
 * devuelve `undefined` y la imagen sale con la fuente por defecto, como antes.
 * Añadir los archivos basta: no hay que tocar código.
 *
 * Patrón de lectura: `readFile(join(process.cwd(), …))`, como la guía de
 * `opengraph-image` (node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/01-metadata/opengraph-image.md, «Using Node.js runtime
 * with local assets»).
 */

type OpcionesDeImagen = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>;
export type FuenteOG = NonNullable<OpcionesDeImagen["fonts"]>[number];

export const FAMILIA_OG = "Playfair Display";

export const ARCHIVOS_FUENTE_OG = [
  { archivo: "PlayfairDisplay-Regular.ttf", weight: 400 },
  { archivo: "PlayfairDisplay-Bold.ttf", weight: 700 },
] as const;

export const DIR_FUENTES_OG = join(process.cwd(), "src/assets/fonts");

/**
 * Lee regular y negrita de `dir`. Si falta alguna devuelve `undefined` (fuente
 * por defecto): una imagen OG con la fuente de siempre es mejor que un 500 al
 * compartir. Un error que NO sea «no existe» se registra.
 */
export async function cargarFuentesOG(
  dir: string = DIR_FUENTES_OG,
): Promise<FuenteOG[] | undefined> {
  try {
    return await Promise.all(
      ARCHIVOS_FUENTE_OG.map(async ({ archivo, weight }) => ({
        name: FAMILIA_OG,
        data: await readFile(join(dir, archivo)),
        weight,
        style: "normal" as const,
      })),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("imagen OG: no se pudieron leer las fuentes", e);
    }
    return undefined;
  }
}

let enMemoria: Promise<FuenteOG[] | undefined> | undefined;

/** `cargarFuentesOG()` una sola vez por proceso: los archivos no cambian. */
export function fuentesOG(): Promise<FuenteOG[] | undefined> {
  enMemoria ??= cargarFuentesOG();
  return enMemoria;
}
