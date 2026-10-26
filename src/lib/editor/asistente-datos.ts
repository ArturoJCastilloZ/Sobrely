import type { EditorModule } from "@/lib/invitations/editor-types";
import { ranuraDeNombres, limpiarNombres, limpiarFecha, fechaAEventDate } from "@/lib/templates/datos-iniciales";
import type { PortadaBase } from "@/lib/analytics/borrador-completo";

/**
 * Lo que el asistente inicial lee y escribe SOBRE EL MISMO DOCUMENTO del editor. Son funciones
 * puras que devuelven la acción a despachar; el asistente no guarda ningún estado propio del
 * documento (docs/auditoria-2026-10/14: «una capa guiada, no un segundo editor»).
 */
export type Accion =
  | { type: "updateConfig"; id: string; patch: Record<string, unknown> }
  | { type: "updateSettings"; patch: { title?: string; event_date?: string } };

function portada(modulos: readonly EditorModule[]) {
  return modulos.find((m) => m.module_type === "hero");
}

function lugar(modulos: readonly EditorModule[]) {
  return modulos.find((m) => m.module_type === "map");
}

/**
 * La ranura de los nombres se decide con la portada de la PLANTILLA, no con la actual: con la
 * actual, al borrar «Ana & Carlos» y escribir «Sofía» el título dejaría de parecer nombres y la
 * siguiente letra caería en el subtítulo.
 */
export function ranuraFija(base: PortadaBase | null, actual: EditorModule | undefined) {
  const cfg = actual?.config ?? {};
  return ranuraDeNombres(
    base ?? {
      title: typeof cfg.title === "string" ? cfg.title : "",
      subtitle: typeof cfg.subtitle === "string" ? cfg.subtitle : "",
    },
  );
}

/** Lo que hoy dice el campo de nombres de la portada. */
export function nombresActuales(modulos: readonly EditorModule[], base: PortadaBase | null): string {
  const h = portada(modulos);
  if (!h) return "";
  const campo = ranuraFija(base, h);
  const valor = h.config[campo];
  const texto = typeof valor === "string" ? valor : "";
  // Si todavía es el texto de ejemplo de la plantilla, el campo se muestra vacío.
  return base && texto.trim() === (base[campo] ?? "").trim() ? "" : texto;
}

export function accionNombres(
  modulos: readonly EditorModule[],
  base: PortadaBase | null,
  crudo: string,
): Accion[] {
  const h = portada(modulos);
  if (!h) return [];
  const nombres = limpiarNombres(crudo);
  const campo = ranuraFija(base, h);
  // Sin nombres, vuelve al texto de la plantilla en vez de dejar la portada vacía.
  const valor = nombres || (base?.[campo] ?? "");
  const acciones: Accion[] = [{ type: "updateConfig", id: h.id, patch: { [campo]: valor } }];
  if (nombres) acciones.push({ type: "updateSettings", patch: { title: nombres } });
  return acciones;
}

export function accionFecha(crudo: string): Accion {
  return { type: "updateSettings", patch: { event_date: fechaAEventDate(limpiarFecha(crudo)) } };
}

export function fechaParaInput(eventDate: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(eventDate) ? eventDate.slice(0, 10) : "";
}

export function lugarActual(modulos: readonly EditorModule[]): { nombre: string; direccion: string } | null {
  const m = lugar(modulos);
  if (!m) return null;
  const s = (k: string) => (typeof m.config[k] === "string" ? (m.config[k] as string) : "");
  return { nombre: s("venueName"), direccion: s("address") };
}

export function accionLugar(
  modulos: readonly EditorModule[],
  campo: "venueName" | "address",
  valor: string,
): Accion[] {
  const m = lugar(modulos);
  if (!m) return [];
  return [{ type: "updateConfig", id: m.id, patch: { [campo]: valor.slice(0, campo === "venueName" ? 160 : 300) } }];
}

export function fotoActual(modulos: readonly EditorModule[]): { id: string; url: string } | null {
  const h = portada(modulos);
  if (!h) return null;
  return { id: h.id, url: typeof h.config.imageUrl === "string" ? h.config.imageUrl : "" };
}
