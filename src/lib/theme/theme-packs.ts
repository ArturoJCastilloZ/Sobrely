import type {
  ThemeConfig,
  FontKey,
  SpacingKey,
  DecorationVariantKey,
} from "@/lib/theme/theme";
import { applyStylePreset, type StylePresetKey } from "@/lib/animation/style-presets";

/**
 * Theme packs (temáticas de 1 clic).
 *
 * Un "theme pack" es un preajuste completo del `theme_config` de una invitación:
 * paleta + tipografía + espaciado + preset de animación + decoración ambiental.
 * Se aplica con un clic desde el editor mediante `applyThemePack`, que devuelve
 * un `theme_config` nuevo (no muta el contenido/módulos del usuario).
 *
 * Fuente de verdad en CÓDIGO (mismo patrón que `plans.ts` y `style-presets.ts`);
 * migrar a tabla editable en caliente es trabajo de V2.
 *
 * LEGAL (duro): el catálogo es 100% genérico, sin IP de terceros. Ningún pack
 * nombra una marca ni evoca un personaje protegido. Los "temáticos infantiles"
 * son genéricos ("Superhéroe", "Galaxia", "Kawaii") con solo paleta/fuente/emoji.
 * Arte propio (fondos/stickers) es V2 y va con ToS de indemnización.
 */

export const THEME_PACK_CATEGORIES = [
  "boda",
  "xv",
  "baby",
  "infantil",
  "corporativo",
] as const;
export type ThemePackCategory = (typeof THEME_PACK_CATEGORIES)[number];

export const THEME_PACK_CATEGORY_LABELS: Record<ThemePackCategory, string> = {
  boda: "Bodas",
  xv: "XV años",
  baby: "Baby shower",
  infantil: "Infantiles",
  corporativo: "Corporativo",
};

/** Sub-objeto de `theme_config` que un pack impone al aplicarse. */
export type ThemePackTheme = {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  font: FontKey;
  spacing: SpacingKey;
  /** Superficie clara u oscura (C2). Opcional: por defecto "light". */
  mode?: "light" | "dark";
  /** Reusa un preset de animación existente (setea animation + decoración base). */
  stylePreset: StylePresetKey;
  /** Decoración ambiental final (emoji en MVP; sobreescribe la del preset). */
  decoration: {
    enabled: boolean;
    variant: DecorationVariantKey;
    symbol: string;
  };
};

export type ThemePack = {
  /** Slug estable (no cambiar: se guarda en `theme_config.themePack`). */
  key: string;
  label: string;
  description: string;
  category: ThemePackCategory;
  /** Gate: `true` => requiere la feature `advanced_personalization` (Celebración+). */
  isPremium: boolean;
  /** Imagen de la tarjeta del selector (bucket). Opcional en MVP (fallback: swatch). */
  previewImageUrl?: string;
  theme: ThemePackTheme;
};

/**
 * Catálogo curado. 2 packs free (para probar el flujo sin gate) + el resto
 * premium (para ejercitar el gate `advanced_personalization`).
 */
