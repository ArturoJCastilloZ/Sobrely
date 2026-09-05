"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signaturesConfigSchema, SIGNATURES_PAGE_SIZE } from "@/lib/modules/types";
import { isDuplicateSignature, sanitizeSignature } from "./sanitize";

export type SignatureRow = {
  id: string;
  guest_name: string;
  message: string;
  created_at: string;
};

/** Fila como la ve el DUEÑO: incluye las ocultas, para poder moderarlas. */
export type OwnerSignatureRow = SignatureRow & { is_hidden: boolean };

export type SignResult =
  | { ok: true; pendiente: boolean }
  | { ok: false; error: string };

export type SimpleResult = { ok: true } | { ok: false; error: string };

/**
 * Un invitado firma. Lo llama un VISITANTE ANÓNIMO.
 *
 * Las tres reglas duras —invitación publicada, módulo visible, y la fila nace
 * oculta si el anfitrión pidió moderar— las impone la RLS de la `0023`, no
 * este archivo. Aquí solo se sanea y se traduce el resultado a algo que un
 * invitado pueda leer: la base ya rechaza lo inválido, pero un `23514` en la
 * cara de alguien en una boda no sirve de nada.
 *
 * El `requireApproval` se lee de la BASE y no del cliente, por la misma razón
 * que `sanitizeRsvpAnswers`: si viajara desde el navegador, sería el propio
 * visitante quien decide si su firma necesita revisión.
 */
export async function signGuestbook(
  invitationId: string,
  input: { guestName: string; message: string },
): Promise<SignResult> {
  const limpio = sanitizeSignature(input);
  if (!limpio.ok) return { ok: false, error: limpio.error };

  // Cliente admin: el visitante es anónimo y necesitamos leer el config del
  // módulo, que RLS no le deja ver.
  const admin = createAdminClient();

  const { data: modulo } = await admin
    .from("invitation_modules")
    .select("config, is_visible")
    .eq("invitation_id", invitationId)
    .eq("module_type", "signatures")
    .maybeSingle();

  if (!modulo || modulo.is_visible === false) {
    return { ok: false, error: "Esta invitación no tiene libro de firmas." };
  }

  const { data: inv } = await admin
    .from("invitations")
    .select("is_published")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv?.is_published) {
    return { ok: false, error: "Esta invitación todavía no está publicada." };
  }

  const cfg = signaturesConfigSchema.safeParse(modulo.config ?? {});
  const requireApproval = cfg.success ? cfg.data.requireApproval : false;

  // Doble clic: se compara contra la ÚLTIMA firma del evento. No es un
  // antispam —para eso está la RLS y los topes—, es evitar que el mismo
  // mensaje salga dos veces porque no se vio el envío.
  const { data: ultima } = await admin
    .from("invitation_signatures")
    .select("guest_name, message")
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isDuplicateSignature(limpio.value, ultima)) {
    // Se responde OK a propósito: para el invitado, su firma SÍ quedó — la
    // mandó dos veces. Decirle "error" lo haría intentar una tercera.
    return { ok: true, pendiente: requireApproval };
  }

  const { error } = await admin.from("invitation_signatures").insert({
    invitation_id: invitationId,
    guest_name: limpio.value.guestName,
    message: limpio.value.message,
    is_hidden: requireApproval,
  });

  if (error) return { ok: false, error: "No se pudo guardar tu firma." };

  return { ok: true, pendiente: requireApproval };
}

/**
 * Firmas visibles de una invitación, para el muro público.
 *
 * Va por el cliente ANÓNIMO a propósito, no por el admin: así la política
 * `signatures_public_select` de la `0023` es la que decide qué se ve, y una
 * firma oculta no puede colarse por un descuido de este archivo.
 */
export async function listSignatures(
  invitationId: string,
): Promise<SignatureRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitation_signatures")
    .select("id, guest_name, message, created_at")
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: false })
    .limit(SIGNATURES_PAGE_SIZE);
  return (data ?? []) as SignatureRow[];
}

/** Dueño de la invitación, o `null`. */
async function assertOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invitationId: string,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("invitations")
    .select("id")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? user.id : null;
}

/** Todas las firmas, ocultas incluidas. Solo el dueño (RLS + chequeo). */
export async function listSignaturesForOwner(
  invitationId: string,
): Promise<OwnerSignatureRow[]> {
  const supabase = await createClient();
  const owner = await assertOwner(supabase, invitationId);
  if (!owner) return [];
  const { data } = await supabase
    .from("invitation_signatures")
    .select("id, guest_name, message, created_at, is_hidden")
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as OwnerSignatureRow[];
}

/**
 * Oculta o muestra una firma.
 *
 * Ocultar y no borrar es lo que se ofrece primero: una firma subida de tono en
 * una boda casi nunca hay que destruirla, basta con que no se vea. Y si el
 * anfitrión se arrepiente, la puede volver a mostrar.
 */
export async function setSignatureHidden(
  invitationId: string,
  signatureId: string,
  hidden: boolean,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const owner = await assertOwner(supabase, invitationId);
  if (!owner) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("invitation_signatures")
    .update({ is_hidden: hidden })
    .eq("id", signatureId)
    .eq("invitation_id", invitationId);

  if (error) return { ok: false, error: "No se pudo actualizar la firma." };
  revalidatePath(`/dashboard/invitations/${invitationId}`);
  return { ok: true };
}

/** Borra una firma. Irreversible — la UI ofrece ocultar antes que esto. */
export async function deleteSignature(
  invitationId: string,
  signatureId: string,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const owner = await assertOwner(supabase, invitationId);
  if (!owner) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("invitation_signatures")
    .delete()
    .eq("id", signatureId)
    .eq("invitation_id", invitationId);

  if (error) return { ok: false, error: "No se pudo borrar la firma." };
  revalidatePath(`/dashboard/invitations/${invitationId}`);
  return { ok: true };
}
