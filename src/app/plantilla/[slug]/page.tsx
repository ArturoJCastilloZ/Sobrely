import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { templateToDocument } from "@/lib/invitations/template-render";
import { PublicInvitationView } from "@/components/public/public-invitation";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import { FECHA_ESCAPARATE } from "@/lib/invitations/template-preview";

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

  const doc = templateToDocument(template);

  const invitation: PublicInvitation = {
    // Ids sintéticos: esta vista no persiste nada y los módulos interactivos
    // (RSVP, firmas) se renderizan en su forma estática, que es la que
    // corresponde a una vista previa.
    id: `plantilla-${slug}`,
    title: template.name ?? "Plantilla",
    slug,
    event_type: template.event_type ?? null,
    // Fecha FIJA de escaparate. Con `null` el contador cae a su estado vacío y
    // la miniatura sale con «Define la fecha del evento para activar la cuenta
    // regresiva» — copy dirigido al anfitrión, no arte para una galería.
    //
    // La cuenta atrás se calcula contra `now()`, así que por sí sola haría que
    // la misma plantilla diera una imagen distinta cada día. El determinismo
    // NO se arregla quitando la fecha, se arregla congelando el reloj en la
    // captura (`page.clock.setFixedTime`), que es lo que hace el script.
    event_date: FECHA_ESCAPARATE,
    theme_config: {
      ...(doc.theme as unknown as Record<string, unknown>),
      // Animaciones APAGADAS. No es estético: es lo que hace la captura
      // determinista. Medido en el editor, la entrada dura ~300 ms y arranca
      // con el módulo desplazado y en opacidad 0, así que un screenshot que
      // llegue temprano congela un fundido a medias — y con la misma
      // plantilla saldría una imagen distinta en cada corrida. Con esto,
      // `AnimatedModule` renderiza un contenedor plano siempre visible.
      animations: false,
    },
    owner_name: null,
    owner_username: "sobrely",
    // `premium` da branding "none": sin esto, las 50 miniaturas llevarían el
    // pie de "Hecho con Sobrely" quemado en la imagen.
    plan_code: "premium",
    modules: doc.modules.map((m, i) => ({
      id: `${slug}-${i}`,
      module_type: m.module_type,
      sort_order: m.sort_order,
      is_visible: m.is_visible,
      config: m.config,
    })),
  };

  return <PublicInvitationView invitation={invitation} />;
}
