import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { InvitacionCaducada } from "@/components/public/invitacion-caducada";
import { brandingForPlanCode } from "@/lib/billing/branding";
import {
  cargarEstadoPublico as loadEstado,
  cargarInvitacionPublica as loadInvitation,
} from "@/lib/invitations/cargar-publica";
import {
  metadatosDeInvitacion,
  metadatosGenericos,
} from "@/lib/seo/compartir-invitacion";

type Params = { username: string; invitationSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username, invitationSlug } = await params;
  const invitation = await loadInvitation(username, invitationSlug);

  if (!invitation) {
    // El titulo de la pestaña también tiene que decir la verdad: el invitado
    // que guarda el enlace no ve «no encontrada» sobre algo que sí existe.
    const estado = await loadEstado(username, invitationSlug);
    return {
      title:
        estado === "caducada"
          ? "Invitación caducada"
          : "Invitación no encontrada",
      // La tarjeta al compartir no dice cuál de los dos casos es.
      ...metadatosGenericos(),
      robots: { index: false, follow: false },
    };
  }

  const title = invitation.title || "Invitación";

  // Sin marca: el título va absoluto para no heredar "· Sobrely" del template
  // del layout. Es la misma promesa del pie, en la pestaña del invitado.
  const branding = brandingForPlanCode(invitation.plan_code);

  return {
    title: branding === "none" ? { absolute: title } : title,
    // Tarjeta del evento (título, tipo, fecha) con su imagen generada en
    // `opengraph-image.tsx`. La ruta es la canónica de la invitación.
    ...metadatosDeInvitacion(
      invitation,
      `/${encodeURIComponent(invitation.owner_username)}/${encodeURIComponent(invitation.slug)}`,
    ),
    // Los datos del evento (anfitrion, fecha, direccion, confirmados) no tienen
    // por que acabar en un buscador: mismo criterio que /g/[token] y /r/[token].
    robots: { index: false, follow: false },
  };
}

export default async function PublicInvitationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username, invitationSlug } = await params;
  const invitation = await loadInvitation(username, invitationSlug);

  if (!invitation) {
    // Sólo se pregunta por el estado cuando ya sabemos que no hay invitación
    // que servir: en el camino feliz no se añade ni una consulta.
    const estado = await loadEstado(username, invitationSlug);
    if (estado === "caducada") return <InvitacionCaducada />;
    notFound();
  }

  return <PublicInvitationView invitation={invitation} />;
}
