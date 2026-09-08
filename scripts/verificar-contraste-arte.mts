/**
 * Verifica que el texto se pueda LEER sobre cada arte de fondo.
 *
 * Uso:
 *   node scripts/verificar-contraste-arte.mts
 *
 * Por qué existe, y por qué ANTES que las diez direcciones de arte. La Fase 0
 * derivó `--inv-cta` midiendo AA **contra el color de fondo plano**: de los 20
 * packs, 11 fallaban y ahora fallan 0. Con una imagen detrás esa garantía DEJA
 * DE VALER — el fondo ya no es un color, es un rango de luminancias. Se vio en
 * la primera prueba: el «QUIERO SABER» de la acuarela salía rosa sobre rosa y
 * no se leía.
 *
 * Producir diez fondos sin poder medir esto sería reintroducir por la puerta de
 * atrás el defecto que la Fase 0 cerró. De ahí el instrumento primero.
 *
 * Cómo mide. Rasteriza cada SVG a 420x900 en un canvas, muestrea una rejilla y
 * calcula el contraste WCAG del texto contra el píxel PEOR — no contra el
 * promedio. El promedio es lo que hace que un fondo con una mancha clara
 * «pase» mientras el texto que cae sobre la mancha es ilegible.
 *
 * La banda que importa es la CENTRAL: el arte pone su interés en los bordes y
 * el texto va al medio, así que se mide donde el texto cae de verdad y no en
 * las esquinas decoradas.
 */
import { chromium, type Browser } from "playwright-core";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ARTE } from "../src/lib/theme/arte.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_ARTE = join(RAIZ, "public", "arte");

/** Umbral WCAG AA para texto normal. El mismo que usa `contrast.ts`. */
const AA_NORMAL = 4.5;

/**
 * Los dos extremos de texto que un pack puede traer. Si un arte no aguanta
 * NINGUNO de los dos, no es utilizable sin un velo detrás del texto.
 */
const TEXTOS = {
  oscuro: [31, 41, 55] as const,
  claro: [248, 250, 252] as const,
};

function luminancia(p: readonly number[]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
}

function contraste(a: readonly number[], b: readonly number[]): number {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

async function main() {
  const svgs = readdirSync(DIR_ARTE).filter((f) => f.endsWith(".svg")).sort();
  if (svgs.length === 0) throw new Error(`No hay SVG en ${DIR_ARTE}`);

  let browser: Browser | undefined;
  const filas: { arte: string; oscuro: number; claro: number; veredicto: string; declarado: string; coincide: boolean }[] = [];

  try {
    browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage();

    for (const svg of svgs) {
      const fuente = readFileSync(join(DIR_ARTE, svg), "utf8");
      const muestras: number[][] = await page.evaluate(async (texto) => {
        const img = new Image();
        // Data URI para no depender de un servidor: tiene que poder correr sin
        // `pnpm dev` levantado.
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(texto);
        await img.decode();
        const c = document.createElement("canvas");
        c.width = 420;
        c.height = 900;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 420, 900);
        // Banda central (70% x 70%): ahí cae el texto. Las esquinas llevan el
        // ornamento a propósito y medirlas daría un falso negativo.
        const out: number[][] = [];
        for (let y = 135; y < 765; y += 12) {
          for (let x = 63; x < 357; x += 12) {
            const d = ctx.getImageData(x, y, 1, 1).data;
            out.push([d[0], d[1], d[2]]);
          }
        }
        return out;
      }, fuente);

      if (muestras.length < 100) {
        throw new Error(`SONDA INVALIDA en ${svg}: ${muestras.length} muestras`);
      }

      // El PEOR pixel, no el promedio.
      const oscuro = Math.min(...muestras.map((p) => contraste(TEXTOS.oscuro, p)));
      const claro = Math.min(...muestras.map((p) => contraste(TEXTOS.claro, p)));
      const veredicto =
        oscuro >= AA_NORMAL
          ? claro >= AA_NORMAL
            ? "ambos"
            : "solo texto OSCURO"
          : claro >= AA_NORMAL
            ? "solo texto CLARO"
            : "NINGUNO - necesita velo";

      // Se COMPARA con lo declarado en el registro. Sin esto la tabla de
      // `arte.ts` podria decir "oscuro" mientras el SVG solo admite claro, y
      // la asignacion quedaria mal fundada sin que nada avisara.
      const clave = svg.replace(/\.svg$/, "");
      const declarado = ARTE.find((a) => a.clave === clave);
      const medido: string =
        oscuro >= AA_NORMAL ? (claro >= AA_NORMAL ? "ambos" : "oscuro") : claro >= AA_NORMAL ? "claro" : "ninguno";

      filas.push({
        arte: svg,
        oscuro: +oscuro.toFixed(2),
        claro: +claro.toFixed(2),
        veredicto,
        declarado: declarado ? declarado.polaridad : "SIN DECLARAR",
        coincide: declarado ? declarado.polaridad === medido : false,
      });
    }
  } finally {
    await browser?.close();
  }

  console.log(`\nContraste del texto sobre el arte (peor pixel, AA = ${AA_NORMAL})\n`);
  console.log(
    "arte".padEnd(28) + "oscuro".padStart(8) + "claro".padStart(8) + "  medido".padEnd(22) + "declarado",
  );
  console.log("-".repeat(88));
  for (const f of filas) {
    console.log(
      f.arte.padEnd(28) +
        String(f.oscuro).padStart(8) +
        String(f.claro).padStart(8) +
        "  " +
        f.veredicto.padEnd(20) +
        f.declarado +
        (f.coincide ? "" : "   <-- NO COINCIDE"),
    );
  }

  const discrepan = filas.filter((f) => !f.coincide);
  if (discrepan.length > 0) {
    console.error(
      `\n${discrepan.length} arte(s) no coinciden con lo declarado en src/lib/theme/arte.ts:`,
    );
    for (const f of discrepan) {
      console.error(`  ${f.arte}: medido "${f.veredicto}", declarado "${f.declarado}"`);
    }
    console.error(
      "\nLa tabla de `arte.ts` es la que gobierna la asignacion a plantillas.\n" +
        "Si miente, se asigna un arte a un pack cuyo texto no se lee encima.",
    );
    process.exit(1);
  }

  const sinSalida = filas.filter((f) => f.veredicto.startsWith("NINGUNO"));
  if (sinSalida.length > 0) {
    console.error(`\n${sinSalida.length} arte(s) no admiten texto legible en ninguna polaridad:`);
    for (const f of sinSalida) console.error(`  ${f.arte}`);
    console.error(
      "\nOpciones: subir el contraste del arte en la banda central, o poner un\n" +
        "velo detras del texto. Un arte bonito que no se puede leer no sirve.",
    );
    process.exit(1);
  }
  console.log("\nTodas admiten texto legible en al menos una polaridad.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
