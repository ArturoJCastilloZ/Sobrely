import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIPPING_REVEAL_PRESETS, CSS_REVEAL_PRESETS } from "./registry";

/**
 * Contrato entre el CSS y el observador.
 *
 * Un preset que oculta recortando la caja con `clip-path` deja su area de
 * interseccion en CERO, y Chrome descuenta ese recorte: un IntersectionObserver
 * con umbral > 0 no lo ve entrar en pantalla JAMAS y el revelado queda en
 * abrazo mortal (el elemento se esconde de quien tenia que descubrirlo).
 *
 * Medido el 2026-09-09 en una invitacion publicada: 9 de 11 modulos atascados
 * para siempre; los 2 que si revelaban eran los VACIOS, de altura 0.
 *
 * Por eso la fuente de verdad de esta prueba es el CSS, no una lista escrita a
 * mano: si alguien agrega un preset que recorta y no lo registra, el observador
 * lo mirara con umbral 0.15 y volvera el bug. La prueba lo caza.
 */

const CSS = readFileSync(
  join(process.cwd(), "src/app/animations.css"),
  "utf8",
);

/** Presets cuyo estado `:not(.is-revealed)` declara un `clip-path`. */
function presetsQueRecortanSegunElCss(): Set<string> {
  const encontrados = new Set<string>();
  // Bloques `.anim--<preset>:not(.is-revealed) { ... }` con clip-path dentro.
  const re =
    /\.anim--([a-z-]+):not\(\.is-revealed\)\s*(?:,\s*\.anim--[a-z-]+:not\(\.is-revealed\)\s*)*\{([^}]*)\}/g;
  for (const m of CSS.matchAll(re)) {
    if (/clip-path\s*:/.test(m[2])) encontrados.add(m[1]);
  }
  return encontrados;
}

describe("presets que ocultan recortando", () => {
  it("el CSS declara al menos uno (si no, la prueba no estaria midiendo nada)", () => {
    expect(presetsQueRecortanSegunElCss().size).toBeGreaterThan(0);
  });

  it("todo preset que recorta en el CSS esta registrado como tal", () => {
    const enElCss = [...presetsQueRecortanSegunElCss()].sort();
    const registrados = [...CLIPPING_REVEAL_PRESETS].sort();
    expect(enElCss).toEqual(registrados);
  });

  it("no registra presets que el CSS no recorta", () => {
    const enElCss = presetsQueRecortanSegunElCss();
    for (const p of CLIPPING_REVEAL_PRESETS) {
      expect(enElCss.has(p)).toBe(true);
    }
  });

  it("todos son presets de revelado por CSS", () => {
    for (const p of CLIPPING_REVEAL_PRESETS) {
      expect(CSS_REVEAL_PRESETS.has(p)).toBe(true);
    }
  });
});
