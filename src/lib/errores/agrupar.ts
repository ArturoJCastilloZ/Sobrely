import type { OrigenError, Severidad } from "./regla";

/** Una fila de `error_events` tal como la lee la vista. */
export type FilaError = {
  created_at: string;
  origen: OrigenError;
  severidad: Severidad;
  huella: string;
  mensaje: string;
  contexto: Record<string, unknown>;
  alertado_en: string | null;
};

export type GrupoError = {
  huella: string;
  origen: OrigenError;
  severidad: Severidad;
  mensaje: string;
  veces: number;
  primera: string;
  ultima: string;
  alertado: boolean;
  /** Ids de orden/invitación del último evento, para ir a investigar. */
  contexto: Record<string, unknown>;
};

/**
 * Junta las repeticiones de la misma causa (misma huella). Primero los críticos,
 * luego los más recientes. Si una causa tuvo alguna vez severidad crítica, el
 * grupo es crítico.
 */
export function agruparErrores(filas: FilaError[]): GrupoError[] {
  const grupos = new Map<string, GrupoError>();
  for (const f of filas) {
    const g = grupos.get(f.huella);
    if (!g) {
      grupos.set(f.huella, {
        huella: f.huella,
        origen: f.origen,
        severidad: f.severidad,
        mensaje: f.mensaje,
        veces: 1,
        primera: f.created_at,
        ultima: f.created_at,
        alertado: f.alertado_en !== null,
        contexto: f.contexto,
      });
      continue;
    }
    g.veces += 1;
    if (f.severidad === "critico") g.severidad = "critico";
    if (f.alertado_en !== null) g.alertado = true;
    if (f.created_at < g.primera) g.primera = f.created_at;
    if (f.created_at > g.ultima) {
      g.ultima = f.created_at;
      g.mensaje = f.mensaje;
      g.contexto = f.contexto;
    }
  }
  return [...grupos.values()].sort((a, b) => {
    if (a.severidad !== b.severidad) return a.severidad === "critico" ? -1 : 1;
    return b.ultima.localeCompare(a.ultima);
  });
}
