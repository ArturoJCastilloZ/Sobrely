import { describe, expect, it } from "vitest";

import { PALETAS, aplicarPaleta, limpiarPaleta, paletaDe } from "@/lib/templates/paletas";
import { contrastRatio } from "@/lib/theme/contrast";
import { themeSchema } from "@/lib/theme/theme";

describe("paletas", () => {
  it("claves únicas y colores hexadecimales válidos para el esquema del tema", () => {
    expect(new Set(PALETAS.map((p) => p.clave)).size).toBe(PALETAS.length);
    for (const p of PALETAS) {
      const r = themeSchema.safeParse({
        colors: { primary: p.primary, secondary: p.secondary, background: p.background, text: p.text },
        mode: p.mode,
      });
      expect(r.success, p.clave).toBe(true);
    }
  });

  it("el texto se lee sobre el fondo de cada paleta (AA, 4.5:1)", () => {
    for (const p of PALETAS) {
      expect(contrastRatio(p.text, p.background), p.clave).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("limpia lo que llega del navegador", () => {
    expect(limpiarPaleta("salvia")).toBe("salvia");
    expect(limpiarPaleta("#ff0000")).toBe("");
    expect(limpiarPaleta(undefined)).toBe("");
    expect(paletaDe("__proto__")).toBeNull();
  });

  it("aplicar cambia colores y modo y deja el resto del tema intacto", () => {
    const tema = { font: "serif", colors: { primary: "#000000", extra: "x" }, stickers: [1], backgroundImage: { url: "/arte/x.svg", overlay: 0 } };
    const r = aplicarPaleta(tema, "noche") as unknown as {
      mode: string;
      colors: { background: string };
      font: string;
      stickers: number[];
    };
    expect(r.mode).toBe("dark");
    expect(r.colors.background).toBe("#14203a");
    expect(r.font).toBe("serif");
    expect(r.stickers).toEqual([1]);
    expect((r as unknown as { backgroundImage: { url: string } }).backgroundImage.url).toBe("");
    expect(aplicarPaleta(tema, "")).toBe(tema);
  });
});
