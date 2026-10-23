import { bloquePorId } from "./bloques";
import type { ModuleType } from "@/lib/modules/types";

/** Una capa del riel, derivada de un ancla que el lienzo emitió de verdad. */
export type CapaRenderizada = { id: string; etiqueta: string };

/**
 * Convierte las anclas del DOM en capas navegables.
 *
 * Nunca recorre `bloquesDe()` para construir el árbol: esa tabla enumera lo
 * que un módulo PODRÍA emitir, mientras el DOM dice qué bloques existen en la
 * invitación abierta. Por eso un bloque condicional ausente no aparece como
 * una capa seleccionable que el usuario no puede encontrar en el lienzo.
 */
export function capasDeAnclas(
  moduleType: ModuleType,
  anclas: Iterable<string>,
): CapaRenderizada[] {
  const capas: CapaRenderizada[] = [];
  for (const id of anclas) {
    const bloque = bloquePorId(moduleType, id);
    if (bloque) capas.push({ id: bloque.id, etiqueta: bloque.etiqueta });
  }
  return capas;
}
