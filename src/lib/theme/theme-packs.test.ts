import { describe, it, expect } from "vitest";

import {
  THEME_PACKS,
  THEME_PACK_LIST,
  applyThemePack,
  getThemePack,
  isThemePackPremium,
} from "@/lib/theme/theme-packs";
import { defaultTheme, parseTheme, themeSchema } from "@/lib/theme/theme";

const KEYS = Object.keys(THEME_PACKS);

describe("catálogo THEME_PACKS", () => {
  it("tiene packs y su key coincide con la del mapa", () => {
    expect(KEYS.length).toBeGreaterThanOrEqual(8);
    for (const [k, pack] of Object.entries(THEME_PACKS)) {
      expect(pack.key).toBe(k);
    }
  });

  it("incluye al menos un pack free y uno premium (para el gate)", () => {
    expect(THEME_PACK_LIST.some((p) => !p.isPremium)).toBe(true);
    expect(THEME_PACK_LIST.some((p) => p.isPremium)).toBe(true);
  });

  it("LEGAL: ningún label evoca una marca/personaje protegido conocido", () => {
    const banned =
      /spider|batman|superman|marvel|disney|pokemon|pokémon|anime|frozen|mickey|barbie|hello kitty|paw patrol/i;
    for (const p of THEME_PACK_LIST) {
      expect(p.label).not.toMatch(banned);
      expect(p.description).not.toMatch(banned);
    }
  });
});

describe("applyThemePack", () => {
  it("todo pack aplicado produce un theme que pasa themeSchema", () => {
    for (const key of KEYS) {
      const result = applyThemePack(defaultTheme(), key);
      expect(() => themeSchema.parse(result)).not.toThrow();
    }
  });

  it("es idempotente (aplicar dos veces = una vez)", () => {
    for (const key of KEYS) {
      const once = applyThemePack(defaultTheme(), key);
      const twice = applyThemePack(once, key);
      expect(twice).toEqual(once);
    }
  });

  it("no muta el theme de entrada", () => {
    const input = defaultTheme();
    const snapshot = structuredClone(input);
    applyThemePack(input, "floral-romantico");
    expect(input).toEqual(snapshot);
  });

  it("preserva el master switch theme.animations (no lo pisa)", () => {
    const off = { ...defaultTheme(), animations: false };
    const applied = applyThemePack(off, "boda-lujo");
    expect(applied.animations).toBe(false);

    const on = { ...defaultTheme(), animations: true };
    expect(applyThemePack(on, "boda-lujo").animations).toBe(true);
  });

  it("impone paleta, fuente, espaciado, decoración y guarda themePack", () => {
    const pack = THEME_PACKS["floral-romantico"];
    const applied = applyThemePack(defaultTheme(), pack.key);
    expect(applied.colors).toEqual(pack.theme.colors);
    expect(applied.font).toBe(pack.theme.font);
    expect(applied.spacing).toBe(pack.theme.spacing);
    expect(applied.decoration).toEqual(pack.theme.decoration);
    expect(applied.themePack).toBe(pack.key);
  });

  it("key inexistente devuelve el theme sin cambios", () => {
    const input = defaultTheme();
    expect(applyThemePack(input, "no-existe")).toEqual(input);
  });
});

describe("retro-compatibilidad de themeSchema.themePack", () => {
  it("un theme_config legacy (sin themePack) parsea sin romperse", () => {
    const legacy = {
      colors: {
        primary: "#8a6d3b",
        secondary: "#b08d57",
        background: "#ffffff",
        text: "#1f2937",
      },
      font: "elegant",
      spacing: "normal",
    };
    const parsed = parseTheme(legacy);
    expect(parsed.themePack).toBeUndefined();
    expect(parsed.font).toBe("elegant");
  });
});

describe("helpers", () => {
  it("getThemePack devuelve el pack o undefined", () => {
    expect(getThemePack("boda-lujo")?.key).toBe("boda-lujo");
    expect(getThemePack("no-existe")).toBeUndefined();
  });

  it("isThemePackPremium refleja el flag del pack", () => {
    expect(isThemePackPremium("floral-romantico")).toBe(false);
    expect(isThemePackPremium("boda-lujo")).toBe(true);
    expect(isThemePackPremium(undefined)).toBe(false);
    expect(isThemePackPremium("no-existe")).toBe(false);
  });
});
