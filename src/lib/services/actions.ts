"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getService } from "@/lib/billing/services";
import { SUPPORT_WHATSAPP } from "@/lib/billing/config";

/**
 * Server Action: registra una solicitud de servicio asistido (flujo
 * solicitud-primero, Subfase 8.6).
 *
 * No cobra: crea la fila `service_requests` (status 'pending') con el cliente
 * admin (porque `service_requests` no acepta escritura desde el cliente por
 * RLS) y devuelve las instrucciones de contacto (WhatsApp). El equipo mueve el
 * ciclo de vida después (panel admin, Fase 8.7).
 *
 * Solo se aceptan servicios `isManual`: los automáticos (p.ej. renovación) NO
 * pasan por aquí.
 */
export interface ServiceRequestResult {
  ok: boolean;
  /** Enlace de WhatsApp con mensaje prellenado, si hay número configurado. */
  whatsappUrl?: string;
  error?: string;
}

export async function requestManualService(params: {
  serviceCode: string;
  invitationId?: string | null;
  contactNote?: string;
}): Promise<ServiceRequestResult> {
  const { serviceCode, invitationId, contactNote } = params;

  const service = getService(serviceCode);
  if (!service || !service.isActive) {
    return { ok: false, error: "Servicio no disponible." };
  }
  if (!service.isManual) {
    // Los servicios automáticos no se solicitan por este flujo.
    return { ok: false, error: "Este servicio no requiere solicitud manual." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  // Si se ancla a una invitación, verifica propiedad (RLS lo garantiza; validamos
  // explícito para no registrar una solicitud contra una invitación ajena).
  let safeInvitationId: string | null = null;
  if (invitationId) {
    const { data: inv } = await supabase
      .from("invitations")
      .select("id")
      .eq("id", invitationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!inv) {
      return { ok: false, error: "Invitación no encontrada." };
    }
    safeInvitationId = inv.id as string;
  }

  const note = (contactNote ?? "").trim().slice(0, 1000) || null;

  const admin = createAdminClient();
  const { error: insErr } = await admin.from("service_requests").insert({
    user_id: user.id,
    invitation_id: safeInvitationId,
    service_code: service.code,
    status: "pending",
    currency: service.currency,
    contact_note: note,
    metadata: { service_name: service.name },
  });

  if (insErr) {
    console.error("[services] no se pudo registrar la solicitud:", insErr.message);
    return { ok: false, error: "No se pudo registrar la solicitud." };
  }

  return { ok: true, whatsappUrl: buildWhatsappUrl(service.name, user.email) };
}

/** Arma un enlace wa.me con mensaje prellenado, si hay número configurado. */
function buildWhatsappUrl(serviceName: string, email?: string): string | undefined {
  if (!SUPPORT_WHATSAPP) return undefined;
  const digits = SUPPORT_WHATSAPP.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const text = encodeURIComponent(
    `Hola, quiero solicitar el servicio "${serviceName}" en Sobrely` +
      (email ? ` (cuenta: ${email}).` : "."),
  );
  return `https://wa.me/${digits}?text=${text}`;
}
