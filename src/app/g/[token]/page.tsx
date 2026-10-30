import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { brandingForPlanCode } from "@/lib/billing/branding";
import { cargarInvitacionDeInvitado as loadGuest } from "@/lib/invitations/cargar-publica";
import {
  metadatosDeInvitacion,
  metadatosGenericos,
} from "@/lib/seo/compartir-invitacion";

type Params = { token: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { token } = await params;
  const bundle = await loadGuest(token);
  // Token desconocido o invitación no publicada: la tarjeta genérica de
  // Sobrely, sin pistas de si el token es de alguien.
  if (!bundle) {
    return {
      title: "Invitación no encontrada",
      ...metadatosGenericos(),
      robots: { index: false, follow: false },
    };
  }

  const title = bundle.invitation.title || "Invitación";
  // El nombre del invitado solo va en la pestaña (la ve él). La tarjeta al
  // compartir es la del evento: `metadatosDeInvitacion` no lo recibe.
  const composed = `${title} · ${bundle.guest.name}`;
  const branding = brandingForPlanCode(bundle.invitation.plan_code);
  return {
    title: branding === "none" ? { absolute: composed } : composed,
    ...metadatosDeInvitacion(bundle.invitation, `/g/${encodeURIComponent(token)}`),
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
