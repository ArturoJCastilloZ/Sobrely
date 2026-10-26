import { createAdminClient } from "@/lib/supabase/admin";
import { registrarEvento } from "@/lib/analytics/embudo";
import {
  TAMANO_MAXIMO_CUERPO,
  claveVisita,
  esBot,
  mismoOrigen,
  parsearVisita,
  superaTope,
} from "@/lib/analytics/visita-regla";

/**
 * Visitas del embudo (T05): `view_category`, `view_template` y `view_pricing`.
 *
 * Las manda el navegador, así que se tratan como entrada hostil: mismo origen,
 * cuerpo pequeño, forma validada, rastreadores descartados y un tope global por
 * minuto. Lo que se guarda NO es lo que dice el cliente: la plantilla y el tipo
 * de evento se comprueban contra la base y de ahí salen los parámetros.
 *
 * Responde 204 tanto si cuenta como si se descarta (bot, tope, valor
 * inexistente): quien llama no necesita saberlo ni sirve para sondear.
 */
export const dynamic = "force-dynamic";

const sinContenido = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  if (!mismoOrigen(request.headers.get("origin"), request.headers.get("host"))) {
    return new Response(null, { status: 403 });
  }
  if (esBot(request.headers.get("user-agent"))) return sinContenido();

  const texto = await request.text();
  if (texto.length === 0 || texto.length > TAMANO_MAXIMO_CUERPO) {
    return new Response(null, { status: 400 });
  }
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }
  const visita = parsearVisita(crudo);
  if (!visita) return new Response(null, { status: 400 });

  try {
    const admin = createAdminClient();

    const haceUnMinuto = new Date(Date.now() - 60_000).toISOString();
    const { count } = await admin
      .from("funnel_events")
      .select("id", { count: "exact", head: true })
      .eq("event", visita.evento)
      .gte("created_at", haceUnMinuto);
    if (superaTope(count ?? 0)) return sinContenido();

    let parametros: Record<string, string> | null = null;
    if (visita.evento === "view_template" || visita.evento === "quick_view_open") {
      const { data } = await admin
        .from("templates")
        .select("slug, event_type")
        .eq("slug", visita.valor)
        .eq("is_active", true)
        .maybeSingle();
      if (data) {
        parametros = {
          template_slug: data.slug as string,
          ...(data.event_type ? { event_type: data.event_type as string } : {}),
        };
      }
    } else if (visita.evento === "view_category") {
      const { data } = await admin
        .from("templates")
        .select("event_type")
        .eq("event_type", visita.valor)
        .eq("is_active", true)
        .limit(1);
      if (data && data.length > 0) parametros = { event_type: visita.valor };
    } else {
      // view_pricing: de dónde viene la visita; solo orígenes conocidos.
      if (visita.valor === "pagina" || visita.valor === "editor") {
        parametros = { from: visita.valor };
      }
    }

    if (parametros) {
      await registrarEvento(visita.evento, `${visita.evento}:${claveVisita(visita)}`, parametros);
    }
  } catch (e) {
    console.error("[embudo] visita no registrada", e instanceof Error ? e.message : e);
  }
  return sinContenido();
}
