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
 * La ventana que se muestrea es la CAJA DEL TEXTO MEDIDA (ver `VENTANA`), no
 * una "banda central" elegida a ojo. La diferencia no es cosmetica: la version
 * anterior no muestreaba las franjas laterales, y de ahi salio la regla falsa
 * de que poner arte en los laterales "no cuesta contraste".
 */
import { chromium, type Browser } from "playwright-core";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ARTE } from "../src/lib/theme/arte.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_ARTE = join(RAIZ, "public", "arte");
const DIR_FOTO = join(DIR_ARTE, "foto");

/**
 * Las piezas a medir: los SVG dibujados y las FOTOS auto-hospedadas de Pexels.
 * Se miden igual y con el mismo umbral. Una foto tiene mucho mas rango de
 * luminancia, asi que es donde el "peor pixel" muerde de verdad: un fondo
 * fotografico casi nunca admite texto sin un velo detras.
 */
function fuentes(): { nombre: string; dataUri: string }[] {
  const out: { nombre: string; dataUri: string }[] = [];
  for (const f of readdirSync(DIR_ARTE).filter((x) => x.endsWith(".svg")).sort()) {
    const svg = readFileSync(join(DIR_ARTE, f), "utf8");
    out.push({
      nombre: f,
      dataUri: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    });
  }
  if (existsSync(DIR_FOTO)) {
    for (const f of readdirSync(DIR_FOTO).filter((x) => /\.jpe?g$/i.test(x)).sort()) {
      const b64 = readFileSync(join(DIR_FOTO, f)).toString("base64");
      out.push({ nombre: "foto/" + f, dataUri: "data:image/jpeg;base64," + b64 });
    }
  }
  return out;
}

/** Umbral WCAG AA para texto normal. El mismo que usa `contrast.ts`. */
const AA_NORMAL = 4.5;

/**
 * La ventana que se muestrea, en coordenadas del lienzo de 420x900.
 *
 * MEDIDA, no supuesta (2026-09-09, 3.a sesion). Antes era
 * `y 135..765, x 63..357` —la "banda central", elegida a ojo— y eso tuvo una
 * consecuencia que no se vio en tres sesiones: la franja lateral quedaba FUERA
 * del muestreo, asi que poner arte ahi "no costaba contraste". No era gratis:
 * era INVISIBLE PARA EL INSTRUMENTO. Con esa licencia se compusieron 46 piezas
 * con el mismo esquema de banda lateral espejada, y cuatro de ellas escondian
 * un fallo real de contraste (la peor, 3.11 sobre un piso de 4.5).
 *
 * Estos numeros salen de `scripts/medir-cajas-de-texto.mts`, que proyecta las
 * cajas de texto del render al lienzo deshaciendo el `background-size: cover`.
 * Union sobre las 65 plantillas y las TRES superficies de la escala:
 *
 *   tarjeta 420x560   texto y 218..730  x 24..396
 *   pagina  375x812   texto y  53..900  x 29..391
 *   pagina 1200x900   texto y 321..608  x 17..403
 *   UNION             texto y  53..900  x 17..403   <- esto es lo que se mide
 *
 * Es conservadora a proposito: la caja de un elemento de BLOQUE ocupa el ancho
 * del contenedor aunque sus glifos no, asi que la ventana cubre zona sin tinta.
 * Preferimos exigir de mas que volver a dejar un borde sin cobrar.
 */
const VENTANA = { y0: 53, y1: 900, x0: 17, x1: 403 } as const;

/**
 * Los dos extremos de texto que un pack puede traer. Si un arte no aguanta
 * NINGUNO de los dos, no es utilizable sin un velo detrás del texto.
 */
const TEXTOS = {
  oscuro: [31, 41, 55] as const,
  claro: [248, 250, 252] as const,
};

/**
 * El color con el que se vela el fondo. Es `theme.colors.background` del pack,
 * y va emparejado con la polaridad: un pack de texto oscuro tiene fondo claro,
 * y al contrario. Se toman valores representativos porque el velo se calcula
 * ANTES de saber a qué pack exacto ira el arte.
 */
const VELOS = {
  oscuro: [250, 247, 242] as const,
  claro: [26, 21, 32] as const,
};

/** Compone `velo` sobre `pixel` con opacidad alfa. */
function componer(pixel: readonly number[], velo: readonly number[], alfa: number): number[] {
  return [0, 1, 2].map((i) => alfa * velo[i] + (1 - alfa) * pixel[i]);
}

/**
 * El velo MÍNIMO que hace legible el peor pixel, o null si ni al 95% alcanza.
 *
 * Devolver el minimo y no un valor fijo es lo que evita las dos formas de
 * equivocarse: un velo corto deja texto ilegible, y uno largo borra la foto que
 * acabamos de traer. Es el mismo criterio con el que la Fase 0 eligio el umbral
 * de oscurecimiento del CTA: lo decidio la medicion, no el gusto.
 */
