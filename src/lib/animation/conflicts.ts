import type { ThemeConfig } from "@/lib/theme/theme";
import { resolveAnimation, readModuleAnimationOverride } from "./schema";
import { ANIMATION_REGISTRY } from "./registry";

type ModuleLike = { is_visible: boolean; config: Record<string, unknown> };

/**
 * Heuristic detector that warns about visually/performance-costly animation
 * combinations (5.5). Returns human-readable warnings for the editor; it never
 * blocks — the user decides.
 */
export function detectAnimationConflicts(
  theme: ThemeConfig,
  modules: ModuleLike[],
): string[] {
  const warnings: string[] = [];
  if (!theme.animations) return warnings;

  const visible = modules.filter((m) => m.is_visible);
  const resolved = visible.map((m) =>
    resolveAnimation(theme.animation, readModuleAnimationOverride(m.config), true),
  );
  const animated = resolved.filter((r) => r.enabled && r.preset !== "none");

  if (animated.length > 8) {
    warnings.push(
      `${animated.length} secciones animadas al mismo tiempo: considera desactivar algunas para no saturar.`,
    );
  }

  const costly = animated.filter(
    (r) => (ANIMATION_REGISTRY[r.preset]?.cost ?? "low") !== "low",
  );
  if (costly.length > 4) {
    warnings.push(
      `${costly.length} animaciones de costo moderado/alto: pueden verse pesadas en móviles de gama baja.`,
    );
  }

  if (animated.some((r) => r.duration > 1.2)) {
    warnings.push("Hay animaciones con duración larga (más de 1.2s); pueden sentirse lentas.");
  }

  if (animated.some((r) => !r.once)) {
    warnings.push("Alguna animación se repite cada vez que entra en pantalla (no solo la primera).");
  }

  if (theme.decoration.enabled && theme.decoration.variant === "sparkle") {
    warnings.push("La decoración de destellos es de alto costo; úsala con moderación en móvil.");
  }

  return warnings;
}
