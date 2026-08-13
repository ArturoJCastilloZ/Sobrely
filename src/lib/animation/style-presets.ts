import type { AnimationConfig, AnimationPreset } from "./types";
import type { ThemeConfig, DecorationVariantKey } from "@/lib/theme/theme";

/**
 * Style presets (5.5): named bundles that configure the invitation-wide
 * animation defaults + ambient decoration in one click. The user can still
 * customize per module afterwards.
 */
export type StylePresetKey =
  | "minimal-elegant"
  | "romantic-editorial"
  | "modern-celebration"
  | "soft-floral"
  | "luxury-wedding"
  | "playful-birthday"
  | "kids-party"
  | "corporate-clean";

export type StylePreset = {
  key: StylePresetKey;
  label: string;
  description: string;
  animation: Pick<
    AnimationConfig,
    "preset" | "intensity" | "duration" | "once" | "stagger"
  >;
  decoration: { enabled: boolean; variant: DecorationVariantKey; symbol: string };
};

function a(
  preset: AnimationPreset,
  intensity: AnimationConfig["intensity"],
  duration: number,
  stagger = 0.08,
): StylePreset["animation"] {
  return { preset, intensity, duration, once: true, stagger };
}

export const STYLE_PRESETS: Record<StylePresetKey, StylePreset> = {
  "minimal-elegant": {
    key: "minimal-elegant",
    label: "Minimal Elegante",
    description: "Sobrio y limpio. Revelados suaves, sin decoración.",
    animation: a("soft-reveal", "subtle", 0.6),
    decoration: { enabled: false, variant: "floating", symbol: "❀" },
  },
  "romantic-editorial": {
    key: "romantic-editorial",
    label: "Romántico Editorial",
    description: "Elegante y emocional, con pétalos flotando.",
    animation: a("editorial-reveal", "moderate", 0.8),
    decoration: { enabled: true, variant: "floating", symbol: "❀" },
  },
  "modern-celebration": {
    key: "modern-celebration",
    label: "Celebración Moderna",
    description: "Fresco y dinámico, con destellos sutiles.",
    animation: a("soft-scale", "moderate", 0.6),
    decoration: { enabled: true, variant: "sparkle", symbol: "✦" },
  },
  "soft-floral": {
    key: "soft-floral",
    label: "Floral Suave",
    description: "Delicado, con flores flotando lentamente.",
    animation: a("fade-up", "subtle", 0.7),
    decoration: { enabled: true, variant: "floating", symbol: "🌸" },
  },
  "luxury-wedding": {
    key: "luxury-wedding",
    label: "Boda de Lujo",
    description: "Sofisticado, revelado cortina y gradiente ambiental.",
    animation: a("curtain-reveal", "moderate", 0.9),
    decoration: { enabled: true, variant: "ambient-gradient", symbol: "❀" },
  },
  "playful-birthday": {
    key: "playful-birthday",
    label: "Cumpleaños Divertido",
    description: "Enérgico y alegre, con globos.",
    animation: a("rotate-in", "expressive", 0.5, 0.06),
    decoration: { enabled: true, variant: "floating", symbol: "🎈" },
  },
  "kids-party": {
    key: "kids-party",
    label: "Fiesta Infantil",
    description: "Muy dinámico y festivo, con confeti.",
    animation: a("soft-scale", "expressive", 0.5, 0.05),
    decoration: { enabled: true, variant: "sparkle", symbol: "🎉" },
  },
  "corporate-clean": {
    key: "corporate-clean",
    label: "Corporativo Limpio",
    description: "Profesional y rápido, sin decoración.",
    animation: a("fade-up", "subtle", 0.45),
    decoration: { enabled: false, variant: "ambient-gradient", symbol: "❀" },
  },
};

export const STYLE_PRESET_LIST = Object.values(STYLE_PRESETS);

/**
 * Applies a style preset onto a theme: sets the global animation defaults and
 * the ambient decoration. Keeps colors, font, spacing and the master switch.
 */
export function applyStylePreset(
  theme: ThemeConfig,
  key: StylePresetKey,
): ThemeConfig {
  const p = STYLE_PRESETS[key];
  return {
    ...theme,
    stylePreset: key,
    animation: {
      ...theme.animation,
      preset: p.animation.preset,
      intensity: p.animation.intensity,
      duration: p.animation.duration,
      once: p.animation.once,
      stagger: p.animation.stagger,
      trigger: "scroll",
      enabled: true,
    },
    decoration: { imageUrl: "", ...p.decoration },
  };
}
