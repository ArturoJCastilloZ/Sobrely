/**
 * Core types for the InvitaFlow animation system.
 *
 * Vocabulary is defined here (design). Which presets are actually implemented
 * as visual variants is tracked by the registry (registry.ts) and grows over
 * the following subphases (5.3 = catalog). Unimplemented presets degrade to a
 * safe static render.
 */

export const ANIMATION_TRIGGERS = [
  "load",
  "scroll",
  "hover",
  "click",
  "manual",
] as const;
export type AnimationTrigger = (typeof ANIMATION_TRIGGERS)[number];

export const ANIMATION_INTENSITIES = [
  "subtle",
  "moderate",
  "expressive",
] as const;
export type AnimationIntensity = (typeof ANIMATION_INTENSITIES)[number];

export const ANIMATION_DIRECTIONS = [
  "up",
  "down",
  "left",
  "right",
  "none",
] as const;
export type AnimationDirection = (typeof ANIMATION_DIRECTIONS)[number];

/**
 * Full preset vocabulary across all catalog categories. Not all are visually
 * implemented yet — see registry.ts (`implemented`). This union is the stable
 * contract stored in the DB.
 */
export const ANIMATION_PRESETS = [
  // none / entrance
  "none",
  "soft-reveal",
  "curtain-reveal",
  "editorial-reveal",
  "layered-reveal",
  "welcome-entrance",
  // scroll reveals
  "fade-up",
  "fade-down",
  "soft-scale",
  "blur-focus",
  "slide-left",
  "slide-right",
  "rotate-in",
  "section-lift",
  // composed
  "stagger-children",
  "image-clip",
  // text
  "text-rise",
  "masked-text",
  "line-draw",
  // decorations / continuous
  "floating",
  "ambient-gradient",
  "sparkle",
  "ornamental-drift",
] as const;
export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

/**
 * Persisted animation configuration. Lives at two levels:
 *  - global default in `theme_config.animation`
 *  - per-module override in `module.config.animation` (partial, added in 5.4)
 * Resolution order: module override > global > system default.
 */
export type AnimationConfig = {
  enabled: boolean;
  preset: AnimationPreset;
  trigger: AnimationTrigger;
  duration: number; // seconds
  delay: number; // seconds
  intensity: AnimationIntensity;
  direction: AnimationDirection;
  once: boolean; // animate a single time vs. every viewport entry
  repeat: boolean; // for continuous presets (5.3)
  stagger: number; // seconds between animated children (0 = none)
};

/** A partial override (per-module). */
export type AnimationOverride = Partial<AnimationConfig>;

/** Fully-resolved config consumed by the runtime primitives. */
export type ResolvedAnimation = AnimationConfig;

/** Runtime engine a preset is rendered with. */
export type AnimationEngine = "css" | "motion" | "none";

/** Relative performance cost, used by the editor to warn users (5.6/5.7). */
export type AnimationCost = "low" | "moderate" | "high";

export type AnimationCategory =
  | "entrance"
  | "scroll"
  | "text"
  | "decoration"
  | "composed";

/** Registry entry: metadata for a single catalog animation. */
export type AnimationDescriptor = {
  preset: AnimationPreset;
  /** Commercial / friendly name shown in the editor. */
  label: string;
  description: string;
  category: AnimationCategory;
  engine: AnimationEngine;
  cost: AnimationCost;
  /** Whether a visual variant is actually implemented yet. */
  implemented: boolean;
  /** Recommended default duration in seconds. */
  recommendedDuration: number;
  /** Reduced-motion safe without special handling. */
  reducedMotionSafe: boolean;
};
