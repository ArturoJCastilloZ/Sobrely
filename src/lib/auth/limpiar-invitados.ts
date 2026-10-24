/**
 * Limpieza de sesiones de invitado abandonadas. Supabase NO borra solo a los usuarios
 * anónimos, y cada «Usar esta plantilla» crea uno. Con dependencias inyectadas para
 * probar la regla sin base de datos.
 *
 * Qué se borra: un invitado SIN actividad en `diasInactividad` días y SIN nada que
 * proteger (ninguna invitación publicada, ninguna orden). Si dudamos, no se borra:
 * un error de «protegido» deja basura, un error de «borrable» pierde el trabajo de alguien.
 */
export type Candidato = { id: string; ultimaActividad: string };

export type DepsLimpieza = {
  /** Invitados anónimos cuya última actividad es anterior a `corteISO`, hasta `limite`. */
  candidatos(corteISO: string, limite: number): Promise<Candidato[]>;
  /** ¿Tiene publicaciones u órdenes? Ante un error debe lanzar (→ se omite). */
  tieneAlgoQueProteger(usuarioId: string): Promise<boolean>;
  /** Borra sus archivos de almacenamiento y luego al usuario (cascada a lo demás). */
  borrar(usuarioId: string): Promise<boolean>;
};

export type ResumenLimpieza = {
  dryRun: boolean;
  revisados: number;
  borrados: number;
  protegidos: number;
  errores: number;
  /** Ids (UUID, sin datos personales) que se borrarían o se borraron. */
  ids: string[];
};

export const DIAS_INACTIVIDAD_POR_DEFECTO = 30;
export const LIMITE_POR_CORRIDA = 50;

export async function limpiarInvitados(
  deps: DepsLimpieza,
  o: { ahora: Date; dryRun: boolean; diasInactividad?: number; limite?: number },
): Promise<ResumenLimpieza> {
  const dias = o.diasInactividad ?? DIAS_INACTIVIDAD_POR_DEFECTO;
  const limite = Math.min(o.limite ?? LIMITE_POR_CORRIDA, LIMITE_POR_CORRIDA);
  const corte = new Date(o.ahora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();

  const resumen: ResumenLimpieza = {
    dryRun: o.dryRun,
    revisados: 0,
    borrados: 0,
    protegidos: 0,
    errores: 0,
    ids: [],
  };

  const lista = await deps.candidatos(corte, limite);
  for (const c of lista.slice(0, limite)) {
    resumen.revisados += 1;
    // Defensa extra: el adaptador ya filtra por fecha, aquí no se confía en eso.
    if (!(c.ultimaActividad < corte)) {
      resumen.protegidos += 1;
      continue;
    }
    try {
      if (await deps.tieneAlgoQueProteger(c.id)) {
        resumen.protegidos += 1;
        continue;
      }
      if (o.dryRun) {
        resumen.ids.push(c.id);
        continue;
      }
      if (await deps.borrar(c.id)) {
        resumen.borrados += 1;
        resumen.ids.push(c.id);
      } else {
        resumen.errores += 1;
      }
    } catch {
      resumen.errores += 1;
    }
  }
  return resumen;
}
