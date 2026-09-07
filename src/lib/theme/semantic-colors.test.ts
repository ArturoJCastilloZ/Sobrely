import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { contrastRatio, AA_NORMAL } from "./contrast";

/**
 * Los tokens semánticos del chrome se leen del CSS, no de una copia en TS.
 *
 * La copia es el modo clásico de que esto mienta: alguien cambia el hex en
 * `globals.css`, la prueba sigue verde contra el valor viejo, y el color
 * ilegible llega a producción con un test que decía que estaba bien.
 */
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

function bloque(selector: string): Record<string, string> {
  // Toma el ÚLTIMO bloque que coincide: en este archivo `:root` aparece dos
  // veces y los tokens semánticos viven en el segundo.
  const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, "g");
  const matches = [...css.matchAll(re)];
  const cuerpo = matches.map((m) => m[1]).join("\n");
  const out: Record<string, string> = {};
  for (const m of cuerpo.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

const claro = bloque(":root");
const oscuro = bloque("\\.dark");

const PARES = [
  ["success", "success-fg"],
  ["warning", "warning-fg"],
  ["info", "info-fg"],
] as const;

describe("tokens semánticos del chrome", () => {
  it("existen los 9 en claro y en oscuro", () => {
    for (const base of ["success", "warning", "info"]) {
      for (const suf of ["", "-fg", "-surface"]) {
        expect(claro[base + suf], `falta --${base}${suf} en :root`).toBeTruthy();
        expect(oscuro[base + suf], `falta --${base}${suf} en .dark`).toBeTruthy();
      }
    }
  });

  it("son hex, para poder medirlos", () => {
    for (const base of ["success", "warning", "info"]) {
      for (const suf of ["", "-fg", "-surface"]) {
        expect(claro[base + suf]).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(oscuro[base + suf]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("cada par color/texto pasa AA en MODO CLARO", () => {
    for (const [bg, fg] of PARES) {
      const r = contrastRatio(claro[bg], claro[fg]);
      expect(r, `${bg}/${fg} claro = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it("cada par color/texto pasa AA en MODO OSCURO", () => {
    for (const [bg, fg] of PARES) {
      const r = contrastRatio(oscuro[bg], oscuro[fg]);
      expect(r, `${bg}/${fg} oscuro = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it("el color sólido es legible como TEXTO sobre su propia superficie", () => {
    // El caso real: "Guardado" en verde sobre un chip verde claro.
    for (const [base] of PARES) {
      const rClaro = contrastRatio(claro[base], claro[`${base}-surface`]);
      expect(rClaro, `${base} sobre su surface, claro = ${rClaro.toFixed(2)}`)
        .toBeGreaterThanOrEqual(AA_NORMAL);
      const rOscuro = contrastRatio(oscuro[base], oscuro[`${base}-surface`]);
      expect(rOscuro, `${base} sobre su surface, oscuro = ${rOscuro.toFixed(2)}`)
        .toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it("el color sólido es legible sobre el fondo de la app", () => {
    for (const [base] of PARES) {
      expect(contrastRatio(claro[base], "#ffffff")).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });
});
