import type { ModuleType } from "@/lib/modules/types";
import { MODULE_TYPES } from "@/lib/modules/types";
import type { Plan, PlanCode, PlanFeature } from "@/lib/billing/types";
import { isLaunchCampaignActive } from "@/lib/billing/config";

/**
 * Fuente de verdad de los planes comerciales.
 *
 * Cambiar precio, vigencia, límites o módulos aquí; nunca en componentes. En la
 * Subfase 8.2 esta tabla se siembra a Supabase (`plans`) para poder editarla en
 * caliente; este archivo sigue siendo el contrato tipado.
 *
 * Modelo por evento: cada PUBLICACIÓN es una compra que aplica a UNA invitación
 * (no hay límite de "invitaciones activas"; los borradores son ilimitados).
 * Los módulos que un plan no incluye se muestran como ⭐ premium en el editor y,
 * al publicar usándolos, se ofrece el plan que los desbloquea (un solo checkout).
 */

/** Grupos de módulos, escalonados de forma acumulativa por plan. */
const FREE_MODULES: readonly ModuleType[] = [
  "hero",
  "welcome",
  "countdown",
  "rsvp",
];

const ESENCIAL_MODULES: readonly ModuleType[] = [
  ...FREE_MODULES,
  "map",
  "gifts",
];

const CELEBRACION_MODULES: readonly ModuleType[] = [
  ...ESENCIAL_MODULES,
  "gallery",
  "itinerary",
  "dresscode",
  "music",
];

/** Premium incluye todos los módulos existentes (agrega `video`). */
const ALL_MODULES: readonly ModuleType[] = MODULE_TYPES;

export const PLANS: readonly Plan[] = [
  {
    code: "free",
    name: "Free",
    tagline: "Crea gratis y paga solo cuando quieras publicar.",
    description:
      "Arma tu invitación y vela en preview sin costo. Publícala como demo por 14 días o elige un plan para tu evento.",
    billingType: "free",
    priceLaunch: 0,
    priceRegular: 0,
    currency: "MXN",
    publishTrialDays: 14,
    graceDaysAfterEvent: null,
    fallbackDurationDays: 14,
    maxGuests: 25,
    maxStorageMb: 50,
    allowedModules: FREE_MODULES,
    features: [],
    comingSoon: [],
    branding: "full",
    isRecommended: false,
    isActive: true,
    displayOrder: 1,
    highlights: [
      "Borradores ilimitados",
      "Templates gratuitos",
      "Vista previa completa",
      "Módulos básicos (Hero, Bienvenida, Countdown, RSVP)",
      "Publicación demo por 14 días, con branding de Sobrely",
      "Soporte por documentación",
    ],
  },
  {
    code: "esencial",
    name: "Esencial",
    tagline: "Lo necesario para publicar tu evento.",
    description:
      "Publica una invitación con lo esencial: portada, cuenta regresiva, mapa, mesa de regalos y confirmaciones.",
    billingType: "per_event",
    priceLaunch: 199,
    priceRegular: 299,
    currency: "MXN",
    publishTrialDays: null,
    graceDaysAfterEvent: 7,
    fallbackDurationDays: 90,
    maxGuests: 100,
    maxStorageMb: 200,
    allowedModules: ESENCIAL_MODULES,
    features: ["csv_export"],
    comingSoon: [],
    branding: "reduced",
    isRecommended: false,
    isActive: true,
    displayOrder: 2,
    highlights: [
      "Publica 1 invitación",
      "Vigente hasta tu evento + 7 días",
      "Hasta 100 invitados",
      "Hero, Countdown, Mapa, Mesa de regalos y RSVP",
      "Enlace compartible",
      "Edición después de publicar",
      "Exportación CSV de confirmaciones",
      "Branding reducido",
    ],
  },
  {
    code: "celebracion",
    name: "Celebración",
    tagline: "El plan recomendado para tu gran día.",
    description:
      "Todos los módulos de contenido, sin branding y con personalización avanzada de colores y tipografías.",
    billingType: "per_event",
    priceLaunch: 399,
    priceRegular: 499,
    currency: "MXN",
    publishTrialDays: null,
    graceDaysAfterEvent: 30,
    fallbackDurationDays: 180,
    maxGuests: 250,
    maxStorageMb: 500,
    allowedModules: CELEBRACION_MODULES,
    features: ["csv_export", "advanced_personalization"],
    comingSoon: ["basic_analytics"],
    branding: "none",
    isRecommended: true,
    isActive: true,
    displayOrder: 3,
    highlights: [
      "Todo lo de Esencial",
      "Vigente hasta tu evento + 30 días",
      "Hasta 250 invitados",
      "Sin branding de Sobrely",
      "Galería, Itinerario, Dress code y Música",
      "Personalización avanzada de colores y tipografías",
      "Analytics básicos (próximamente)",
    ],
  },
  {
    code: "premium",
    name: "Premium",
    tagline: "Máxima capacidad y personalización.",
    description:
      "Todos los módulos (incluido video), mayor capacidad de invitados y almacenamiento, y revisión visual a solicitud.",
    billingType: "per_event",
    priceLaunch: 699,
    priceRegular: 899,
    currency: "MXN",
    publishTrialDays: null,
    graceDaysAfterEvent: 90,
    fallbackDurationDays: 365,
    maxGuests: 500,
    maxStorageMb: 2000,
    allowedModules: ALL_MODULES,
    features: [
      "csv_export",
      "advanced_personalization",
      "priority_support",
      "visual_review",
    ],
    comingSoon: ["advanced_analytics", "custom_domain"],
    branding: "none",
    isRecommended: false,
    isActive: true,
    displayOrder: 4,
    highlights: [
      "Todo lo de Celebración",
      "Vigente hasta tu evento + 90 días",
      "Hasta 500 invitados",
      "Módulo de Video (todos los módulos disponibles)",
      "Mayor almacenamiento",
      "Revisión visual inicial a solicitud",
      "Soporte prioritario",
      "Analytics avanzados y dominio propio (próximamente)",
    ],
  },
] as const;

