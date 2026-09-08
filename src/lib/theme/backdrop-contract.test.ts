import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Contrato del telón de fondo de la invitación.
 *
 * El fondo de imagen es una capa `sticky` que se queda quieta mientras el
 * contenido pasa. Un `sticky` solo se mueve si NINGÚN ancestro es contenedor
 * de scroll, y `overflow-x: hidden` / `overflow: hidden` lo vuelven uno.
 *
 * Medido en navegador con control positivo (viewport 1200x800, scroll de 1500):
 *
 *  | scope                  | top del sticky | |
 *  |------------------------|----------------|---------|
 *  | sin overflow (control) | 0              | funciona|
 *  | overflow-x: hidden     | -1500          | ROTO    |
 *  | overflow: hidden       | -1500          | ROTO    |
 *  | overflow-x: clip       | 0              | funciona|
 *
 * `clip` recorta idéntico (mismo scrollWidth/clientWidth, cero scroll
 * horizontal en la página) sin crear el contenedor de scroll.
 *
 * Por qué el guard es mecánico y no estilístico: medido, tailwind-merge pone
 * `overflow-x-clip` y `overflow-hidden` en el MISMO grupo, así que
 * `cn("overflow-x-clip", "overflow-hidden")` colapsa a `overflow-hidden` — un
 * caller no compite con el clip del scope, lo BORRA. Y moverlo a un `style`
 * inline tampoco salva: el `overflow-hidden` del caller seguiría poniendo
 * `overflow-y: hidden`, que vuelve el nodo contenedor de scroll igual.
 *
 * Estas pruebas leen los ARCHIVOS REALES y no una copia. El modo de fallo que
 * atajan es que alguien ponga `overflow-hidden` por costumbre: compila, pasa
 * todo lo demás, y el fondo se rompe en silencio en las 12 invitaciones
 * publicadas. No hay forma de cazarlo con una prueba de lógica pura porque el
 * defecto es puramente de composición CSS.
 */
const leer = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), "utf8");

const scope = leer("../../components/theme/theme-scope.tsx");

/** Quita los comentarios para no leer una clase citada en la explicación. */
function sinComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const CLIP_ROTO = /overflow-(x-|y-)?hidden/;

/**
 * Todos los archivos que renderizan <ThemeScope>, descubiertos barriendo el
 * árbol en vez de listados a mano: una lista escrita a mano se queda vieja en
 * cuanto alguien añade un consumidor, y ese consumidor es justo quien puede
 * romper el telón.
 */
function callersDeThemeScope(): string[] {
  const raiz = fileURLToPath(new URL("../..", import.meta.url));
  const out: string[] = [];
  const anda = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) anda(p);
      else if (e.name.endsWith(".tsx") && /<ThemeScope[\s>]/.test(readFileSync(p, "utf8")))
        out.push(p);
    }
  };
  anda(raiz);
  return out;
}

const CALLERS = callersDeThemeScope();

/** Las etiquetas de apertura `<ThemeScope ...>` de un archivo. */
function etiquetasThemeScope(src: string): string[] {
  return [...sinComentarios(src).matchAll(/<ThemeScope\b[^>]*>/g)].map(
    (m) => m[0],
  );
}

/**
 * Las dos rutas de render VIVAS del telón. Aquí sí se revisa el archivo
 * entero, porque su estructura se conoce y el ancestro que recorta también
 * rompe el sticky — en `preview-pane` el clip estaba en el marco redondeado,
 * un nivel ARRIBA del scope, y era igual de fatal.
 *
 * En el resto de los callers solo se revisa la etiqueta: un grep por archivo
 * no distingue un ancestro de un `div` vecino sin relación, y un guard que
 * grita sin razón acaba borrado.
 */
const RUTAS_VIVAS = [
  ["public/public-invitation.tsx", leer("../../components/public/public-invitation.tsx")],
  ["editor/preview-pane.tsx", leer("../../components/editor/preview-pane.tsx")],
] as const;

