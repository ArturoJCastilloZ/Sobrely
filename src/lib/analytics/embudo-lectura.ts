import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { EVENTOS_EMBUDO, type EventoEmbudo } from "./embudo-regla";

/**
 * Lectura del embudo para `/admin/embudo`. Solo la llama una página que ya pasó
 * por `requireAdmin()`: `funnel_events` solo la lee `service_role`.
 */
export async function leerEmbudo(dias: number): Promise<{
  conteos: Partial<Record<EventoEmbudo, number>>;
  plantillas: { template_slug?: unknown }[];
  paymentFailed: number;
}> {
  const admin = createAdminClient();
  const desde = dias > 0 ? new Date(Date.now() - dias * 86_400_000).toISOString() : null;

  const conteos: Partial<Record<EventoEmbudo, number>> = {};
  await Promise.all(
    EVENTOS_EMBUDO.map(async (evento) => {
      let q = admin
        .from("funnel_events")
        .select("id", { count: "exact", head: true })
        .eq("event", evento);
      if (desde) q = q.gte("created_at", desde);
      const { count } = await q;
      conteos[evento] = count ?? 0;
    }),
  );

  let qp = admin
    .from("funnel_events")
    .select("params")
    .eq("event", "view_template")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (desde) qp = qp.gte("created_at", desde);
  const { data } = await qp;
  const plantillas = ((data ?? []) as { params: { template_slug?: unknown } }[]).map((f) => f.params);

  return { conteos, plantillas, paymentFailed: conteos.payment_failed ?? 0 };
}
