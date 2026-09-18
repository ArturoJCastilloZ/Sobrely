"use client";

import { minimalPlanForFeature } from "@/lib/billing/plans";
import type { PlanFeature } from "@/lib/billing/types";

/**
 * Insignia del plan que desbloquea una capacidad.
 *
 * Se deriva de `plans.ts` — la MISMA fuente que gatea al publicar — a
 * propósito: el nombre del plan venía escrito a mano en tres lugares, y cuando
 * `custom_art` bajó a Celebración el editor habría seguido pidiendo el plan de
 * arriba. Ahora un cambio de plan se refleja solo.
 *
 * Vive aquí y no dentro de `theme-panel` porque el slot de imagen de las
 * secciones necesita la misma insignia. Copiarla habría repetido justo el
 * defecto que el párrafo de arriba describe.
 */
export function FeatureBadge({ feature }: { feature: PlanFeature }) {
  const plan = minimalPlanForFeature(feature);
  if (!plan) return null;
  return (
    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
      {plan.name} ⭐
    </span>
  );
}
