import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GuestInvitationBundle } from "@/lib/invitations/public-types";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { brandingForPlanCode } from "@/lib/billing/branding";

type Params = { token: string };

/** Cached so metadata and the page share one DB round-trip. */
const loadGuest = cache(
  async (token: string): Promise<GuestInvitationBundle | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_guest_invitation", {
      p_token: token,
    });
    if (error || !data) return null;
    return data as GuestInvitationBundle;
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { token } = await params;
  const bundle = await loadGuest(token);
  if (!bundle) return { title: "Invitación no encontrada" };

  const title = bundle.invitation.title || "Invitación";
  const composed = `${title} · ${bundle.guest.name}`;
  const branding = brandingForPlanCode(bundle.invitation.plan_code);
  return {
    title: branding === "none" ? { absolute: composed } : composed,
    description: bundle.invitation.event_type
      ? `${bundle.invitation.event_type} · Estás invitado`
      : "Estás invitado",
    // Página personalizada por invitado: no indexar.
    robots: { index: false, follow: false },
  };
}

export default async function GuestInvitationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const bundle = await loadGuest(token);
  if (!bundle) notFound();

  return (
    <PublicInvitationView
      invitation={bundle.invitation}
      guest={bundle.guest}
      guestToken={token}
    />
  );
}
