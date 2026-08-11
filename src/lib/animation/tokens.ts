import type { AnimationIntensity } from "./types";

/**
 * Motion tokens — the single source for durations, easings and intensity
 * scales. Presets are built by combining tokens so the whole system stays
 * consistent and tunable from one place.
 */

export const DURATIONS = {
  fast: 0.4,
  base: 0.6,
  slow: 0.9,
} as const;

/** CSS easing strings (also usable as cubic-bezier arrays for Framer in 5.3). */
export const EASINGS = {
  /** Gentle, premium ease-out. */
  standard: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Soft symmetrical ease. */
  soft: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Slight overshoot for playful presets. */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Per-intensity magnitudes consumed by the CSS custom properties. */
export const INTENSITY_SCALE: Record<
  AnimationIntensity,
  { distance: number; scale: number; blur: number }
> = {
  subtle: { distance: 12, scale: 0.02, blur: 3 },
  moderate: { distance: 24, scale: 0.05, blur: 6 },
  expressive: { distance: 40, scale: 0.1, blur: 12 },
};

/** Stagger presets (seconds) between animated children. */
export const STAGGER = {
  none: 0,
  tight: 0.06,
  normal: 0.1,
  loose: 0.16,
} as const;

/** Friendly labels for the editor UI. */
export const INTENSITY_LABELS: Record<AnimationIntensity, string> = {
  subtle: "Sutil",
  moderate: "Moderada",
  expressive: "Llamativa",
};

/** Simple speed choices mapped to a duration (seconds). */
export const SPEED_OPTIONS = [
  { key: "slow", label: "Lenta", duration: DURATIONS.slow },
  { key: "normal", label: "Normal", duration: DURATIONS.base },
  { key: "fast", label: "Rápida", duration: DURATIONS.fast },
] as const;

export const TRIGGER_LABELS: Record<string, string> = {
  scroll: "Al entrar en pantalla",
  load: "Al cargar",
  hover: "Al pasar el cursor",
  click: "Al hacer clic",
  manual: "Manual",
};

/** Clamp helpers keep persisted values within safe ranges. */
export function clampDuration(v: number): number {
  return Math.min(3, Math.max(0.1, v));
}

export function clampDelay(v: number): number {
  return Math.min(3, Math.max(0, v));
}

export function clampStagger(v: number): number {
  return Math.min(1, Math.max(0, v));
}
