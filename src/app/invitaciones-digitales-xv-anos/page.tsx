import type { Metadata } from "next";
import { EventLandingPage } from "@/components/seo/event-landing";
import { EVENT_LANDINGS } from "@/lib/seo/event-landings";
import { metadatosSociales } from "@/lib/seo/social";

const data = EVENT_LANDINGS["xv-anos"];

/**
 * ISR cada 15 min. La landing pinta plantillas reales y su precio, que se
 * calcula con la hora del render: al terminar la oferta de lanzamiento el
 * precio viejo puede seguir hasta 15 min (más la visita que dispara la
 * regeneración). Ver `src/lib/seo/landings-estaticas.test.ts`.
 */
export const revalidate = 900;

export const metadata: Metadata = {
  title: { absolute: data.metaTitle },
  description: data.metaDescription,
  alternates: { canonical: `/${data.slug}` },
  ...metadatosSociales({
    titulo: data.metaTitle,
    descripcion: data.metaDescription,
    ruta: `/${data.slug}`,
  }),
};

export default function Page() {
  return <EventLandingPage data={data} />;
}
