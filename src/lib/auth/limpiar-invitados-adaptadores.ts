import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DepsLimpieza } from "@/lib/auth/limpiar-invitados";

const BUCKET = "invitation-images";
const POR_PAGINA = 1000;
const MAX_PAGINAS = 5;

/** Conecta la limpieza a Supabase con el cliente de servicio (solo lo llama el cron). */
export function crearDepsLimpieza(): DepsLimpieza {
  const admin = createAdminClient();
  return {
    async candidatos(corteISO, limite) {
      const out: { id: string; ultimaActividad: string }[] = [];
      for (let page = 1; page <= MAX_PAGINAS && out.length < limite; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: POR_PAGINA });
        if (error) throw new Error("listar");
        for (const u of data.users) {
          if (u.is_anonymous !== true) continue;
          const actividad = u.last_sign_in_at ?? u.created_at;
          if (actividad < corteISO) out.push({ id: u.id, ultimaActividad: actividad });
          if (out.length >= limite) break;
        }
        if (data.users.length < POR_PAGINA) break;
      }
      return out;
    },

    async tieneAlgoQueProteger(usuarioId) {
      const [publicadas, ordenes] = await Promise.all([
        admin
          .from("invitations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", usuarioId)
          .eq("is_published", true),
        admin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", usuarioId),
      ]);
      if (publicadas.error || ordenes.error) throw new Error("consulta");
      return (publicadas.count ?? 0) > 0 || (ordenes.count ?? 0) > 0;
    },

    async borrar(usuarioId) {
      // Archivos primero: la cascada de la base no toca el almacenamiento.
      const { data: archivos, error: errLista } = await admin.storage
        .from(BUCKET)
        .list(usuarioId, { limit: 1000 });
      if (errLista) return false;
      const rutas = (archivos ?? []).map((a) => `${usuarioId}/${a.name}`);
      if (rutas.length > 0) {
        const { error: errBorrado } = await admin.storage.from(BUCKET).remove(rutas);
        if (errBorrado) return false;
      }
      const { error } = await admin.auth.admin.deleteUser(usuarioId);
      return !error;
    },
  };
}
