import type { TextStyle } from "@/lib/modules/types";
import type { FontKey } from "@/lib/theme/theme";

/**
 * Recetas de tipografía para un bloque individual.
 *
 * No son un segundo sistema de tema: son atajos que escriben exactamente los
 * mismos overrides que ya entiende el renderer. Después de aplicar uno, cada
 * propiedad continúa disponible en el inspector para afinarla.
 */
export const TEXT_STYLE_PRESETS = [
  {
    key: "editorial",
    label: "Editorial",
    sample: "Aa",
    style: {
      font: "elegant",
      weight: "normal",
      letterSpacing: 0.01,
      lineHeight: 1.1,
    },
  },
  {
    key: "romantico",
    label: "Romántico",
    sample: "Amor",
    style: {
      font: "script",
      weight: "normal",
      letterSpacing: 0,
      lineHeight: 1.15,
    },
  },
  {
    key: "impacto",
    label: "Impacto",
    sample: "WOW",
    style: {
      font: "modern",
      weight: "bold",
      letterSpacing: 0.08,
      lineHeight: 0.95,
      transform: "uppercase",
    },
  },
  {
    key: "etiqueta",
    label: "Etiqueta",
    sample: "SAVE",
    style: {
      font: "sans",
      weight: "semibold",
      letterSpacing: 0.18,
      lineHeight: 1.1,
      transform: "uppercase",
    },
  },
  {
    key: "clasico",
    label: "Clásico",
    sample: "Texto",
    style: {
      font: "serif",
      weight: "normal",
      letterSpacing: 0,
      lineHeight: 1.45,
    },
  },
  {
    key: "limpio",
    label: "Limpio",
    sample: "Hola",
    style: {
      font: "modern",
      weight: "medium",
      letterSpacing: 0,
      lineHeight: 1.35,
    },
  },
] as const satisfies readonly {
  key: string;
  label: string;
  sample: string;
  style: TextStyle & { font: FontKey };
}[];

export type TextStylePresetKey = (typeof TEXT_STYLE_PRESETS)[number]["key"];
