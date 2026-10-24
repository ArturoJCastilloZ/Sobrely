import type { Metadata } from "next";
import { EventLandingPage } from "@/components/seo/event-landing";
import { EVENT_LANDINGS } from "@/lib/seo/event-landings";
import { metadatosSociales } from "@/lib/seo/social";

const data = EVENT_LANDINGS.corporativas;

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