function veloMinimo(
  muestras: number[][],
  texto: readonly number[],
  velo: readonly number[],
): number | null {
  for (let alfa = 0; alfa <= 0.95; alfa += 0.05) {
    const peor = Math.min(
      ...muestras.map((p) => contraste(texto, componer(p, velo, alfa))),
    );
    if (peor >= AA_NORMAL) return +alfa.toFixed(2);
  }
  return null;
}

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
  const piezas = fuentes();
  if (piezas.length === 0) throw new Error(`No hay arte en ${DIR_ARTE}`);

  let browser: Browser | undefined;
  const filas: {
    arte: string;
    oscuro: number;
    claro: number;
    veredicto: string;
    declarado: string;
    coincide: boolean;
    overlayDeclarado: number | null;
    veloNecesario: number | null;
    overlayCorto: boolean;
  }[] = [];

  try {
    browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage();

    for (const pieza of piezas) {
      const svg = pieza.nombre;
      const muestras: number[][] = await page.evaluate(async ({ uri, v }) => {
        const img = new Image();
        // Data URI para no depender de un servidor: tiene que poder correr sin
        // `pnpm dev` levantado. Sirve igual para SVG y para JPEG.
        img.src = uri;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = 420;
        c.height = 900;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 420, 900);
        // La ventana MEDIDA de la caja del texto, ver `VENTANA`. Cubre las
        // franjas laterales a proposito: es donde estaba el agujero.
        const out: number[][] = [];
        for (let y = v.y0; y < v.y1; y += 12) {
          for (let x = v.x0; x < v.x1; x += 12) {
            const d = ctx.getImageData(x, y, 1, 1).data;
            out.push([d[0], d[1], d[2]]);
          }
        }
        return out;
      }, { uri: pieza.dataUri, v: VENTANA });

      if (muestras.length < 100) {
        throw new Error(`SONDA INVALIDA en ${svg}: ${muestras.length} muestras`);
      }

      // El PEOR pixel, no el promedio.
      const oscuro = Math.min(...muestras.map((p) => contraste(TEXTOS.oscuro, p)));
      const claro = Math.min(...muestras.map((p) => contraste(TEXTOS.claro, p)));
      // Si el arte no aguanta desnudo, se calcula CUANTO velo hace falta en
      // vez de dejarlo en "no sirve": el velo es `backgroundImage.overlay`,
      // que ya existe en el esquema.
      const veloOscuro = oscuro >= AA_NORMAL ? 0 : veloMinimo(muestras, TEXTOS.oscuro, VELOS.oscuro);
      const veloClaro = claro >= AA_NORMAL ? 0 : veloMinimo(muestras, TEXTOS.claro, VELOS.claro);

      const veredicto =
        oscuro >= AA_NORMAL
          ? claro >= AA_NORMAL
            ? "ambos"
            : "solo texto OSCURO"
          : claro >= AA_NORMAL
            ? "solo texto CLARO"
            : veloOscuro !== null || veloClaro !== null
              ? `velo ${veloOscuro !== null ? `oscuro ${veloOscuro}` : ""}${veloOscuro !== null && veloClaro !== null ? " / " : ""}${veloClaro !== null ? `claro ${veloClaro}` : ""}`
              : "NINGUNO - ni con velo";

      // Se COMPARA con lo declarado en el registro. Sin esto la tabla de
      // `arte.ts` podria decir "oscuro" mientras el SVG solo admite claro, y
      // la asignacion quedaria mal fundada sin que nada avisara.
      const clave = svg.replace(/^foto\//, "").replace(/\.(svg|jpe?g)$/i, "");
      const declarado = ARTE.find((a) => a.clave === clave);
      const medido: string =
        oscuro >= AA_NORMAL
          ? claro >= AA_NORMAL
            ? "ambos"
            : "oscuro"
          : claro >= AA_NORMAL
            ? "claro"
            : // Con velo, la polaridad la decide cual de los dos velos es
              // viable y menor. Es como una FOTO llega a ser utilizable.
              //
              // EMPATE: si las dos polaridades son viables y sus velos estan a
              // un paso de distancia (el paso del barrido es 0.05), la pieza
              // admite las dos y elegir "la menor" es ruido de cuantizacion.
              // En ese caso gana la DECLARADA. Salio al ensanchar la ventana:
              // `xv-pastel-quince` medi­a 0.6 oscuro contra 0.55 claro y el
              // gate acusaba de mentir a una tabla que no mentia.
              veloOscuro !== null &&
                veloClaro !== null &&
                Math.abs(veloOscuro - veloClaro) <= 0.05 + 1e-9 &&
                (declarado?.polaridad === "oscuro" || declarado?.polaridad === "claro")
              ? declarado.polaridad
              : veloOscuro !== null && (veloClaro === null || veloOscuro <= veloClaro)
                ? "oscuro"
                : veloClaro !== null
                  ? "claro"
                  : "ninguno";

      // El `overlay` declarado tiene que ALCANZAR el velo minimo medido. Si se
      // queda corto, el texto no llega a AA sobre esa foto y la asignacion
      // quedaria mal fundada sin que nada avisara — es el mismo agujero que el
      // cruce de polaridad tapa, un nivel mas fino.
      const veloNecesario = declarado?.polaridad === "claro" ? veloClaro : veloOscuro;
      const overlayCorto =
        declarado != null &&
        veloNecesario != null &&
        veloNecesario > 0 &&
        declarado.overlay + 1e-9 < veloNecesario;

      filas.push({
        arte: svg,
        oscuro: +oscuro.toFixed(2),
        claro: +claro.toFixed(2),
        veredicto,
        declarado: declarado ? declarado.polaridad : "SIN DECLARAR",
        coincide: declarado ? declarado.polaridad === medido && !overlayCorto : false,
        overlayDeclarado: declarado?.overlay ?? null,
        veloNecesario: veloNecesario ?? null,
        overlayCorto,
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
      if (f.overlayCorto) {
        console.error(
          `  ${f.arte}: el overlay declarado (${f.overlayDeclarado}) NO alcanza ` +
            `el velo minimo medido (${f.veloNecesario}) para texto ${f.declarado}`,
        );
      } else {
        console.error(`  ${f.arte}: medido "${f.veredicto}", declarado "${f.declarado}"`);
      }
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