export const THEME_PACKS: Record<string, ThemePack> = {
  // ---- Bodas ----------------------------------------------------------------
  "minimalista-moderno": {
    key: "minimalista-moderno",
    label: "Minimalista Moderno",
    description: "Blanco, negro y un acento. Limpio y atemporal, sin decoración.",
    category: "boda",
    isPremium: false,
    theme: {
      colors: {
        primary: "#111111",
        secondary: "#6b7280",
        background: "#ffffff",
        text: "#111111",
      },
      font: "sans",
      spacing: "relaxed",
      stylePreset: "minimal-elegant",
      decoration: { enabled: false, variant: "floating", symbol: "❀" },
    },
  },
  "floral-romantico": {
    key: "floral-romantico",
    label: "Floral Romántico",
    description: "Rosa palo, salvia y crema con pétalos flotando.",
    category: "boda",
    isPremium: false,
    theme: {
      colors: {
        primary: "#b76e79",
        secondary: "#8a9a80",
        background: "#fbf6f2",
        text: "#4a3b3b",
      },
      font: "script",
      spacing: "normal",
      stylePreset: "soft-floral",
      decoration: { enabled: true, variant: "floating", symbol: "🌸" },
    },
  },
  "boda-lujo": {
    key: "boda-lujo",
    label: "Boda de Lujo",
    description: "Champán y oro sobre carbón. Elegante, con gradiente ambiental.",
    category: "boda",
    isPremium: true,
    theme: {
      colors: {
        primary: "#b08d57",
        secondary: "#8a6d3b",
        background: "#fffdf8",
        text: "#2a2724",
      },
      font: "elegant",
      spacing: "relaxed",
      stylePreset: "luxury-wedding",
      decoration: { enabled: true, variant: "ambient-gradient", symbol: "❀" },
    },
  },
  "botanico-greenery": {
    key: "botanico-greenery",
    label: "Botánico Greenery",
    description: "Verdes y crema con hojas flotando. Fresco y natural.",
    category: "boda",
    isPremium: true,
    theme: {
      colors: {
        primary: "#4b6b4a",
        secondary: "#8a9a80",
        background: "#f6f8f3",
        text: "#2e3a2c",
      },
      font: "serif",
      spacing: "normal",
      stylePreset: "soft-floral",
      decoration: { enabled: true, variant: "floating", symbol: "🍃" },
    },
  },
  // ---- XV años --------------------------------------------------------------
  "xv-clasico": {
    key: "xv-clasico",
    label: "XV Clásico Elegante",
    description: "Vino, oro y marfil. Sofisticado para una noche formal.",
    category: "xv",
    isPremium: true,
    theme: {
      colors: {
        primary: "#7b2d3a",
        secondary: "#b08d57",
        background: "#fdf9f4",
        text: "#2a2320",
      },
      font: "elegant",
      spacing: "relaxed",
      stylePreset: "luxury-wedding",
      decoration: { enabled: true, variant: "sparkle", symbol: "✦" },
    },
  },
  "xv-glam": {
    key: "xv-glam",
    label: "XV Glam Moderno",
    description: "Magenta, lila y negro con destellos. Vibrante y actual.",
    category: "xv",
    isPremium: true,
    theme: {
      colors: {
        primary: "#c026a3",
        secondary: "#8b5cf6",
        background: "#faf5ff",
        text: "#2a1a33",
      },
      font: "script",
      spacing: "normal",
      stylePreset: "modern-celebration",
      decoration: { enabled: true, variant: "sparkle", symbol: "✦" },
    },
  },
  // ---- Infantiles (genéricos, SIN IP) ---------------------------------------
  superheroe: {
    key: "superheroe",
    label: "Superhéroe (genérico)",
    description: "Rojo, azul y amarillo con energía. Tema genérico, sin marca.",
    category: "infantil",
    isPremium: true,
    theme: {
      colors: {
        primary: "#d62828",
        secondary: "#1d4ed8",
        background: "#fffdf5",
        text: "#1a1a2e",
      },
      font: "sans",
      spacing: "normal",
      stylePreset: "playful-birthday",
      decoration: { enabled: true, variant: "sparkle", symbol: "⚡" },
    },
  },
  galaxia: {
    key: "galaxia",
    label: "Galaxia / Espacio",
    description: "Índigo, violeta y plata con destellos. Aventura estelar.",
    category: "infantil",
    isPremium: true,
    theme: {
      colors: {
        primary: "#6d28d9",
        secondary: "#312e81",
        background: "#f5f3ff",
        text: "#1e1b3a",
      },
      font: "sans",
      spacing: "normal",
      stylePreset: "modern-celebration",
      decoration: { enabled: true, variant: "sparkle", symbol: "✦" },
    },
  },
  kawaii: {
    key: "kawaii",
    label: "Kawaii / Animalitos (genérico)",
    description: "Pasteles suaves con corazones. Tierno y genérico, sin marca.",
    category: "infantil",
    isPremium: true,
    theme: {
      colors: {
        primary: "#f7a8c4",
        secondary: "#a8d8ea",
        background: "#fff7fb",
        text: "#5a4a52",
      },
      font: "script",
      spacing: "normal",
      stylePreset: "kids-party",
      decoration: { enabled: true, variant: "floating", symbol: "💖" },
    },
  },
  // ---- Baby shower ----------------------------------------------------------
  // La categoría no existía: sus plantillas tomaban prestados packs infantiles
  // y de boda. Los cuatro son genéricos (nubes, animalitos de bosque, salvia),
  // sin evocar personaje ni marca alguna.
  "baby-nubes": {
    key: "baby-nubes",
    label: "Nubes y Cielo",
    description: "Celeste suave sobre crema, con nubes flotando. Ligero y tranquilo.",
    category: "baby",
    isPremium: true,
    theme: {
      colors: {
        primary: "#7fb3d5",
        secondary: "#cfe4f2",
        background: "#f6fbff",
        text: "#33475b",
      },
      font: "sans",
      spacing: "relaxed",
      stylePreset: "soft-floral",
      decoration: { enabled: true, variant: "floating", symbol: "☁️" },
    },
  },
  "baby-neutro": {
    key: "baby-neutro",
    label: "Baby Neutro",
    description: "Salvia, crema y tierra. Sin color de género, cálido y sobrio.",
    category: "baby",
    isPremium: false,
    theme: {
      colors: {
        primary: "#7c9070",
        secondary: "#cfd9c6",
        background: "#fbfaf6",
        text: "#33382f",
      },
      font: "serif",
      spacing: "relaxed",
      stylePreset: "minimal-elegant",
      decoration: { enabled: false, variant: "ambient-gradient", symbol: "❀" },
    },
  },
  "baby-animalitos": {
    key: "baby-animalitos",
    label: "Animalitos de Bosque (genérico)",
    description: "Tonos tierra y miel con hojitas. Tierno y genérico, sin marca.",
    category: "baby",
    isPremium: true,
    theme: {
      colors: {
        primary: "#a97c50",
        secondary: "#d9c3a5",
        background: "#fdf9f3",
        text: "#4a3a2c",
      },
      font: "script",
      spacing: "normal",
      stylePreset: "kids-party",
      decoration: { enabled: true, variant: "floating", symbol: "🌿" },
    },
  },
  "baby-revelacion": {
    key: "baby-revelacion",
    label: "Revelación de Género",
    description: "Rosa y azul en equilibrio, con destellos. Para no adelantar nada.",
    category: "baby",
    isPremium: true,
    theme: {
      colors: {
        primary: "#e8a0bf",
        secondary: "#8fb8de",
        background: "#fdf8fb",
        text: "#3f3a44",
      },
      font: "sans",
      spacing: "normal",
      stylePreset: "modern-celebration",
      decoration: { enabled: true, variant: "sparkle", symbol: "✨" },
    },
  },
  // ---- Corporativo ----------------------------------------------------------
  "corporativo-limpio": {
    key: "corporativo-limpio",
    label: "Corporativo Limpio",
    description: "Azul profesional sobre blanco. Rápido y sobrio, sin decoración.",
    category: "corporativo",
    isPremium: true,
    theme: {
      colors: {
        primary: "#1e3a5f",
        secondary: "#3b6ea5",
        background: "#ffffff",
        text: "#1a2230",
      },
      font: "sans",
      spacing: "compact",
      stylePreset: "corporate-clean",
      decoration: { enabled: false, variant: "ambient-gradient", symbol: "❀" },
    },
  },
  // ---- Genéricos adicionales (B1 · sin IP) ----------------------------------
  capibara: {
    key: "capibara",
    label: "Capibara / Naturaleza tierna",
    description: "Tonos tierra, olivo y crema. Cálido y relajado, con hojitas.",
    category: "infantil",
    isPremium: false,
    theme: {
      colors: {
        primary: "#8a6d4b",
        secondary: "#7d8b5a",
        background: "#faf6ee",
        text: "#4a3f30",
      },
      font: "script",
      spacing: "normal",
      stylePreset: "soft-floral",
      decoration: { enabled: true, variant: "floating", symbol: "🌿" },
    },
  },
  dinos: {
    key: "dinos",
    label: "Dinosaurios (genérico)",
    description: "Verde selva y naranja con energía. Divertido, sin marca.",
    category: "infantil",
    isPremium: true,
    theme: {
      colors: {
        primary: "#3f7d44",
        secondary: "#e07a2c",
        background: "#f6f9f2",
        text: "#26331f",
      },
      font: "sans",
      spacing: "normal",
      stylePreset: "playful-birthday",
      decoration: { enabled: true, variant: "floating", symbol: "🦕" },
    },
  },
  tropical: {
    key: "tropical",
    label: "Tropical / Playa",
    description: "Turquesa, coral y arena con palmeras. Fresco y veraniego.",
    category: "boda",
    isPremium: true,
    theme: {
      colors: {
        primary: "#0e9baa",
        secondary: "#ef7d57",
        background: "#f4fbfb",
        text: "#123b3f",
      },
      font: "script",
      spacing: "normal",
      stylePreset: "modern-celebration",
      decoration: { enabled: true, variant: "floating", symbol: "🌴" },
    },
  },
  futbol: {
    key: "futbol",
    label: "Fútbol (genérico)",
    description: "Verde cancha y blanco con destellos. Deportivo, sin equipo.",
    category: "infantil",
    isPremium: true,
    theme: {
      colors: {
        primary: "#1f8a4c",
        secondary: "#1a1a1a",
        background: "#f5faf6",
        text: "#14261b",
      },
      font: "sans",
      spacing: "normal",
      stylePreset: "playful-birthday",
      decoration: { enabled: true, variant: "sparkle", symbol: "⚽" },
    },
  },
  "terracota-otono": {
    key: "terracota-otono",
    label: "Terracota / Otoño",
    description: "Terracota, mostaza y salvia con hojas. Cálido y campestre.",
    category: "boda",
    isPremium: true,
    theme: {
      colors: {
        primary: "#b5623a",
        secondary: "#c79a3e",
        background: "#faf4ea",
        text: "#3d2c22",
      },
      font: "serif",
      spacing: "normal",
      stylePreset: "soft-floral",
      decoration: { enabled: true, variant: "floating", symbol: "🍂" },
    },
  },
  "noche-estelar": {
    key: "noche-estelar",
    label: "Noche Estelar (oscuro)",
    description: "Superficie oscura con oro y destellos. Elegante y nocturno.",
    category: "xv",
    isPremium: true,
    theme: {
      colors: {
        primary: "#d4af37",
        secondary: "#c0c7d0",
        background: "#0e1230",
        text: "#eef1f7",
      },
      font: "elegant",
      spacing: "relaxed",
      mode: "dark",
      stylePreset: "luxury-wedding",
      decoration: { enabled: true, variant: "sparkle", symbol: "✦" },
    },
  },
};

