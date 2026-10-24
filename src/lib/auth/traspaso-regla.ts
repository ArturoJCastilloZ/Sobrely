/**
 * La regla de cuándo se pueden TRASLADAR los borradores de una sesión anónima a una
 * cuenta existente. PURA (sin base de datos), y por eso probada a fondo: es la pieza
 * donde un error mueve datos de una persona a otra.
 *
 * Contexto. Un invitado edita; luego inicia sesión en una cuenta que YA tenía. Ese inicio
 * de sesión reemplaza la sesión anónima y su borrador quedaría huérfano. Se traslada.
 *
 * Quién es el origen y quién el destino NO lo decide el cliente: `origenId` sale de
 * `supabase.auth.getUser()` leído en el servidor ANTES de iniciar sesión (la cookie de
 * la sesión anónima, validada por Supabase), y `destinoId` del usuario que acaba de
 * autenticarse en esa misma petición. Esta función solo decide si la pareja es válida.
 *
 * Dos garantías que no se negocian:
 *   1. El origen DEBE ser anónimo. Nunca se mueve el contenido de una cuenta real: si
 *      por un error el origen fuera una persona registrada, se rechaza.
 *   2. El destino NO debe ser anónimo. Trasladar a otra sesión anónima no resuelve nada
 *      y abriría la puerta a mover borradores entre anónimos.
 */
export type EstadoDeUsuario = {
  existe: boolean;
  esAnonimo: boolean;
};

export type DecisionDeTraspaso =
  | { trasladar: true }
  | {
      trasladar: false;
      motivo:
        | "sin_origen"
        | "mismo_usuario"
        | "origen_inexistente"
        | "origen_no_anonimo"
        | "destino_inexistente"
        | "destino_anonimo";
    };

export function decidirTraspaso(e: {
  origenId: string | null;
  destinoId: string;
  origen: EstadoDeUsuario | null;
  destino: EstadoDeUsuario | null;
}): DecisionDeTraspaso {
  if (!e.origenId) return { trasladar: false, motivo: "sin_origen" };
  // Conversión (mismo usuario antes y después): no hay nada que trasladar.
  if (e.origenId === e.destinoId) return { trasladar: false, motivo: "mismo_usuario" };
  if (!e.origen || !e.origen.existe) return { trasladar: false, motivo: "origen_inexistente" };
  if (!e.origen.esAnonimo) return { trasladar: false, motivo: "origen_no_anonimo" };
  if (!e.destino || !e.destino.existe) return { trasladar: false, motivo: "destino_inexistente" };
  if (e.destino.esAnonimo) return { trasladar: false, motivo: "destino_anonimo" };
  return { trasladar: true };
}
