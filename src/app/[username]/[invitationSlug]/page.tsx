import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { InvitacionCaducada } from "@/components/public/invitacion-caducada";
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

/**
 * ¿Existe la invitación y sólo le caducó el acceso, o de verdad no existe?
 *
 * Hace falta porque `get_public_invitation` devuelve `null` en los DOS casos, y
 * el invitado se merece mensajes distintos: uno le dice qué hacer y el otro le
 * dice que se equivocó cuando no se equivocó.
 *
 * DEGRADA A LA CONDUCTA DE HOY a propósito: la función vive en la migración
 * `0054`, que el dev aplica a mano. Mientras no esté aplicada la RPC no existe,
 * la llamada da error y esto devuelve `"inexistente"` — o sea el 404 de
 * siempre. Nada se rompe por desplegar el código antes que la migración.
 */
const loadEstado = cache(
  async (username: string, slug: string): Promise<string> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "estado_publico_de_invitacion",
      { p_username: username, p_slug: slug },
    );
    if (error || typeof data !== "string") return "inexistente";
    return data;
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
    // El titulo de la pestaña también tiene que decir la verdad: el invitado
    // que guarda el enlace no ve «no encontrada» sobre algo que sí existe.
    const estado = await loadEstado(username, invitationSlug);
    return {
      title:
        estado === "caducada"
          ? "Invitación caducada"
          : "Invitación no encontrada",
      robots: { index: false, follow: false },
    };
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
