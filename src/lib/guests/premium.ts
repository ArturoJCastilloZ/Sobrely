import { minimalPlanForFeature } from "@/lib/billing/plans";

/**
 * La lista de invitados nominales (link único y QR de acceso) es solo de
 * Premium: decisión del dueño del 2026-10-30, «Solo Premium».
 *
 * El nombre del plan y el enlace de compra se DERIVAN de `plans.ts` (la misma
 * fuente que gatea en el servidor), igual que `FeatureBadge`: si la feature
 * cambia de plan, el mensaje y el enlace cambian solos.
 *
 * Pura y sin "use server": la usan las server actions y los componentes.
 */

const PLAN_DE_LA_LISTA = minimalPlanForFeature("guest_management");

/** Nombre del plan que desbloquea la lista («Premium»). */
export const PLAN_LISTA_DE_INVITADOS = PLAN_DE_LA_LISTA?.name ?? "Premium";

/** Mensaje de las acciones rechazadas por plan. */
export const ERROR_LISTA_REQUIERE_PREMIUM = `La lista de invitados con link y QR de acceso es del plan ${PLAN_LISTA_DE_INVITADOS}. Mejora el plan de esta invitación para usarla.`;

/** Checkout del plan que desbloquea la lista, ya amarrado a ESTA invitación. */
export function enlaceMejorarParaLista(invitationId: string): string {
  const plan = PLAN_DE_LA_LISTA?.code ?? "premium";
  return `/billing/checkout?plan=${plan}&invitation=${encodeURIComponent(invitationId)}`;
}
