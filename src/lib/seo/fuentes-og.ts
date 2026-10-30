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
 * que se añadan en `src/assets/fonts/` (con su `OFL.txt`), `cargarFuentesOG`
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

/** Archivos esperados en `src/assets/fonts/` (con su `OFL.txt`). */
export const ARCHIVOS_FUENTE_OG = [
  "PlayfairDisplay-Regular.ttf",
  "PlayfairDisplay-Bold.ttf",
] as const;

type Lector = () => Promise<readonly [Buffer, Buffer]>;

/*
  Rutas LITERALES a propósito: con una ruta armada en tiempo de ejecución
  (`join(dir, archivo)`) Turbopack no sabe qué leer y traza el proyecto entero
  al servidor (aviso «Dynamic filesystem access» en `pnpm build`).
*/
const leerDelRepo: Lector = () =>
  Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/PlayfairDisplay-Regular.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/PlayfairDisplay-Bold.ttf")),
  ]);

/**
 * Regular (400) y negrita (700). Si falta alguna devuelve `undefined` (fuente
 * por defecto): una imagen OG con la fuente de siempre es mejor que un 500 al
 * compartir. Un error que NO sea «no existe» se registra. `leer` solo se
 * sustituye en tests.
 */
export async function cargarFuentesOG(
  leer: Lector = leerDelRepo,
): Promise<FuenteOG[] | undefined> {
  try {
    const [regular, negrita] = await leer();
    return [
      { name: FAMILIA_OG, data: regular, weight: 400, style: "normal" },
      { name: FAMILIA_OG, data: negrita, weight: 700, style: "normal" },
    ];
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
