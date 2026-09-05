"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeRsvpAnswers } from "@/lib/rsvp/sanitize-server";
import { getInvitationEffectivePlan } from "@/lib/billing/entitlements";
import {
  guestUpsertSchema,
  guestEditSchema,
  guestBulkSchema,
  guestRespondSchema,
  parseBulkGuests,
  type GuestUpsertInput,
  type GuestEditInput,
  type GuestBulkInput,
  type GuestRespondInput,
} from "./schemas";

export type GuestActionResult = { ok: true } | { ok: false; error: string };

/**
 * Cupo total de invitados de la invitación = `maxGuests` de su plan EFECTIVO.
 * El modo lista está en todos los planes; lo que cambia es este número (Free 25
 * … Premium **ilimitado**). Devuelve `null` cuando el plan no tiene tope. En
 * borrador el plan efectivo es Free hasta que se publica con un plan pagado,
 * momento en el que se puede agregar más.
 */
async function planGuestCap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invitationId: string,
): Promise<number | null> {
  const plan = await getInvitationEffectivePlan(supabase, invitationId);
  return plan.maxGuests;
}

/** Verifica que el usuario sea dueño de la invitación (RLS + defensa explícita). */
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

/** Suma de `max_guests` ya asignados en la invitación (excluye un id opcional). */
async function currentAllotment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invitationId: string,
  excludeId?: string,
): Promise<number> {
  const { data } = await supabase
    .from("invitation_guests")
    .select("id, max_guests")
    .eq("invitation_id", invitationId);
  return (data ?? [])
    .filter((g) => g.id !== excludeId)
    .reduce((sum, g) => sum + ((g.max_guests as number) ?? 0), 0);
}

export type GuestListRow = {
  id: string;
  name: string;
  max_guests: number;
  access_token: string;
  status: "pending" | "confirmed" | "declined";
  confirmed_count: number | null;
  checked_in_at: string | null;
  /** Teléfono para invitar por WhatsApp. `null` = no se capturó. */
  phone: string | null;
  /** Cuándo se le envió su invitación. `null` = todavía no se le envía. */
  invited_at: string | null;
};

/** Lista los invitados de una invitación propia (RLS: solo el dueño). */
export async function listGuests(
  invitationId: string,
): Promise<GuestListRow[]> {
  const supabase = await createClient();
  const owner = await assertOwner(supabase, invitationId);
  if (!owner) return [];
  const { data } = await supabase
    .from("invitation_guests")
    .select(
      "id, name, max_guests, access_token, status, confirmed_count, checked_in_at, phone, invited_at",
    )
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: true });
  return (data ?? []) as GuestListRow[];
}

/** Cambia el modo RSVP de una invitación ('open' | 'guest_list'). */
export async function setRsvpMode(
  invitationId: string,
  mode: "open" | "guest_list",
): Promise<GuestActionResult> {
  if (mode !== "open" && mode !== "guest_list") {
    return { ok: false, error: "Modo inválido." };
  }
  const supabase = await createClient();
  const owner = await assertOwner(supabase, invitationId);
  if (!owner) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("invitations")
    .update({ rsvp_mode: mode })
    .eq("id", invitationId);
  if (error) return { ok: false, error: "No se pudo cambiar el modo." };
  return { ok: true };
}

/** Alta de un invitado nominal. El token lo genera la BD (default). */
export async function addGuest(
  input: GuestUpsertInput,
): Promise<GuestActionResult> {
  const parsed = guestUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const owner = await assertOwner(supabase, v.invitationId);
  if (!owner) return { ok: false, error: "No autorizado." };

  const cap = await planGuestCap(supabase, v.invitationId);
  const used = await currentAllotment(supabase, v.invitationId);
  if (cap !== null && used + v.maxGuests > cap) {
    return {
      ok: false,
      error: `Tu plan permite hasta ${cap} invitados. Sube de plan para agregar más.`,
    };
  }

  const { error } = await supabase.from("invitation_guests").insert({
    invitation_id: v.invitationId,
    name: v.name,
    max_guests: v.maxGuests,
    phone: v.phone,
  });
  if (error) return { ok: false, error: "No se pudo agregar el invitado." };
  return { ok: true };
}

/** Alta masiva desde texto pegado (una línea por invitado). */
export async function addGuestsBulk(
  input: GuestBulkInput,
): Promise<GuestActionResult> {
  const parsed = guestBulkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const owner = await assertOwner(supabase, v.invitationId);
  if (!owner) return { ok: false, error: "No autorizado." };

  const rows = parseBulkGuests(v.raw);
  if (rows.length === 0) {
    return { ok: false, error: "No se reconoció ningún invitado válido." };
  }

  const cap = await planGuestCap(supabase, v.invitationId);
  const used = await currentAllotment(supabase, v.invitationId);
  const adding = rows.reduce((s, r) => s + r.maxGuests, 0);
  if (cap !== null && used + adding > cap) {
    return {
      ok: false,
      error: `Tu plan permite hasta ${cap} invitados. Sube de plan para agregar más.`,
    };
  }

  const { error } = await supabase.from("invitation_guests").insert(
    rows.map((r) => ({
      invitation_id: v.invitationId,
      name: r.name,
      max_guests: r.maxGuests,
      // El alta masiva es "Nombre, lugares": no captura teléfono. Se agrega
      // después editando, que es cuando el organizador lo tiene a la mano.
      phone: null,
    })),
  );
  if (error) return { ok: false, error: "No se pudieron agregar los invitados." };
  return { ok: true };
}

