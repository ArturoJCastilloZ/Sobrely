import type { ModuleType } from "@/lib/modules/types";
import type { Plan } from "@/lib/billing/types";
import {
  getActivePlans,
  getEffectivePrice,
  isOnLaunchOffer,
} from "@/lib/billing/plans";
import { isThemePackPremium } from "@/lib/theme/theme-packs";

/**
 * ¿Cuánto cuesta PUBLICAR esta plantilla tal como viene?
 *
 * Existe porque un «desde $199» único en la galería sería falso para casi la
 * mitad del catálogo. Medido contra la BD real (65 plantillas activas), por
 * módulos solamente: 35 caben en Esencial, 20 exigen Celebración y 10 exigen
 * Premium. El visitante que elige una plantilla de $699 viendo «desde $199» se
 * entera del precio después de invertir su tiempo, y eso es lo que más abandono
 * causa en un checkout (Baymard: costos inesperados, 39%).
 *
 * Replica EL MISMO criterio que `canPublishInvitation` (entitlements.ts):
 *   - módulos visibles ⊆ módulos del plan,
 *   - un theme pack premium exige `advanced_personalization`.
 * El tercer gate de ese archivo, arte PROPIO, no entra: el arte de las
 * plantillas lo sirve la app (`esArteDeLaApp`) y no cobra nada.
 *
 * Solo considera planes de pago por evento: el plan Free no publica (la demo
 * se quita en la Fase 3), así que «el más barato que cubre los módulos» no
 * puede ser Free aunque sus módulos alcancen.
 *
 * Es una función pura y no vive en el componente para poder demostrarla con
 * pruebas; la suite solo recoge `*.test.ts`.
 */
export type PrecioPlantilla = {
  planCode: Plan["code"];
  planName: string;
  /** Precio efectivo hoy (campaña de lanzamiento incluida). */
  precio: number;
  /** Precio regular cuando la oferta de lanzamiento aplica; si no, `null`. */
  precioRegular: number | null;
};

export function precioParaPublicarPlantilla(
  modulosVisibles: readonly ModuleType[],
  themePack?: string,
  ahora: Date = new Date(),
): PrecioPlantilla | null {
  const exigeAvanzada = isThemePackPremium(themePack);
  const plan = getActivePlans()
    .filter((p) => p.billingType === "per_event")
    .filter((p) => modulosVisibles.every((m) => p.allowedModules.includes(m)))
    .filter(
      (p) => !exigeAvanzada || p.features.includes("advanced_personalization"),
    )
    // Mismo criterio de orden que `minimalPlanForModules`.
    .sort((a, b) => a.priceRegular - b.priceRegular)[0];

  if (!plan) return null;
  return {
    planCode: plan.code,
    planName: plan.name,
    precio: getEffectivePrice(plan, ahora),
    precioRegular: isOnLaunchOffer(plan, ahora) ? plan.priceRegular : null,
  };
}
