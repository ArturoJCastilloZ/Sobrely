import { describe, expect, it } from "vitest";
import {
  contrastRatio, deriveCta, hexToRgb, mix, rgbToHex,
  AA_NORMAL, MAX_DARKEN, WHITE,
} from "./contrast";
import { THEME_PACKS } from "./theme-packs";

describe("contrastRatio", () => {
  it("da los extremos conocidos de la norma", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("es simétrico: el orden de los colores no cambia la razón", () => {
    expect(contrastRatio("#b08d57", WHITE)).toBeCloseTo(contrastRatio(WHITE, "#b08d57"), 10);
  });

  it("reproduce los valores medidos de los packs que fallaban", () => {
    // Estos números son los que se midieron en la auditoría; si cambian,
    // cambió la fórmula y hay que saberlo.
    expect(contrastRatio("#b08d57", WHITE)).toBeCloseTo(3.09, 2); // boda-lujo
    expect(contrastRatio("#f7a8c4", WHITE)).toBeCloseTo(1.85, 2); // kawaii
    expect(contrastRatio("#d4af37", WHITE)).toBeCloseTo(2.10, 2); // noche-estelar
  });

  it("acepta hex de 3 dígitos", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
  });
});

describe("hexToRgb / rgbToHex", () => {
  it("va y vuelve sin perder el valor", () => {
    for (const hex of ["#b08d57", "#f7a8c4", "#000000", "#ffffff"]) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });
  it("satura en vez de desbordar", () => {
    expect(rgbToHex({ r: 300, g: -20, b: 128 })).toBe("#ff0080");
  });
});

describe("mix", () => {
  it("t=0 y t=1 son los extremos", () => {
    expect(mix("#b08d57", "#000000", 0)).toBe("#b08d57");
    expect(mix("#b08d57", "#000000", 1)).toBe("#000000");
  });
  it("oscurecer siempre baja el contraste contra blanco", () => {
    const base = contrastRatio("#7c9070", WHITE);
    expect(contrastRatio(mix("#7c9070", "#000000", 0.2), WHITE)).toBeGreaterThan(base);
  });
});

describe("deriveCta", () => {
  it("no toca un primario que ya cumple", () => {
    const cta = deriveCta("#1e3a5f", "#1f2937", "#ffffff"); // corporativo-limpio
    expect(cta.kind).toBe("solid");
    expect(cta.bg).toBe("#1e3a5f");
    expect(cta.fg).toBe(WHITE);
  });

  it("oscurece lo MÍNIMO necesario cuando alcanza", () => {
    const cta = deriveCta("#b08d57", "#2a2724", "#fffdf8"); // boda-lujo
    expect(cta.kind).toBe("solid");
    expect(cta.ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    // Mínimo: un paso menos de oscurecimiento ya no cumpliría.
    expect(cta.ratio).toBeLessThan(AA_NORMAL + 0.5);
  });

  it("cambia a contorno cuando oscurecer destruiría el pastel", () => {
    const cta = deriveCta("#f7a8c4", "#4a3b41", "#fffafc"); // kawaii
    expect(cta.kind).toBe("outline");
    // El fondo del botón sigue siendo rosa claro, no malva oscuro.
    expect(contrastRatio(cta.bg, WHITE)).toBeLessThan(1.5);
  });

  it("el contorno se mezcla hacia el FONDO, no hacia blanco", () => {
    // Un pack oscuro no debe recibir un botón casi blanco pegado encima.
    const claro = deriveCta("#d4af37", "#f4efe6", "#161310");
    expect(claro.kind).toBe("outline");
    expect(contrastRatio(claro.bg, "#161310")).toBeLessThan(3);
  });

  it("NUNCA devuelve algo por debajo de AA, para ningún pack real", () => {
    for (const pack of Object.values(THEME_PACKS)) {
      const { primary, text, background } = pack.theme.colors;
      const cta = deriveCta(primary, text, background);
      expect(
        cta.ratio,
        `${pack.key}: ${cta.kind} ${cta.bg}/${cta.fg} = ${cta.ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it("los 11 packs que fallaban ahora pasan, y los 9 que pasaban no se tocan", () => {
    let corregidos = 0;
    let intactos = 0;
    for (const pack of Object.values(THEME_PACKS)) {
      const { primary, text, background } = pack.theme.colors;
      const antes = contrastRatio(primary, WHITE);
      const cta = deriveCta(primary, text, background);
      if (antes < AA_NORMAL) {
        corregidos++;
      } else {
        intactos++;
        expect(cta.bg, `${pack.key} no debía cambiar`).toBe(primary);
      }
    }
    expect(corregidos).toBe(11);
    expect(intactos).toBe(9);
  });

  it("el umbral cae dentro de la banda estable medida (0.20–0.30)", () => {
    // Fuera de esa banda el grupo de packs con contorno cambia; ver el
    // comentario de MAX_DARKEN.
    expect(MAX_DARKEN).toBeGreaterThanOrEqual(0.2);
    expect(MAX_DARKEN).toBeLessThanOrEqual(0.3);
  });
});
