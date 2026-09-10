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

  // Solo se le exige lo obligatorio a quien dice que SÍ va. A quien declina no
  // se le pide elegir menú, y a quien duda ("tal vez") tampoco — todavía no
  // sabe si asiste. Lo que contesten se guarda igual; solo no se les exige.
  const answers = await sanitizeRsvpAnswers(admin, v.invitationId, v.answers, {
    enforceRequired: v.attendanceStatus === "yes",
  });
  if (!answers.ok) return { ok: false, error: answers.error };

  // Cuánto cupo consume DE VERDAD este envío. Si el mismo correo ya había
  // confirmado, su respuesta se va a ACTUALIZAR, así que lo que se añade es la
  // diferencia — no los pases otra vez. Sin esto, un invitado que recarga y
  // vuelve a confirmar lo mismo podía quedarse fuera por rebasar un tope que
  // en realidad no movía.
  const previos = await pasesYaContadosDeEseCorreo(
    admin,
    v.invitationId,
    v.guestEmail,
  );
  const consume = v.guestCount - previos;

  const guestCheck = await canAddGuest(admin, v.invitationId, consume);
  if (!guestCheck.allowed) {
    return {
      ok: false,
      error:
        "Esta invitación alcanzó su límite de invitados. Contacta a los anfitriones.",
    };
  }

  const supabase = await createClient();
  // Idempotente por correo: la función de la `0055` ACTUALIZA la respuesta
  // anterior de ese correo en vez de añadir otra. Va por RPC y no por un
  // `upsert` desde aquí porque `anon` sólo tiene policy de INSERT sobre
  // `rsvp_responses` — no puede hacer UPDATE, y no debe: entonces cualquiera
  // reescribiría la respuesta de otro.
  const { error } = await supabase.rpc("registrar_rsvp_publico", {
    p_invitation_id: v.invitationId,
    p_guest_name: v.guestName,
    p_guest_email: v.guestEmail || null,
    p_attendance_status: v.attendanceStatus,
    p_guest_count: v.guestCount,
    p_message: v.message || null,
    p_answers: answers.answers,
  });

  // DEGRADACION OBLIGATORIA, y no es una precaucion de mas: la `0055` la aplica
  // el dev A MANO, asi que entre desplegar esto y aplicarla la funcion NO
  // existe. Sin este camino de vuelta, el RSVP publico dejaria de funcionar en
  // una base que esta recibiendo confirmaciones reales — el mismo error de
  // desplegar codigo que depende de una migracion que aun no esta puesta.
  // Cuando la `0055` este aplicada, esta rama es codigo muerto.
  if (error && esFuncionInexistente(error)) {
    const { error: insErr } = await supabase.from("rsvp_responses").insert({
      invitation_id: v.invitationId,
      guest_name: v.guestName,
      guest_email: v.guestEmail || null,
      attendance_status: v.attendanceStatus,
      guest_count: v.guestCount,
      message: v.message || null,
      answers: answers.answers,
    });
    if (insErr) {
      return {
        ok: false,
        error: "No se pudo registrar tu confirmación. Intenta de nuevo.",
      };
    }
    return { ok: true };
  }

  if (error) {
    // RLS violation or unpublished invitation lands here.
    return {
      ok: false,
      error: "No se pudo registrar tu confirmación. Intenta de nuevo.",
    };
  }

  return { ok: true };
}

/**
 * ¿El error es «esa función no existe»?
 *
 * `PGRST202` lo devuelve PostgREST cuando no encuentra la función en su caché de
 * esquema; `42883` es el `undefined_function` de PostgreSQL por debajo. Se
 * miran los dos porque cuál llega depende de si la caché de PostgREST ya se
 * recargó, y confundir «no existe la función» con «la invitación no está
 * publicada» mandaría al invitado un error equivocado.
 */
function esFuncionInexistente(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /registrar_rsvp_publico/.test(error.message ?? "")
  );
}

/**
 * Pases que este correo ya tiene contados en esta invitación, o 0.
 *
 * Se lee con el cliente admin porque el visitante es anónimo y no puede leer
 * `rsvp_responses` — el mismo motivo por el que ya se usaba admin para el tope
 * de invitados unas líneas más arriba. Sólo se devuelve un número: ni el
 * nombre, ni el mensaje, ni nada de la respuesta ajena sale de aquí.
 */
async function pasesYaContadosDeEseCorreo(
  admin: ReturnType<typeof createAdminClient>,
  invitationId: string,
  email: string | null | undefined,
): Promise<number> {
  const limpio = (email ?? "").trim();
  if (!limpio) return 0;
  // Los comodines de LIKE se escapan: un correo puede llevar `_` de verdad
  // (`a_b@x.com`), y sin escapar `_` casa con CUALQUIER caracter, asi que
  // contaria los pases de otra persona.
  const patron = limpio.replace(/([%_\\])/g, "\\$1");
  const { data } = await admin
    .from("rsvp_responses")
    .select("guest_count")
    .eq("invitation_id", invitationId)
    .ilike("guest_email", patron);
  return (data ?? []).reduce(
    (suma, r) => suma + ((r.guest_count as number) ?? 0),
    0,
  );
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

  const { data: filas, error } = await supabase
    .from("rsvp_responses")
    .update({
      guest_name: v.guestName,
      guest_email: v.guestEmail || null,
      attendance_status: v.attendanceStatus,
      guest_count: v.guestCount,
      message: v.message || null,
    })
    .eq("id", v.id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!filas || filas.length === 0) {
    return { ok: false, error: "Esa respuesta ya no existe." };
  }

  return { ok: true };
}

/** Owner deletes a response (ownership enforced by RLS). */
export async function deleteRsvp(id: string): Promise<RsvpActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // `.select()` devuelve las filas AFECTADAS. Sin el, borrar una respuesta que
  // ya no existe —o de otra invitacion, que RLS filtra— daba `error: null` y la
  // tabla decia "eliminada" sin haber borrado nada.
  const { data: filas, error } = await supabase
    .from("rsvp_responses")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!filas || filas.length === 0) {
    return { ok: false, error: "Esa respuesta ya no existe." };
  }

  return { ok: true };
}
