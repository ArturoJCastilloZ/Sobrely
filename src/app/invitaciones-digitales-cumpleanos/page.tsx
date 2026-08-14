import type { Metadata } from "next";
import { EventLandingPage } from "@/components/seo/event-landing";
import { EVENT_LANDINGS } from "@/lib/seo/event-landings";

const data = EVENT_LANDINGS.cumpleanos;

export const metadata: Metadata = {
  title: { absolute: data.metaTitle },
  description: data.metaDescription,
  alternates: { canonical: `/${data.slug}` },
  openGraph: { title: data.metaTitle, description: data.metaDescription },
};

export default function Page() {
  return <EventLandingPage data={data} />;
}
