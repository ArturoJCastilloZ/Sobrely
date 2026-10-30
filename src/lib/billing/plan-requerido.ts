import type { ModuleType } from "@/lib/modules/types";
import type { Plan } from "@/lib/billing/types";
import { getActivePlans } from "@/lib/billing/plans";
import { isThemePackPremium } from "@/lib/theme/theme-packs";

/**
 * ¿Qué plan de PAGO exige este contenido para publicarse?
 *
 * Es la ÚNICA definición. La consumen tres sitios que antes podían divergir:
 *   - el precio que enseña la galería pública (`precio-plantilla.ts`),
 *   - el plan que `setPublished` pide cuando no hay entitlement,
 *   - la validación de `createPlanCheckout` (no cobrar un plan que no sirve).
 * El archivo de entitlements ya advertía el riesgo: duplicar esta regla fue lo
 * que hizo que la invitación de un admin se publicara con branding Free.
 *
 * Criterio, el MISMO de `canPublishInvitation`:
 *   - módulos visibles ⊆ módulos del plan,
 *   - un theme pack premium exige `advanced_personalization`,
 *   - arte PROPIO (subido por el usuario) exige `custom_art`. El arte que sirve
 *     la app —el de las plantillas— no cuenta (`esArteDeLaApp`), y quien llama
 *     decide qué es arte propio.
 *   - el modo lista de invitados (link único y QR por invitado) exige
 *     `guest_management`, que solo trae Premium.
 *
 * Solo planes de pago por evento: sin demo (Fase 3), el plan Free no publica,
 * así que «el más barato que cubre los módulos» no puede ser Free aunque sus
 * módulos alcancen.
 *
 * Pura, sin reloj ni base de datos: se puede demostrar con pruebas.
 */
export type ContenidoPublicable = {
  modulosVisibles: readonly ModuleType[];
  themePack?: string;
  /** Fondo, stickers, decoración o imagen de sección SUBIDOS por el usuario. */
  usaArtePropio: boolean;
  /**
   * `rsvp_mode = 'guest_list'`. Opcional porque la galería de plantillas no
   * tiene modo de confirmación: ausente cuenta como confirmación abierta.
   */
  usaListaDeInvitados?: boolean;
};

export function planCubreContenido(plan: Plan, c: ContenidoPublicable): boolean {
  if (!c.modulosVisibles.every((m) => plan.allowedModules.includes(m))) return false;
  if (isThemePackPremium(c.themePack) && !plan.features.includes("advanced_personalization")) {
    return false;
  }
  if (c.usaArtePropio && !plan.features.includes("custom_art")) return false;
  if (c.usaListaDeInvitados && !plan.features.includes("guest_management")) {
    return false;
  }
  return true;
}

/** El plan de pago más barato que cubre TODO el contenido, o `undefined` si ninguno. */
export function planDePagoRequerido(c: ContenidoPublicable): Plan | undefined {
  return (
    getActivePlans()
      .filter((p) => p.billingType === "per_event")
      .filter((p) => planCubreContenido(p, c))
      // Mismo criterio de orden que `minimalPlanForModules`.
      .sort((a, b) => a.priceRegular - b.priceRegular)[0]
  );
}
