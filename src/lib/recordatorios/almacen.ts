import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Almacen, Candidato, ResultadoDeReclamo } from "@/lib/recordatorios/ejecutar";
import { VENTANAS, type TipoRecordatorio } from "@/lib/recordatorios/ventanas";

/**
 * `Almacen` sobre Supabase, con el cliente de servicio (las dos tablas de
 * recordatorios no tienen policies: solo el servidor las toca).
 *
 * Límites a propósito: 1,000 personas con consentimiento y 500 borradores por
 * corrida. Con la base actual sobran; si el producto crece hasta toparlos, una
 * corrida deja de ver a parte de la gente en vez de romperse, y el resumen lo
 * deja a la vista (`candidatos` siempre ≤ 500). Pasar a una consulta en SQL
 * cuando eso importe.
 */
const MAX_PERSONAS = 1000;
const DIA = 24 * 60 * 60 * 1000;

export function crearAlmacenSupabase(): Almacen {
  const db = createAdminClient();

  return {
    async candidatos(ahora: Date, limite: number): Promise<Candidato[]> {
      const { data: prefs, error: ePrefs } = await db
        .from("reminder_preferences")
        .select("user_id")
        .eq("opted_in", true)
        .limit(MAX_PERSONAS);
      if (ePrefs) throw new Error("No se pudieron leer las preferencias de recordatorios.");
      const personas = (prefs ?? []).map((p) => p.user_id as string);
      if (personas.length === 0) return [];

      const desde = new Date(ahora.getTime() - VENTANAS.borradorHasta).toISOString();
      const ahoraIso = ahora.toISOString();
      const hasta = new Date(ahora.getTime() + VENTANAS.eventoDentroDe).toISOString();

      const { data, error } = await db
        .from("invitations")
        .select("id, user_id, title, updated_at, event_date")
        .in("user_id", personas)
        .eq("is_published", false)
        .or(
          `updated_at.gte.${desde},and(event_date.gt.${ahoraIso},event_date.lte.${hasta})`,
        )
        .order("updated_at", { ascending: false })
        .limit(limite);
      if (error) throw new Error("No se pudieron leer los borradores.");

      return (data ?? []).map((r) => ({
        invitationId: r.id as string,
        userId: r.user_id as string,
        titulo: (r.title as string | null) ?? "",
        actualizadoEn: r.updated_at as string,
        fechaEvento: (r.event_date as string | null) ?? null,
      }));
    },

    async yaEnviados(ids) {
      const mapa = new Map<string, Set<TipoRecordatorio>>();
      if (ids.length === 0) return mapa;
      const { data, error } = await db
        .from("reminder_log")
        .select("invitation_id, kind")
        .in("invitation_id", ids);
      if (error) throw new Error("No se pudo leer el registro de recordatorios.");
      for (const f of data ?? []) {
        const id = f.invitation_id as string;
        if (!mapa.has(id)) mapa.set(id, new Set());
        mapa.get(id)!.add(f.kind as TipoRecordatorio);
      }
      return mapa;
    },

    async conCorreoReciente(userIds, ahora) {
      if (userIds.length === 0) return new Set();
      const { data, error } = await db
        .from("reminder_log")
        .select("user_id")
        .in("user_id", userIds)
        .gte("sent_at", new Date(ahora.getTime() - DIA).toISOString());
      if (error) throw new Error("No se pudo leer el registro de recordatorios.");
      return new Set((data ?? []).map((f) => f.user_id as string));
    },

    async reclamar(c, tipo): Promise<ResultadoDeReclamo> {
      const { data, error } = await db
        .from("reminder_log")
        .insert({ invitation_id: c.invitationId, user_id: c.userId, kind: tipo })
        .select("id");
      // 23505 = unique_violation: otra corrida ya reclamó este (invitación, tipo).
      if (error) return error.code === "23505" ? "ya_existia" : "error";
      // Un insert que no devuelve fila no reclamó nada: no se envía a ciegas.
      return data && data.length > 0 ? "reclamado" : "error";
    },

    async soltar(invitationId, tipo) {
      const { data: borradas, error } = await db
        .from("reminder_log")
        .delete()
        .eq("invitation_id", invitationId)
        .eq("kind", tipo)
        .select("id");
      // Cero filas borradas no es éxito: el reclamo seguiría ahí y bloquearía el
      // reintento. `sinSoltar` en el resumen lo hace visible.
      if (error || !borradas) return false;
      return borradas.length > 0;
    },

    async correoDe(userId) {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error) return null;
      return data.user?.email ?? null;
    },
  };
}
