import type { Plan, PlanFeature } from "@/lib/billing/types";
import { formatPrice } from "@/lib/billing/config";
import { planHasComingSoon, planHasFeature } from "@/lib/billing/plans";

/**
 * Filas de la tabla comparativa de `/pricing`. Cada fila se deriva de la
 * configuración de planes (no se hardcodea por celda): puede leer una feature
 * booleana o un valor numérico/textual del plan.
 */
export interface ComparisonRow {
  readonly label: string;
  /** Valor a mostrar por plan (✓/✗/Próximamente si es booleano, o texto). */
  readonly value: (plan: Plan) => string;
}

const FEATURE_LABELS: Record<PlanFeature, string> = {
  csv_export: "Exportación CSV de RSVP",
  advanced_personalization: "Personalización avanzada",
  custom_art: "Arte propio (fondo e imágenes)",
  basic_analytics: "Analytics básicos",
  advanced_analytics: "Analytics avanzados",
  custom_domain: "Dominio personalizado",
  priority_support: "Soporte prioritario",
  visual_review: "Revisión visual inicial",
};

const BRANDING_LABEL: Record<Plan["branding"], string> = {
  full: "Con branding",
  reduced: "Branding reducido",
  none: "Sin branding",
};

const YES = "✓";
const NO = "—";
const SOON = "Próximamente";

/**
 * Estado de una feature en un plan: incluida (✓), próximamente, o no (—).
 */
function featureState(plan: Plan, feature: PlanFeature): string {
  if (planHasFeature(plan, feature)) return YES;
  if (planHasComingSoon(plan, feature)) return SOON;
  return NO;
}

/** Etiqueta legible de una feature. */
export function featureLabel(feature: PlanFeature): string {
  return FEATURE_LABELS[feature];
}

/** Vigencia en texto legible según el plan. */
function vigenciaLabel(p: Plan): string {
  if (p.publishTrialDays !== null) return `Demo ${p.publishTrialDays} días`;
  if (p.graceDaysAfterEvent !== null) {
    return `Evento + ${p.graceDaysAfterEvent} días`;
  }
  return `${Math.round(p.fallbackDurationDays / 30)} meses`;
}

/** Filas de la comparativa, derivadas de la config de planes. */
export const COMPARISON_ROWS: readonly ComparisonRow[] = [
  {
    label: "Precio por evento",
    value: (p) =>
      p.billingType === "free"
        ? "Gratis"
        : formatPrice(p.priceRegular, p.currency),
  },
  { label: "Vigencia de la invitación", value: vigenciaLabel },
  { label: "Invitados incluidos", value: (p) => `Hasta ${p.maxGuests}` },
  { label: "Almacenamiento", value: (p) => `${p.maxStorageMb} MB` },
  {
    label: "Módulos disponibles",
    value: (p) => String(p.allowedModules.length),
  },
  { label: "Branding", value: (p) => BRANDING_LABEL[p.branding] },
  {
    label: FEATURE_LABELS.csv_export,
    value: (p) => featureState(p, "csv_export"),
  },
  {
    label: FEATURE_LABELS.advanced_personalization,
    value: (p) => featureState(p, "advanced_personalization"),
  },
  {
    label: FEATURE_LABELS.priority_support,
    value: (p) => featureState(p, "priority_support"),
  },
  {
    label: FEATURE_LABELS.visual_review,
    value: (p) => featureState(p, "visual_review"),
  },
  {
    label: FEATURE_LABELS.basic_analytics,
    value: (p) => featureState(p, "basic_analytics"),
  },
  {
    label: FEATURE_LABELS.advanced_analytics,
    value: (p) => featureState(p, "advanced_analytics"),
  },
  {
    label: FEATURE_LABELS.custom_domain,
    value: (p) => featureState(p, "custom_domain"),
  },
] as const;