describe("telón de fondo — el sticky no admite ancestros que recorten", () => {
  it("el barrido encuentra callers (no puede pasar en vacío)", () => {
    // Sin esto, un barrido que no encontrara nada dejaría verde el guard por
    // no tener qué mirar — la sonda mediría la señal equivocada.
    expect(CALLERS.length).toBeGreaterThanOrEqual(3);
    expect(CALLERS.flatMap((p) => etiquetasThemeScope(readFileSync(p, "utf8"))).length)
      .toBeGreaterThanOrEqual(3);
  });

  it("ninguna etiqueta <ThemeScope> recibe overflow-hidden", () => {
    for (const p of CALLERS) {
      for (const tag of etiquetasThemeScope(readFileSync(p, "utf8"))) {
        expect(
          tag,
          `${p.split("/src/")[1]} le pasa overflow-hidden a ThemeScope. ` +
            `tailwind-merge lo pone en el MISMO grupo que overflow-x-clip, así ` +
            `que no compite con el clip del scope: lo BORRA. El nodo se vuelve ` +
            `contenedor de scroll y el telón sticky deja de quedarse quieto. ` +
            `Usa overflow-clip.`,
        ).not.toMatch(CLIP_ROTO);
      }
    }
  });

  it("las rutas vivas no recortan con hidden en ningún nivel", () => {
    for (const [nombre, src] of RUTAS_VIVAS) {
      expect(
        sinComentarios(src),
        `${nombre} usa overflow-hidden. En el camino del telón también un ` +
          `ANCESTRO que recorte rompe el sticky. Usa overflow-clip.`,
      ).not.toMatch(CLIP_ROTO);
    }
  });

  it("el scope trae el clip horizontal y no recorta con hidden", () => {
    expect(sinComentarios(scope)).toMatch(/overflow-x-clip/);
    expect(sinComentarios(scope)).not.toMatch(CLIP_ROTO);
  });

  it("el telón no ocupa alto en el flujo, en sus DOS variantes", () => {
    // `h-0`: las capas van absolutas dentro, así que el telón no empuja el
    // contenido hacia abajo (medido: alto del wrapper = 0). Vale para las dos
    // variantes — si una de ellas dejara de ser `h-0`, empujaría la invitación
    // hacia abajo justo en el sitio donde nadie lo esperaría.
    const s = sinComentarios(scope);
    expect(s).toMatch(/pointer-events-none top-0 z-0/);
    // Ninguna ocupa flujo, por razones distintas: la sticky por `h-0` con las
    // capas absolutas dentro, la anclada por ser `absolute`. Se afirman las
    // dos juntas para que cambiar una obligue a pensar en la otra.
    expect(s).toMatch(/backdropSticky\s*\?\s*"sticky h-0"\s*:\s*"absolute inset-0"/);
  });

  it("por DEFECTO el telón es sticky (lo que quiere la página pública)", () => {
    // La variante anclada existe solo por el `transform` del zoom del editor.
    // Si el default se invirtiera, las invitaciones publicadas perderían el
    // telón en silencio: seguirían pintando el fondo, pero quieto arriba.
    expect(sinComentarios(scope)).toMatch(/backdropSticky\s*=\s*true/);
  });

  it("el telón NO usa background-attachment: fixed", () => {
    // Se rompe en Safari iOS y el scroll del editor ocurre en un contenedor.
    expect(sinComentarios(scope)).not.toMatch(/bg-fixed|background-attachment/);
  });

  it("el alto del telón es el del scrollport, no el del documento", () => {
    // El bug original: `absolute inset-0` + `bg-cover` estiraba la imagen
    // sobre TODA la altura (medido: 4800px de documento contra 700px de
    // viewport, 6.9x de estirón).
    expect(sinComentarios(scope)).toMatch(/backdropHeight/);
    expect(sinComentarios(scope)).toMatch(/100svh/);
    expect(sinComentarios(scope)).not.toMatch(/inset-0\s+bg-cover/);
  });
});