export const THEME_PACK_LIST: readonly ThemePack[] = Object.values(THEME_PACKS);

/** Busca un pack por su key. */
export function getThemePack(key: string): ThemePack | undefined {
  return THEME_PACKS[key];
}

/** ¿El pack (por key) requiere un plan con `advanced_personalization`? */
export function isThemePackPremium(key: string | undefined): boolean {
  if (!key) return false;
  return THEME_PACKS[key]?.isPremium ?? false;
}

/**
 * Aplica un theme pack a un `theme_config`, devolviendo uno nuevo.
 *
 * Gemela de `applyStylePreset` y retro-compatible: reusa el preset de animación
 * del pack (que setea `animation` + decoración base) y luego sobreescribe
 * paleta/fuente/espaciado/decoración con los del pack. **No** toca
 * `theme.animations` (el master switch on/off de la invitación) ni el contenido
 * de los módulos. Si la key no existe, devuelve el theme sin cambios.
 */
export function applyThemePack(theme: ThemeConfig, key: string): ThemeConfig {
  const pack = THEME_PACKS[key];
  if (!pack) return theme;

  const withStyle = applyStylePreset(theme, pack.theme.stylePreset);
  return {
    ...withStyle,
    colors: { ...pack.theme.colors },
    font: pack.theme.font,
    spacing: pack.theme.spacing,
    mode: pack.theme.mode ?? "light",
    decoration: { imageUrl: "", ...pack.theme.decoration },
    themePack: pack.key,
  };
}