/** Edición de nombre/cupo de un invitado (ownership por RLS). */
export async function editGuest(
  input: GuestEditInput,
): Promise<GuestActionResult> {
  const parsed = guestEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // Cargar el invitado (RLS deja leer solo los de invitaciones propias).
  const { data: guest } = await supabase
    .from("invitation_guests")
    .select("invitation_id")
    .eq("id", v.id)
    .maybeSingle();
  if (!guest) return { ok: false, error: "Invitado no encontrado." };

  const cap = await planGuestCap(supabase, guest.invitation_id as string);
  const used = await currentAllotment(
    supabase,
    guest.invitation_id as string,
    v.id,
  );
  if (cap !== null && used + v.maxGuests > cap) {
    return {
      ok: false,
      error: `Tu plan permite hasta ${cap} invitados. Sube de plan para agregar más.`,
    };
  }

  const { error } = await supabase
    .from("invitation_guests")
    .update({ name: v.name, max_guests: v.maxGuests, phone: v.phone })
    .eq("id", v.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Sella (o revierte) el envío de la invitación de un invitado.
 *
 * Es lo que alimenta el KPI de COBERTURA. Se marca cuando el organizador abre
 * el chat de WhatsApp — Sobrely no puede saber si el mensaje se mandó de
 * verdad, así que esto declara INTENCIÓN de envío, no entrega confirmada. Por
 * eso se puede revertir a mano.
 *
 * Idempotente: volver a marcar algo ya marcado no mueve la fecha original.
 */
export async function setGuestInvited(
  id: string,
  invited: boolean,
): Promise<GuestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // RLS: solo devuelve el invitado si la invitación es del usuario.
  const { data: guest } = await supabase
    .from("invitation_guests")
    .select("id, invited_at")
    .eq("id", id)
    .maybeSingle();
  if (!guest) return { ok: false, error: "Invitado no encontrado." };

  const yaMarcado = guest.invited_at !== null;
  if (yaMarcado === invited) return { ok: true };

  const { error } = await supabase
    .from("invitation_guests")
    .update({ invited_at: invited ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar el envío." };
  return { ok: true };
}

/** Elimina un invitado (ownership por RLS). */
export async function deleteGuest(id: string): Promise<GuestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { error } = await supabase
    .from("invitation_guests")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type CheckInResult =
  | {
      ok: true;
      guest: { name: string; maxGuests: number; alreadyCheckedIn: boolean };
    }
  | { ok: false; error: string };

/**
 * Check-in en la puerta por token escaneado. Lo hace el DUEÑO (autenticado);
 * RLS asegura que solo puede tocar invitados de sus propias invitaciones.
 * Idempotente: si ya había ingresado, lo informa sin volver a sellar.
 */
export async function checkInByToken(token: string): Promise<CheckInResult> {
  const clean = (token ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{16,128}$/.test(clean)) {
    return { ok: false, error: "Código no válido." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // RLS: solo devuelve el invitado si la invitación es del usuario.
  const { data: guest } = await supabase
    .from("invitation_guests")
    .select("id, name, max_guests, checked_in_at")
    .eq("access_token", clean)
    .maybeSingle();
  if (!guest) return { ok: false, error: "Invitado no encontrado." };

  const alreadyCheckedIn = Boolean(guest.checked_in_at);
  if (!alreadyCheckedIn) {
    const { error } = await supabase
      .from("invitation_guests")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", guest.id);
    if (error) return { ok: false, error: "No se pudo registrar el ingreso." };
  }

  return {
    ok: true,
    guest: {
      name: guest.name as string,
      maxGuests: guest.max_guests as number,
      alreadyCheckedIn,
    },
  };
}

/** Marca o revierte el ingreso de un invitado por id (manual, desde la lista). */
export async function setGuestCheckIn(
  id: string,
  checkedIn: boolean,
): Promise<GuestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { error } = await supabase
    .from("invitation_guests")
    .update({ checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Respuesta del invitado por token (anónimo). Pasa por la RPC SECURITY DEFINER
 * `respond_guest`, que solo opera sobre invitaciones publicadas en modo
 * 'guest_list'. Se usa el cliente admin porque el visitante es anónimo.
 */
export async function respondAsGuest(
  input: GuestRespondInput,
): Promise<GuestActionResult> {
  const parsed = guestRespondSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const v = parsed.data;

  const admin = createAdminClient();

  // El token es la única llave que trae el invitado; la invitación se resuelve
  // desde él para poder leer QUÉ preguntas declara y sanear contra eso.
  const { data: fila } = await admin
    .from("invitation_guests")
    .select("invitation_id")
    .eq("access_token", v.token)
    .maybeSingle();
  if (!fila) return { ok: false, error: "No se pudo registrar tu respuesta." };

  // Lo obligatorio solo se le exige a quien CONFIRMA. `confirmedCount === 0`
  // es "no podré asistir": exigirle el menú lo dejaría sin poder declinar.
  const answers = await sanitizeRsvpAnswers(
    admin,
    fila.invitation_id as string,
    v.answers,
    { enforceRequired: v.confirmedCount > 0 },
  );
  if (!answers.ok) return { ok: false, error: answers.error };

  const { data, error } = await admin.rpc("respond_guest", {
    p_token: v.token,
    p_confirmed_count: v.confirmedCount,
    p_message: v.message || null,
    p_answers: answers.answers,
  });
  if (error || !data) {
    return { ok: false, error: "No se pudo registrar tu respuesta." };
  }
  return { ok: true };
}
