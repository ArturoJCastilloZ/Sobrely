import {
  decidirTraspaso,
  type EstadoDeUsuario,
} from "@/lib/auth/traspaso-regla";

/**
 * Ejecuta el traslado de borradores de una sesión anónima a una cuenta, con sus
 * dependencias INYECTADAS: la lógica (orden de pasos, qué pasa si algo falla) se prueba
 * sin base de datos, y `traspaso.ts` la conecta a Supabase con el cliente de servicio.
 *
 * Orden y por qué:
 *   1. Se decide con `decidirTraspaso` (¿la pareja origen/destino es válida?).
 *   2. Se CUENTAN las invitaciones del origen.
 *   3. Se mueven (`user_id` del origen al destino).
 *   4. SOLO si se movieron TODAS, se borra al usuario anónimo. Borrar antes, o con un
 *      conteo distinto, arrastraría en cascada (todas las claves foráneas a
 *      `auth.users` son `ON DELETE CASCADE`) lo que no se movió: el borrador que se
 *      quería salvar. Si no cuadra, el anónimo se deja y la limpieza periódica lo verá.
 *
 * Nunca lanza. Un fallo aquí no debe impedir que alguien inicie sesión: se devuelve un
 * motivo y el borrador queda donde estaba.
 */
export type DepsTraspaso = {
  leerUsuario(id: string): Promise<EstadoDeUsuario>;
  contarInvitaciones(usuarioId: string): Promise<number>;
  /** Devuelve cuántas filas se movieron. */
  moverInvitaciones(origenId: string, destinoId: string): Promise<number>;
  borrarUsuario(id: string): Promise<boolean>;
};

export type ResultadoDeTraspaso = {
  trasladadas: number;
  /** El anónimo se borró después de mover todo. */
  anonimoBorrado: boolean;
  /** Por qué NO se trasladó (o se trasladó a medias). Ausente si todo salió bien. */
  motivo?: string;
};

export async function ejecutarTraspaso(
  deps: DepsTraspaso,
  e: { origenId: string | null; destinoId: string },
): Promise<ResultadoDeTraspaso> {
  try {
    const [origen, destino] =
      e.origenId && e.origenId !== e.destinoId
        ? await Promise.all([deps.leerUsuario(e.origenId), deps.leerUsuario(e.destinoId)])
        : [null, null];

    const decision = decidirTraspaso({
      origenId: e.origenId,
      destinoId: e.destinoId,
      origen,
      destino,
    });
    if (!decision.trasladar) {
      return { trasladadas: 0, anonimoBorrado: false, motivo: decision.motivo };
    }
    const origenId = e.origenId as string;

    const antes = await deps.contarInvitaciones(origenId);
    const movidas = antes > 0 ? await deps.moverInvitaciones(origenId, e.destinoId) : 0;

    if (movidas !== antes) {
      // No se borra: lo que no se movió se perdería en cascada.
      return { trasladadas: movidas, anonimoBorrado: false, motivo: "traslado_incompleto" };
    }

    const anonimoBorrado = await deps.borrarUsuario(origenId);
    return { trasladadas: movidas, anonimoBorrado };
  } catch {
    // Sin detalle: el mensaje de una base puede traer fragmentos de datos.
    return { trasladadas: 0, anonimoBorrado: false, motivo: "error" };
  }
}
