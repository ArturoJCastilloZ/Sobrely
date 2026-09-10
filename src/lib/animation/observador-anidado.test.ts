import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CLIPPING_REVEAL_PRESETS } from "./registry";

/**
 * U-3 — el observador ANIDADO bajo un módulo que se oculta RECORTANDO.
 *
 * Un módulo con un preset que oculta con `clip-path: inset(0 0 100%)` deja el
 * área de intersección de todo lo que lleva dentro en CERO: Chrome descuenta el
 * recorte del ancestro al calcular la del descendiente. Así que un
 * `IntersectionObserver` anidado no ve nada mientras la cortina está cerrada, y
 * cuando abre, un scroll de verdad ya se llevó el grupo fuera de pantalla.
 *
 * MEDIDO en `invitacion-44yg9w` (preset `curtain-reveal`), pestaña visible y
 * `requestAnimationFrame` vivo, contando `.anim-stagger-item:not(.is-revealed)`
 * con un fling CONTINUO por `requestAnimationFrame` de ~3000 px/s:
 *
 *     antes del arreglo   módulo revelado, clip `inset(0px)`   6 de 6 sin revelar
 *     después             mismas condiciones                   0 de 6
 *
 * Lo que NO era la causa, y se descartó midiendo: bajar el umbral del
 * observador anidado a 0. Se probó y no movió la medición ni un item, porque
 * con área cero no hay umbral que valga. Se revirtió.
 *
 * Universo del disparador, contado contra la base el 2026-09-10: **0 de 65
 * plantillas** traen preset (todas caen en `soft-reveal`, que no recorta) y
 * **2 de 18 invitaciones** usan `curtain-reveal` — las dos publicadas.
 * `image-clip` no lo usa nadie todavía.
 */

function fuente(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

const STAGGER = fuente("../../components/animation/stagger-group.tsx");
const MODULO = fuente("../../components/animation/animated-module.tsx");
const CONTEXTO = fuente("../../components/animation/reveal-del-ancestro.tsx");

describe("el módulo PUBLICA su revelado a lo que lleva dentro", () => {
  it("envuelve a sus hijos en el proveedor, con el valor VIVO", () => {
    expect(MODULO).toContain("RevealDelAncestro.Provider");
    // Un `value={true}` fijo en la rama animada revelaría el contenido antes de
    // que la cortina abra.
    expect(MODULO).toContain("RevealDelAncestro.Provider value={revealed && recorta}");
  });

  it("y SOLO cuando el preset recorta", () => {
    // Ésta es la acotación que evita cambiar la conducta de los otros
    // diecisiete presets para arreglar dos: un preset que se oculta con
    // opacidad no tiene el defecto, y su descendiente debe seguir esperando su
    // propio turno para que la animación se vea cuando la miran.
    expect(MODULO).toMatch(/const recorta\s*=\s*CLIPPING_REVEAL_PRESETS\.has\(/);
    // OJO: `indexOf` a secas coge el PRIMER proveedor, que es el de la rama sin
    // animación (`value={true}`). Hay que anclar al de la rama animada, que es
    // el que lleva `revealed`. Me falló al escribirla.
    const i = MODULO.indexOf("RevealDelAncestro.Provider value={revealed");
    expect(i, "no se encontró el proveedor de la rama animada").toBeGreaterThan(-1);
    const valor = MODULO.slice(i, MODULO.indexOf(">", i));
    expect(valor).toContain("recorta");
  });

  it("y publica `true` cuando NO hay animación", () => {
    // Sin animación el contenido está visible desde el primer render, así que un
    // grupo escalonado dentro no tiene nada que esperar. Si aquí se publicara
    // `false`, los grupos quedarían a merced de su propio observador con la
    // animación apagada — justo el caso de `prefers-reduced-motion`.
    const i = MODULO.indexOf("if (!active)");
    expect(i).toBeGreaterThan(-1);
    const rama = MODULO.slice(i, MODULO.indexOf("}", MODULO.indexOf("return", i) + 200));
    expect(rama).toContain("RevealDelAncestro.Provider value={true}");
  });
});

describe("el grupo escalonado HEREDA el revelado del ancestro", () => {
  it("combina su observador con el del ancestro", () => {
    expect(STAGGER).toContain("useRevealDelAncestro");
    // La disyunción es lo que arregla el defecto: con sólo su observador no ve
    // nada, y con sólo el del ancestro perdería el caso de un grupo que no
    // vive dentro de un módulo animado.
    expect(STAGGER).toMatch(/const revealed\s*=\s*propio\s*\|\|\s*ancestro/);
  });

  it("sigue teniendo su propio observador", () => {
    expect(STAGGER).toMatch(/const propio\s*=\s*useReveal\(/);
  });
});

describe("el contexto no cambia la conducta de quien no lo tiene", () => {
  it("su valor por defecto es false", () => {
    // Sin proveedor —el catálogo de animaciones monta grupos fuera de un módulo
    // animado— cada grupo debe seguir decidiendo con su propio observador.
    expect(CONTEXTO).toMatch(/createContext\(false\)/);
  });
});

describe("lo que ya estaba bien y no se toca", () => {
  it("`AnimatedModule` sigue decidiendo su umbral por el registro de presets", () => {
    // La forma cambió al extraer `recorta` a una constante; el invariante es el
    // mismo: quien decide el umbral es el registro, no un literal.
    expect(MODULO).toMatch(/const recorta\s*=\s*CLIPPING_REVEAL_PRESETS\.has\(/);
    expect(MODULO).toMatch(/threshold:\s*recorta\s*\?\s*0\s*:\s*0\.15/);
  });

  it("el registro de presets que recortan no está vacío", () => {
    // Guarda de no-vacuidad: si alguien lo vaciara, la aserción de arriba
    // seguiría pasando y el módulo observaría todo con 0.15.
    expect(CLIPPING_REVEAL_PRESETS.size).toBeGreaterThan(0);
    expect([...CLIPPING_REVEAL_PRESETS]).toContain("curtain-reveal");
  });

  it("el hook conserva el 0.15 por defecto", () => {
    // No se cambia el defecto global por un defecto que sólo afecta a dos
    // presets: movería la animación de todo el catálogo.
    expect(fuente("../../hooks/use-reveal.ts")).toMatch(/threshold\s*=\s*0\.15/);
  });
});
