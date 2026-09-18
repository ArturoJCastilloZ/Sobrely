import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * EL criterio de aceptación de la Fase 1, escrito como guarda.
 *
 *     Cambiar la selección no debe repintar ningún módulo del lienzo.
 *
 * Por qué hace falta vigilarlo, y no basta con haberlo hecho bien una vez: la
 * selección vivía en el MISMO componente que montaba el preview, así que un
 * clic en otra sección del riel repintaba la invitación entera —los doce
 * módulos con sus imágenes y sus animaciones— para cambiar un borde de 1 px en
 * una lista. Es un acoplamiento que se reintroduce sin querer con un solo
 * `useSeleccion()` puesto en el sitio equivocado, y no se nota hasta que la
 * Fase 2 mete arrastre encima y empieza a dar tirones.
 *
 * ⚠️ ESTO ES UN PROXY, y conviene decirlo: comprueba la ESTRUCTURA que hace
 * imposible el repintado, no el repintado en sí. El efecto real se midió en el
 * navegador con el perfilador de React. Un proxy estructural en CI + una
 * medición del efecto es la combinación deliberada; el repo no tiene entorno
 * DOM en la suite (`environment: "node"`, sin testing-library) y añadir dos
 * dependencias al repo de producción no compensaba para esto.
 *
 * Cómo lo comprueba: recorre el CIERRE TRANSITIVO de imports del lienzo, no un
 * archivo suelto. Así una pieza nueva que se cuele tres niveles más abajo y
 * llame a `useSeleccion()` también cae.
 */

const SRC = fileURLToPath(new URL("../../", import.meta.url));
const EXTS = [".tsx", ".ts"];

function resolver(desde: string, spec: string): string | null {
  // Solo interesa el código propio; `react`, `lucide-react` y demás no pueden
  // introducir un acoplamiento a la selección de este editor.
  let base: string;
  if (spec.startsWith("@/")) base = resolve(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(desde), spec);
  else return null;

  for (const e of EXTS) {
    if (existsSync(base + e)) return base + e;
  }
  for (const e of EXTS) {
    const idx = resolve(base, "index" + e);
    if (existsSync(idx)) return idx;
  }
  return null;
}

/** Todos los archivos propios alcanzables desde `entrada`, ella incluida. */
function cierreDeImports(entrada: string): Map<string, string> {
  const vistos = new Map<string, string>();
  const pila = [entrada];
  while (pila.length > 0) {
    const f = pila.pop()!;
    if (vistos.has(f)) continue;
    const src = readFileSync(f, "utf8");
    vistos.set(f, src);
    // `import ... from "x"` y `import "x"`, comillas simples o dobles.
    for (const m of src.matchAll(/from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g)) {
      const spec = m[1] ?? m[2];
      const destino = resolver(f, spec);
      if (destino) pila.push(destino);
    }
  }
  return vistos;
}

const CANVAS = resolve(SRC, "components/editor/shell/canvas-area.tsx");
const EDITOR = resolve(SRC, "components/editor/invitation-editor.tsx");
const LAYOUT = resolve(SRC, "components/editor/shell/editor-layout.tsx");
const REGISTRY = resolve(SRC, "components/modules/registry.tsx");
const PREVIEWS = resolve(SRC, "components/modules/previews.tsx");

const rel = (f: string) => f.slice(SRC.length);
/** Sin comentarios: una aserción no debe poder anclar en la prosa que explica. */
const limpiar = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("el lienzo NO está acoplado a la selección", () => {
  const cierre = cierreDeImports(CANVAS);

  it("el recorrido de imports encuentra de verdad el árbol del lienzo", () => {
    // Sin esto, un `resolver` roto haría pasar todo lo de abajo por vacío —
    // el modo exacto en que una prueba deja de defender sin ponerse roja.
    expect(cierre.size).toBeGreaterThan(10);
    const nombres = [...cierre.keys()].map(rel);
    expect(nombres).toContain("components/editor/preview-pane.tsx");
    expect(nombres).toContain("components/modules/registry.tsx");
    expect(nombres).toContain("components/modules/previews.tsx");
  });

  it("ni el lienzo ni NADA que importe llama a `useSeleccion()`", () => {
    const culpables = [...cierre.entries()]
      .filter(([, src]) => /\buseSeleccion\s*\(/.test(limpiar(src)))
      .map(([f]) => rel(f));
    expect(
      culpables,
      "estos archivos acoplan el lienzo a la selección y hacen que un clic en el riel repinte la invitación entera",
    ).toEqual([]);
  });

  it("el dueño del documento tampoco se suscribe a la selección", () => {
    // Si lo hiciera, repintaría al cambiar la selección y arrastraría el
    // lienzo con él: el desacople de abajo no serviría de nada.
    expect(limpiar(readFileSync(EDITOR, "utf8"))).not.toMatch(/\buseSeleccion\s*\(/);
  });

  it("`EditorLayout` no llama a ningún hook de contexto", () => {
    // Es lo que lo mantiene estático: si se suscribiera a algo, repintaría y
    // volvería a crear los elementos de sus hijos, incluido el lienzo.
    const src = limpiar(readFileSync(LAYOUT, "utf8"));
    const layout = src.slice(src.indexOf("export function EditorLayout"));
    expect(layout).not.toMatch(/\buse(Seleccion|Documento|Lienzo)\s*\(/);
  });
});

describe("la memoización del lienzo no es decorativa", () => {
  it("`ModulePreview` no reconstruye la config en cada render", () => {
    // `parseConfig` devuelve un objeto NUEVO siempre (zod). Llamarlo suelto en
    // el render hace que la prop `config` cambie de identidad cada vez y que
    // los `memo` de abajo fallen el 100% de las veces.
    const src = limpiar(readFileSync(REGISTRY, "utf8"));
    expect(src).toMatch(/useMemo\(\s*\(\)\s*=>\s*parseConfig\(/);
    expect(src).not.toMatch(/<Preview config=\{parseConfig\(/);
  });

  it("los doce previews se exportan memoizados", () => {
    const src = readFileSync(PREVIEWS, "utf8");
    const memos = src.match(/export const \w+Preview = React\.memo\(/g) ?? [];
    expect(memos).toHaveLength(12);
    // Y ninguno se exporta ademas sin memoizar, que dejaria una puerta trasera.
    expect(src).not.toMatch(/export function \w+Preview\b/);
  });
});