/** Planes activos, ordenados para mostrar. */
export function getActivePlans(): readonly Plan[] {
  return PLANS.filter((p) => p.isActive).sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

/** Busca un plan por su código. */
export function getPlan(code: PlanCode): Plan | undefined {
  return PLANS.find((p) => p.code === code);
}

/**
 * Precio efectivo del plan según la campaña de lanzamiento.
 * @param now fecha de referencia (inyectable para tests).
 */
export function getEffectivePrice(plan: Plan, now: Date = new Date()): number {
  return isLaunchCampaignActive(now) ? plan.priceLaunch : plan.priceRegular;
}

/** ¿El precio de lanzamiento aplica y es menor que el regular? */
export function isOnLaunchOffer(plan: Plan, now: Date = new Date()): boolean {
  return isLaunchCampaignActive(now) && plan.priceLaunch < plan.priceRegular;
}

/** ¿El plan incluye una capacidad dada y disponible hoy? */
export function planHasFeature(plan: Plan, feature: PlanFeature): boolean {
  return plan.features.includes(feature);
}

/** ¿El plan anuncia la capacidad como "Próximamente"? */
export function planHasComingSoon(plan: Plan, feature: PlanFeature): boolean {
  return plan.comingSoon.includes(feature);
}

/** ¿El plan permite usar un módulo dado? */
export function planAllowsModule(plan: Plan, moduleType: ModuleType): boolean {
  return plan.allowedModules.includes(moduleType);
}

/**
 * Módulos que este plan NO incluye (se marcan ⭐ premium en el editor).
 */
export function premiumModulesFor(plan: Plan): readonly ModuleType[] {
  return MODULE_TYPES.filter((m) => !plan.allowedModules.includes(m));
}

/**
 * Plan activo más barato cuyos módulos permitidos cubren TODOS los módulos
 * dados. Sirve para el CTA "usar este módulo requiere el plan X" al publicar.
 * Devuelve `undefined` si ningún plan los cubre.
 */
export function minimalPlanForModules(
  modules: readonly ModuleType[],
): Plan | undefined {
  return getActivePlans()
    .filter((p) => modules.every((m) => p.allowedModules.includes(m)))
    .sort((a, b) => a.priceRegular - b.priceRegular)[0];
}

/**
 * Plan activo más barato que incluye una capacidad dada. Simétrico a
 * `minimalPlanForModules`; sirve para el CTA "esta temática requiere el plan X"
 * al publicar un theme pack premium. Devuelve `undefined` si ningún plan la
 * ofrece.
 */
export function minimalPlanForFeature(feature: PlanFeature): Plan | undefined {
  return getActivePlans()
    .filter((p) => p.features.includes(feature))
    .sort((a, b) => a.priceRegular - b.priceRegular)[0];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calcula la fecha de expiración de una invitación publicada según su plan.
 *
 * Regla (aprobada): la invitación vive hasta `eventDate + graceDaysAfterEvent`.
 * Si no hay fecha de evento, se usa `publishedAt + fallbackDurationDays`. Free
 * expira a `publishedAt + publishTrialDays` (demo), ignorando la fecha de
 * evento.
 *
 * Pura y testeable: no lee el reloj. La consume el enforcement de entitlements
 * (Subfase 8.4).
 */
export function resolveExpiry(
  plan: Plan,
  publishedAt: Date,
  eventDate: Date | null,
): Date {
  const fromPublish = () =>
    new Date(publishedAt.getTime() + plan.fallbackDurationDays * MS_PER_DAY);

  // Free: siempre demo desde la publicación.
  if (plan.billingType === "free" || plan.graceDaysAfterEvent === null) {
    return fromPublish();
  }
  // Pagado con fecha de evento: evento + margen.
  if (eventDate) {
    return new Date(eventDate.getTime() + plan.graceDaysAfterEvent * MS_PER_DAY);
  }
  // Pagado sin fecha de evento: fallback desde publicación.
  return fromPublish();
}
