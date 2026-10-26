import type { ModuleType } from "@/lib/modules/types";
import type { Plan } from "@/lib/billing/types";
import { getActivePlans } from "@/lib/billing/plans";

/**
 * Selector de plan de `/pricing` (propuesta Precios B): dos preguntas, un plan.
 *
 * La regla sale de `plans.ts` (invitados y módulos permitidos), la misma fuente
 * que usa el servidor para limitar lo que se publica. No hay una tabla paralela:
 * si cambia un tope o un módulo de un plan, la recomendación cambia sola, y la
 * prueba comprueba que nunca recomienda un plan que no cubre lo elegido ni uno
 * más caro de lo necesario.
 *
 * Solo recomienda planes de pago: Free no publica.
 */

/** Módulos que sirven de ejemplo de "galería, música, itinerario…". */
export const MODULOS_EXTRA: readonly ModuleType[] = [
  "gallery",
  "itinerary",
  "dresscode",
  "music",
];

export const MODULOS_VIDEO: readonly ModuleType[] = ["video"];

export type FuncionesId = "basico" | "extras" | "video";

export interface OpcionInvitados {
  id: string;
  etiqueta: string;
  /** Invitados que debe admitir el plan; `null` = sin tope. */
  necesita: number | null;
}

export interface OpcionFunciones {
  id: FuncionesId;
  etiqueta: string;
  modulos: readonly ModuleType[];
}

export const OPCIONES_FUNCIONES: readonly OpcionFunciones[] = [
  { id: "basico", etiqueta: "Lo básico", modulos: [] },
  {
    id: "extras",
    etiqueta: "Galería, música, itinerario",
    modulos: MODULOS_EXTRA,
  },
  { id: "video", etiqueta: "Video", modulos: MODULOS_VIDEO },
];

function planesDePago(): Plan[] {
  return getActivePlans()
    .filter((p) => p.billingType !== "free")
    .sort((a, b) => a.priceRegular - b.priceRegular);
}

/** Rangos de invitados, derivados de los topes reales de los planes de pago. */
export function opcionesInvitados(): OpcionInvitados[] {
  const planes = planesDePago();
  const topes = [
    ...new Set(
      planes.map((p) => p.maxGuests).filter((n): n is number => n !== null),
    ),
  ].sort((a, b) => a - b);

  const opciones: OpcionInvitados[] = topes.map((tope, i) => ({
    id: `hasta-${tope}`,
    etiqueta: i === 0 ? `Hasta ${tope}` : `${topes[i - 1] + 1} a ${tope}`,
    necesita: tope,
  }));
  if (planes.some((p) => p.maxGuests === null) && topes.length > 0) {
    opciones.push({
      id: "mas",
      etiqueta: `Más de ${topes[topes.length - 1]}`,
      necesita: null,
    });
  }
  return opciones;
}

function admite(plan: Plan, necesita: number | null): boolean {
  if (plan.maxGuests === null) return true;
  return necesita !== null && plan.maxGuests >= necesita;
}

/**
 * El plan de pago más barato que cubre invitados y funciones. `undefined` solo
 * si ningún plan lo cubre (no pasa con los planes actuales).
 */
export function recomendarPlan(
  necesita: number | null,
  modulos: readonly ModuleType[],
): Plan | undefined {
  return planesDePago().find(
    (p) =>
      admite(p, necesita) && modulos.every((m) => p.allowedModules.includes(m)),
  );
}
