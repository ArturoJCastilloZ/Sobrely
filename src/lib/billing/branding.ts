import type { BrandingLevel } from "@/lib/billing/types";
import { PLANS } from "@/lib/billing/plans";

/**
 * Nivel de marca de Sobrely a partir del código de plan efectivo que exponen
 * las RPC públicas (`plan_code`).
 *
 * Fail-safe deliberado: si el código viene nulo, vacío o no corresponde a
 * ningún plan conocido, se devuelve `full`. Nunca se oculta la marca por un
 * dato faltante; ocultarla es una capacidad que el plan debe conceder de forma
 * explícita.
 */
export function brandingForPlanCode(
  code: string | null | undefined,
): BrandingLevel {
  if (!code) return "full";
  return PLANS.find((p) => p.code === code)?.branding ?? "full";
}
