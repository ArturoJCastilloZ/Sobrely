"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAddGuest } from "@/lib/billing/entitlements";
import { sanitizeRsvpAnswers } from "./sanitize-server";
import {
  rsvpSubmitSchema,
  rsvpUpdateSchema,
  type RsvpSubmitInput,
  type RsvpUpdateInput,
} from "./schemas";

export type RsvpActionResult = { ok: true } | { ok: false; error: string };



/**
 * Public RSVP submission. RLS only allows inserting into PUBLISHED invitations,
 * so an anonymous visitor cannot write to drafts or arbitrary rows.
 */
export async function submitRsvp(
  input: RsvpSubmitInput,
): Promise<RsvpActionResult> {
  const parsed = rsvpSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const v = parsed.data;

  // Tope de invitados por plan (enforcement server-side). Se usa el cliente
  // admin porque el visitante es anónimo y RLS no le permite sumar respuestas.
  const admin = createAdminClient();

  const answers = await sanitizeRsvpAnswers(admin, v.invitationId, v.answers);
  if (!answers.ok) return { ok: false, error: answers.error };

  const guestCheck = await canAddGuest(admin, v.invitationId, v.guestCount);
  if (!guestCheck.allowed) {
    return {
      ok: false,
      error:
        "Esta invitación alcanzó su límite de invitados. Contacta a los anfitriones.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rsvp_responses").insert({
    invitation_id: v.invitationId,
    guest_name: v.guestName,
    guest_email: v.guestEmail || null,
    attendance_status: v.attendanceStatus,
    guest_count: v.guestCount,
    message: v.message || null,
    answers: answers.answers,
  });

  if (error) {
    // RLS violation or unpublished invitation lands here.
    return {
      ok: false,
      error: "No se pudo registrar tu confirmación. Intenta de nuevo.",
    };
  }

  return { ok: true };
}

/** Owner edits an existing response (ownership enforced by RLS). */
export async function updateRsvp(
  input: RsvpUpdateInput,
): Promise<RsvpActionResult> {
  const parsed = rsvpUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { error } = await supabase
    .from("rsvp_responses")
    .update({
      guest_name: v.guestName,
      guest_email: v.guestEmail || null,
      attendance_status: v.attendanceStatus,
      guest_count: v.guestCount,
      message: v.message || null,
    })
    .eq("id", v.id);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

/** Owner deletes a response (ownership enforced by RLS). */
export async function deleteRsvp(id: string): Promise<RsvpActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { error } = await supabase.from("rsvp_responses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
