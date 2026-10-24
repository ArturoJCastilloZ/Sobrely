import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { esAnonimo } from "@/lib/auth/sesion";
import {
  ejecutarTraspaso,
  type DepsTraspaso,
  type ResultadoDeTraspaso,
} from "@/lib/auth/traspaso-ejecucion";

/**
 * Conecta `ejecutarTraspaso` a Supabase con el cliente de SERVICIO. Solo lo llaman el
 * servidor, justo después de que alguien inicia sesión (ver `login` y el callback), y
 * SIEMPRE con ids que el servidor leyó, nunca con uno que mande el cliente.
 */
function depsConAdmin(): DepsTraspaso {
  const admin = createAdminClient();
  return {
    async leerUsuario(id) {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error || !data.user) return { existe: false, esAnonimo: false };
      return { existe: true, esAnonimo: esAnonimo(data.user) };
    },
    async contarInvitaciones(usuarioId) {
      const { count, error } = await admin
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", usuarioId);
      if (error) throw new Error("conteo");
      return count ?? 0;
    },
    async moverInvitaciones(origenId, destinoId) {
      const { data, error } = await admin
        .from("invitations")
        .update({ user_id: destinoId })
        .eq("user_id", origenId)
        .select("id");
      if (error) throw new Error("mover");
      // 0 filas no es un error de PostgREST: el llamador compara con el conteo previo.
      return data?.length ?? 0;
    },
    async borrarUsuario(id) {
      const { error } = await admin.auth.admin.deleteUser(id);
      return !error;
    },
  };
}

/**
 * Traslada los borradores de la sesión anónima `origenId` a la cuenta `destinoId`.
 * No lanza nunca; en caso de fallo deja el borrador donde estaba y lo registra sin PII.
 */
export async function trasladarBorradores(
  origenId: string | null,
  destinoId: string,
): Promise<ResultadoDeTraspaso> {
  const r = await ejecutarTraspaso(depsConAdmin(), { origenId, destinoId });
  // `sin_origen` y `mismo_usuario` son lo normal (la mayoría de los inicios de sesión
  // no vienen de una sesión anónima): no se registran.
  if (r.motivo && r.motivo !== "sin_origen" && r.motivo !== "mismo_usuario") {
    console.error("[traspaso] no se trasladó:", { motivo: r.motivo, origenId, destinoId });
  }
  return r;
}

/**
 * Lee, ANTES de que una operación de autenticación reemplace la sesión, si la actual es
 * anónima y de quién. Devuelve su id o `null`. Se llama con el cliente de la petición:
 * `getUser()` valida el token contra Supabase (no confía en la cookie a ciegas).
 */
export async function leerSesionAnonimaActual(
  supabase: Pick<SupabaseClient, "auth">,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && esAnonimo(user) ? user.id : null;
}
