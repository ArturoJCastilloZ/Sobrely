import { z } from "zod";
import {
  ANIMATION_DIRECTIONS,
  ANIMATION_INTENSITIES,
  ANIMATION_PRESETS,
  ANIMATION_TRIGGERS,
  type AnimationConfig,
  type AnimationOverride,
  type ResolvedAnimation,
} from "./types";

/**
 * Persisted animation config schema. Used for both the global default
 * (theme_config.animation) and validated on the server before writing.
 */
export const animationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  preset: z.enum(ANIMATION_PRESETS).default("soft-reveal"),
  trigger: z.enum(ANIMATION_TRIGGERS).default("scroll"),
  duration: z.number().min(0.1).max(3).default(0.6),
  delay: z.number().min(0).max(3).default(0),
  intensity: z.enum(ANIMATION_INTENSITIES).default("moderate"),
  direction: z.enum(ANIMATION_DIRECTIONS).default("up"),
  once: z.boolean().default(true),
  repeat: z.boolean().default(false),
  stagger: z.number().min(0).max(1).default(0),
});

/** Partial schema for per-module overrides (5.4). */
export const animationOverrideSchema = animationConfigSchema.partial();

/**
 * Reads a per-module animation override stored under `config.animation`.
 * Returns undefined when absent/invalid (module falls back to the global
 * default). Kept separate from the content schema so `parseConfig` can strip
 * `animation` from content without losing it here.
 */
export function readModuleAnimationOverride(
  config: Record<string, unknown> | null | undefined,
): AnimationOverride | undefined {
  const raw = config?.["animation"];
  if (!raw || typeof raw !== "object") return undefined;
  const result = animationOverrideSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}

export const SYSTEM_DEFAULT_ANIMATION: AnimationConfig =
  animationConfigSchema.parse({});

export function defaultAnimation(): AnimationConfig {
  return { ...SYSTEM_DEFAULT_ANIMATION };
}

/** Normalizes stored data, filling defaults; falls back to system default. */
export function parseAnimation(raw: unknown): AnimationConfig {
  const result = animationConfigSchema.safeParse(raw ?? {});
  return result.success ? result.data : defaultAnimation();
}

/**
 * Resolves the effective animation: module override > global > system default.
 * `masterEnabled` is the invitation-level on/off switch (theme.animations).
 */
export function resolveAnimation(
  global: AnimationConfig | undefined,
  override?: AnimationOverride,
  masterEnabled = true,
): ResolvedAnimation {
  const base = global ?? defaultAnimation();
  const merged: AnimationConfig = { ...base, ...(override ?? {}) };
  return {
    ...merged,
    enabled: masterEnabled && merged.enabled,
  };
}
