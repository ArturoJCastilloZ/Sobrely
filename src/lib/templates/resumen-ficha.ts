import { MODULE_META, type ModuleType } from "@/lib/modules/types";
import { getPlan } from "@/lib/billing/plans";
import type { PlanCode } from "@/lib/billing/types";

/**
 * Lo que dice la ficha de una plantilla sobre «qué incluye» (T12).
 *
 * TODO sale de datos que ya existen y que cobran de verdad: los módulos
 * visibles de la plantilla, y el tope de invitados, la vigencia y la marca del
 * plan que `precioParaPublicarPlantilla` dice que hace falta. Nada de esto se
 * escribe a mano, así que la ficha no puede prometer algo que `plans.ts` no
 * cumple. A propósito NO dice nada del pase QR hasta que se decida en qué plan
 * va (`docs/auditoria-2026-10/01` §5).
 */
export type ResumenFicha = {
  /** Etiquetas de los módulos visibles, en el orden de la plantilla. */
  modulos: string[];
  plan: {
    code: PlanCode;
    nombre: string;
    /** «Hasta 100 invitados» / «Invitados ilimitados». */
    invitados: string;
    /** «Publicada hasta 7 días después de tu evento». */
    vigencia: string;
    /** «Sin marca de Sobrely» / «Con marca discreta de Sobrely». */
    marca: string;
  };
};

export function textoDeInvitados(maxGuests: number | null): string {
  return maxGuests === null ? "Invitados ilimitados" : `Hasta ${maxGuests} invitados`;
}

export function textoDeVigencia(graceDaysAfterEvent: number | null): string | null {
  if (graceDaysAfterEvent === null) return null;
  return `Publicada hasta ${graceDaysAfterEvent} días después de tu evento`;
}

export function textoDeMarca(branding: "full" | "reduced" | "none"): string {
  if (branding === "none") return "Sin marca de Sobrely";
  if (branding === "reduced") return "Con marca discreta de Sobrely";
  return "Con la marca de Sobrely";
}

export function resumenDeFicha(
  modulosVisibles: readonly ModuleType[],
  planCode: PlanCode,
): ResumenFicha | null {
  const plan = getPlan(planCode);
  if (!plan) return null;
  const vigencia = textoDeVigencia(plan.graceDaysAfterEvent);
  if (!vigencia) return null;
  return {
    modulos: modulosVisibles.map((m) => MODULE_META[m]?.label ?? m),
    plan: {
      code: plan.code,
      nombre: plan.name,
      invitados: textoDeInvitados(plan.maxGuests),
      vigencia,
      marca: textoDeMarca(plan.branding),
    },
  };
}
