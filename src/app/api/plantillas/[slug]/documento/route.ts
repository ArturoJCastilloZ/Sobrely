import { createClient } from "@/lib/supabase/server";
import { invitacionDePlantilla } from "@/lib/invitations/plantilla-publica";

/**
 * El documento de escaparate de una plantilla, para la vista rápida del catálogo (modal con
 * nombres). Es lo mismo que pinta `/plantilla/<slug>`: la galería no manda las 65
 * configuraciones al navegador, la vista rápida pide solo la que se abre.
 *
 * Público a propósito: las plantillas activas son de lectura pública por RLS, no se lee nada
 * de la sesión y no hay datos de personas.
 */
const SLUG = /^[a-z0-9-]{1,80}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!SLUG.test(slug)) return new Response(null, { status: 404 });

  const supabase = await createClient();
  const { data: template } = await supabase
    .from("templates")
    .select("name, event_type, theme_config, modules_config")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!template) return new Response(null, { status: 404 });

  return Response.json(invitacionDePlantilla(template, slug), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
