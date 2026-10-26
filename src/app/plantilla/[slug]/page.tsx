import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { invitacionDePlantilla } from "@/lib/invitations/plantilla-publica";
import { PublicInvitationView } from "@/components/public/public-invitation";

/**
 * Vista pública de una plantilla, y superficie de captura de sus miniaturas
 * (Fase 4). Renderiza contra el MISMO componente que la invitación publicada,
 * `PublicInvitationView`, y con la MISMA normalización que usa
 * `createFromTemplate` — así la miniatura no puede mostrar algo distinto de lo
 * que el usuario recibe al elegir la plantilla.
 *
 * `plantilla` está en `RESERVED_SLUGS`: en Next el segmento literal gana al
 * dinámico, así que sin reservarlo alguien podría pedir esa vanity y quedarse
 * con una URL que choca con esta ruta.
 */
export const metadata: Metadata = {
  title: "Vista de plantilla",
  // No se indexa: son 50 páginas de contenido casi idéntico entre sí y a las
  // invitaciones reales. Indexarlas competiría con las landings de SEO.
  robots: { index: false, follow: false },
};

export default async function PlantillaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  // Las plantillas activas son de lectura pública por RLS: no hace falta
  // sesión ni llave de servicio, y por eso el script de captura no necesita
  // credenciales de escritura.
  const { data: template } = await supabase
    .from("templates")
    .select("name, event_type, theme_config, modules_config")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!template) notFound();

  const invitation = invitacionDePlantilla(template, slug);

  return <PublicInvitationView invitation={invitation} />;
}
