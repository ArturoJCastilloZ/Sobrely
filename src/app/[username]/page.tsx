import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import { PublicInvitationView } from "@/components/public/public-invitation";

/**
 * URL personalizada (vanity) premium: `/<slug>` (un solo segmento).
 *
 * Convive con `/<usuario>/<slug>` (ruta de 2 segmentos). Next no permite dos
 * nombres de segmento dinámico distintos en el mismo nivel, así que este archivo
 * vive bajo `[username]` pero interpreta el segmento como un VANITY SLUG global.
 * Las rutas estáticas (/pricing, /login…) tienen prioridad; un segmento que no
 * resuelva a un vanity vigente da 404.
 */
type Params = { username: string };

const loadByVanity = cache(
  async (vanity: string): Promise<PublicInvitation | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_public_invitation_by_vanity",
      { p_slug: vanity },
    );
    if (error || !data) return null;
    return data as PublicInvitation;
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  const invitation = await loadByVanity(username);
  if (!invitation) return { title: "Invitación no encontrada" };

  const title = invitation.title || "Invitación";
  const description = invitation.event_type
    ? `${invitation.event_type} · Te invitamos`
    : "Estás invitado";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function VanityInvitationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const invitation = await loadByVanity(username);
  if (!invitation) notFound();
  return <PublicInvitationView invitation={invitation} />;
}
