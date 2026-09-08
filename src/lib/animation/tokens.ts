import type { AnimationIntensity } from "./types";

/**
 * Motion tokens — the single source for easings and intensity scales. Presets
 * are built by combining tokens so the whole system stays consistent and
 * tunable from one place.
 *
 * La tabla `DURATIONS` (fast/base/slow) vivía aquí y se quitó al pasar la
 * velocidad a un deslizador continuo: su único consumidor era `SPEED_OPTIONS`,
 * los tres botones fijos. La duración ahora es un número libre (0.2–2 s en la
 * UI, 0.1–3 en el esquema) y su valor por defecto vive donde se persiste,
 * en `animationConfigSchema`. Se borró en vez de dejarla huérfana: un token
 * que nadie lee deja de ser una fuente de verdad y pasa a ser una trampa.
 */

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
  subtle: { distance: 8, scale: 0.015, blur: 2 },
  moderate: { distance: 30, scale: 0.06, blur: 8 },
  expressive: { distance: 72, scale: 0.16, blur: 20 },
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
