import { describe, it, expect } from "vitest";

import {
  THEME_PACKS,
  THEME_PACK_LIST,
  applyThemePack,
  getThemePack,
  isThemePackPremium,
  THEME_PACK_CATEGORIES,
  THEME_PACK_CATEGORY_LABELS,
} from "@/lib/theme/theme-packs";
import {
  defaultTheme,
  parseTheme,
  themeSchema,
  FONT_KEYS,
  resolveTypography,
} from "@/lib/theme/theme";

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

  it("toda categoría declarada tiene al menos un pack", () => {
    // El selector itera THEME_PACK_CATEGORIES y filtra la lista, así que una
    // categoría sin packs pinta un encabezado vacío. Esto pasó de verdad:
    // "baby" no existía y sus plantillas tomaban prestados packs infantiles.
    for (const category of THEME_PACK_CATEGORIES) {
      const packs = THEME_PACK_LIST.filter((p) => p.category === category);
      expect(
        packs.length,
        `la categoría "${category}" no tiene ni un pack`,
      ).toBeGreaterThan(0);
    }
  });

  it("toda categoría tiene etiqueta legible", () => {
    for (const category of THEME_PACK_CATEGORIES) {
      expect(THEME_PACK_CATEGORY_LABELS[category]?.trim()).toBeTruthy();
    }
  });

  it("la categoría de cada pack es una de las declaradas", () => {
    for (const pack of THEME_PACK_LIST) {
      expect(
        THEME_PACK_CATEGORIES as readonly string[],
        `${pack.key}: categoría "${pack.category}" no declarada`,
      ).toContain(pack.category);
    }
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
    expect(applied.decoration).toEqual({ imageUrl: "", ...pack.theme.decoration });
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

describe("par tipográfico de los packs (Fase 11 · P4 aplicada a los 20)", () => {
  // Por qué vive aquí y no en la plantilla: 30 de las 50 originales guardan SOLO
  // `{themePack, backgroundImage}` y heredan color y tipografía del pack, que
  // `resolveTemplateTheme` expande. Medido contra la BD el 2026-09-08. Así que el
  // pack es el punto donde un cambio alcanza a 30 plantillas de una vez.

  it("hay 20 packs que comprobar", () => {
    // Control de conteo: si el catálogo se vaciara, los `for` de abajo pasarían
    // sin comprobar nada. Ya pasó en esta suite con un `it.each` sobre lista
    // vacía.
    expect(KEYS.length).toBe(20);
  });

  it("los 20 declaran par heading/body", () => {
    for (const [k, pack] of Object.entries(THEME_PACKS)) {
      expect(pack.theme.typography, `${k} sin par`).toBeDefined();
      expect(FONT_KEYS, `${k} heading`).toContain(pack.theme.typography.heading);
      expect(FONT_KEYS, `${k} body`).toContain(pack.theme.typography.body);
    }
  });

  it("REGLA DURA: `body` nunca es `script`", () => {
    // `script` es una familia de DISPLAY. Antes de esto seis packs la usaban
    // para todo —titular y cuerpo— porque `font` es una sola familia: un
    // párrafo entero en cursiva manuscrita no se lee. El titular sí la puede
    // llevar, y de hecho la lleva en 8 de los 20.
    for (const [k, pack] of Object.entries(THEME_PACKS)) {
      expect(pack.theme.typography.body, `${k} usa script en el cuerpo`).not.toBe(
        "script",
      );
    }
  });

  it("el par del pack LLEGA al theme aplicado", () => {
    // Sin esto el par seria dato muerto en el catalogo: se declara y nadie lo
    // emite. Se vio en rojo antes de conectarlo en `applyThemePack`.
    for (const [k, pack] of Object.entries(THEME_PACKS)) {
      const t = applyThemePack(defaultTheme(), k);
      expect(t.typography, `${k}`).toEqual(pack.theme.typography);
    }
  });

  it("cambiar de pack REEMPLAZA el par, no lo hereda", () => {
    // El defecto que este caso defiende: `applyThemePack` hace spread del theme
    // entrante, asi que un par escrito condicionalmente sobreviviria al cambio
    // de pack y dejaria el titular del pack viejo sobre los colores del nuevo.
    for (const desde of KEYS) {
      for (const hacia of KEYS) {
        const t = applyThemePack(applyThemePack(defaultTheme(), desde), hacia);
        expect(t.typography, `${desde} -> ${hacia}`).toEqual(
          THEME_PACKS[hacia].theme.typography,
        );
      }
    }
  });

  it("el par sobrevive a themeSchema y a resolveTypography", () => {
    // Que el objeto en memoria lo tenga no basta: tiene que atravesar el parse
    // (que es lo que corre en vivo) y salir por el resolvedor que usa el render.
    for (const k of KEYS) {
      const t = parseTheme(applyThemePack(defaultTheme(), k));
      expect(resolveTypography(t), `${k}`).toEqual(
        THEME_PACKS[k].theme.typography,
      );
    }
  });
});
