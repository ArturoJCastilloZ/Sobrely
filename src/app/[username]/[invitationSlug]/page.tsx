import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { brandingForPlanCode } from "@/lib/billing/branding";

type Params = { username: string; invitationSlug: string };

/** Cached so generateMetadata and the page share a single DB round-trip. */
const loadInvitation = cache(
  async (username: string, slug: string): Promise<PublicInvitation | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_invitation", {
      p_username: username,
      p_slug: slug,
    });
    if (error || !data) return null;
    return data as PublicInvitation;
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username, invitationSlug } = await params;
  const invitation = await loadInvitation(username, invitationSlug);

  if (!invitation) {
    return { title: "Invitación no encontrada" };
  }

  const title = invitation.title || "Invitación";
  const description = invitation.event_type
    ? `${invitation.event_type} · Te invitamos`
    : "Estás invitado";

  // Sin marca: el título va absoluto para no heredar "· Sobrely" del template
  // del layout. Es la misma promesa del pie, en la pestaña del invitado.
  const branding = brandingForPlanCode(invitation.plan_code);

  return {
    title: branding === "none" ? { absolute: title } : title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicInvitationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username, invitationSlug } = await params;
  const invitation = await loadInvitation(username, invitationSlug);

  if (!invitation) notFound();

  return <PublicInvitationView invitation={invitation} />;
}
