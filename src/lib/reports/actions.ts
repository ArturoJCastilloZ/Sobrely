"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  funnelFromGuests,
  funnelFromResponses,
  type GuestRow,
  type ResponseRow,
} from "@/lib/dashboard/metrics";
import {
  attemptsLeft,
  generatePin,
  hashPin,
  isLocked,
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  minutesUntilUnlock,
  normalizePin,
  verifyPin,
} from "./pin";
import {
  buildSharedReport,
  type ReportDenial,
  type SharedReport,
} from "./report";

export type ReportLinkInfo = {
  token: string;
  createdAt: string;
  viewCount: number;
  lastViewedAt: string | null;
};

export type CreateReportResult =
  | {
      ok: true;
      token: string;
      /**
       * El PIN EN CLARO. Es la única vez que existe fuera del hash: no se puede
       * volver a consultar, solo regenerar. Por eso la UI tiene que mostrarlo
       * de forma que el anfitrión lo copie antes de cerrar.
       */
      pin: string;
    }
  | { ok: false; error: string };

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** Dueño de la invitación, o `null`. Misma defensa explícita que en guests. */
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

/**
 * Crea la liga del reporte y devuelve el PIN una sola vez.
 *
 * Si ya había una liga viva se REVOCA y se emite otra, en vez de devolver la
 * existente: el PIN anterior no se puede recuperar (solo está su hash), así que
 * un anfitrión que perdió su PIN necesita poder rotar. El índice único parcial
 * de la `0019` garantiza que nunca queden dos vivas.
 */
export async function createReportLink(
  invitationId: string,
): Promise<CreateReportResult> {
  const supabase = await createClient();
  const owner = await assertOwner(supabase, invitationId);
  if (!owner) return { ok: false, error: "No autorizado." };

  const pin = generatePin();
  const pin_hash = await hashPin(pin);

  // Revocar la anterior y crear la nueva. No es transaccional: si el insert
  // fallara, la vieja queda revocada y el anfitrión se queda sin liga. Se
  // prefiere ese fallo (visible, y se arregla generando otra) a la alternativa
  // de chocar contra el índice único parcial y dejar dos ligas en circulación.
  const { error: revokeError } = await supabase
    .from("invitation_reports")
    .update({ revoked_at: new Date().toISOString() })
    .eq("invitation_id", invitationId)
    .is("revoked_at", null);
  if (revokeError) {
    return { ok: false, error: "No se pudo revocar la liga anterior." };
  }

  const { data, error } = await supabase
    .from("invitation_reports")
    .insert({ invitation_id: invitationId, pin_hash })
    .select("token")
    .single();

  if (error || !data) {
    return { ok: false, error: "No se pudo crear la liga del reporte." };
  }

  revalidatePath(`/dashboard/invitations/${invitationId}`);
  return { ok: true, token: data.token as string, pin };
}

/** Apaga la liga viva. La liga muere; el reporte deja de abrir. */
export async function revokeReportLink(
  invitationId: string,
): Promise<SimpleResult> {
  const supabase = await createClient();
  const owner = await assertOwner(supabase, invitationId);
  if (!owner) return { ok: false, error: "No autorizado." };

  const { error } = await supabase
    .from("invitation_reports")
    .update({ revoked_at: new Date().toISOString() })
    .eq("invitation_id", invitationId)
    .is("revoked_at", null);

  if (error) return { ok: false, error: "No se pudo revocar la liga." };

  revalidatePath(`/dashboard/invitations/${invitationId}`);
  return { ok: true };
}

/** La liga viva de una invitación, para pintarla en el panel del dueño. */
export async function getReportLink(
  invitationId: string,
): Promise<ReportLinkInfo | null> {
  const supabase = await createClient();
  const owner = await assertOwner(supabase, invitationId);
  if (!owner) return null;

  const { data } = await supabase
    .from("invitation_reports")
    .select("token, created_at, view_count, last_viewed_at")
    .eq("invitation_id", invitationId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!data) return null;
  return {
    token: data.token as string,
    createdAt: data.created_at as string,
    viewCount: (data.view_count as number) ?? 0,
    lastViewedAt: (data.last_viewed_at as string) ?? null,
  };
}

export type OpenReportResult =
  | { ok: true; report: SharedReport }
  | ({ ok: false } & ReportDenial);

/**
 * Abre un reporte con token + PIN. La llama un VISITANTE ANÓNIMO.
 *
 * Todo pasa por el cliente admin porque `invitation_reports` no tiene política
 * de RLS para anónimos a propósito (ver `0019`): tener el token no alcanza para
 * leer la fila, solo para pedírsela al servidor, que exige además el PIN.
 */
export async function openReport(
  token: string,
  rawPin: string,
): Promise<OpenReportResult> {
  const pin = normalizePin(rawPin);
  // Se valida la FORMA antes de tocar la base: así un bot que manda basura no
  // consume ni una consulta ni un scrypt.
  if (!pin) return { ok: false, reason: "invalid_pin_format" };

  if (typeof token !== "string" || !/^[0-9a-f]{48}$/.test(token)) {
    return { ok: false, reason: "not_found" };
  }

  const admin = createAdminClient();

  // El intento se COBRA ANTES de verificar, y de forma atómica (`for update`
  // dentro de la RPC). Hacerlo después —o con un leer-y-reescribir desde aquí—
  // deja pasar entero un lote concurrente: todas las peticiones leerían el
  // mismo contador en cero y el bloqueo nunca se dispararía. Ver `0020`.
  const { data: claim } = await admin.rpc("claim_report_attempt", {
    p_token: token,
    p_max_attempts: MAX_FAILED_ATTEMPTS,
    p_lock_minutes: LOCK_MINUTES,
  });

  // Token inexistente y token revocado se responden igual: distinguirlos le
  // diría a quien prueba al azar cuáles llegaron a existir.
  if (!claim) return { ok: false, reason: "not_found" };

  const estado = {
    failedAttempts: (claim.failed_attempts as number) ?? 0,
    lockedUntil: (claim.locked_until as string) ?? null,
  };

  // Bloqueada: la RPC ni siquiera devolvió el hash, así que el PIN correcto
  // tampoco abre. Es lo que hace que el bloqueo signifique algo.
  if (claim.locked === true) {
    return {
      ok: false,
      reason: "locked",
      minutesLeft: minutesUntilUnlock(estado),
    };
  }

  const bueno = await verifyPin(pin, claim.pin_hash as string);

  if (!bueno) {
    // El intento ya quedó cobrado por la RPC; aquí solo se traduce el estado
    // que devolvió.
    if (isLocked(estado)) {
      return {
        ok: false,
        reason: "locked",
        minutesLeft: minutesUntilUnlock(estado),
      };
    }
    return { ok: false, reason: "bad_pin", attemptsLeft: attemptsLeft(estado) };
  }

  // Acierto: se devuelve el intento cobrado, se limpia el bloqueo y se cuenta
  // la visita, todo en una sentencia.
  await admin.rpc("finish_report_attempt", { p_token: token });

  const report = await loadReport(admin, claim.invitation_id as string);
  if (!report) return { ok: false, reason: "not_found" };

  return { ok: true, report };
}

/**
 * Arma el reporte agregado de una invitación.
 *
 * Los `select` nombran columnas una por una en vez de `*`: lo que salga de aquí
 * viaja al navegador de alguien que NO es el dueño, así que la lista de
 * columnas es la frontera de privacidad y conviene leerla de un vistazo.
 * Nótese que de invitados y respuestas NO se pide el nombre.
 */
async function loadReport(
  admin: ReturnType<typeof createAdminClient>,
  invitationId: string,
): Promise<SharedReport | null> {
  const { data: inv } = await admin
    .from("invitations")
    .select("title, event_type, event_date, rsvp_mode, user_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return null;

  const { data: perfil } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", inv.user_id as string)
    .maybeSingle();

  const esLista = inv.rsvp_mode === "guest_list";

  if (esLista) {
    const { data } = await admin
      .from("invitation_guests")
      .select(
        "status, max_guests, confirmed_count, checked_in_at, invited_at, created_at, updated_at",
      )
      .eq("invitation_id", invitationId);

    // `funnelFromGuests` pide `name` en su tipo pero no lo usa para ninguna
    // cifra. No se trae de la base: no se puede filtrar lo que nunca se leyó.
    const filas = (data ?? []).map((g) => ({ ...g, name: "" })) as GuestRow[];
    return buildSharedReport(
      inv,
      funnelFromGuests(filas),
      (perfil?.display_name as string) ?? null,
    );
  }

  const { data } = await admin
    .from("rsvp_responses")
    .select("attendance_status, guest_count, created_at, updated_at")
    .eq("invitation_id", invitationId);

  const filas = (data ?? []).map((r) => ({
    ...r,
    guest_name: "",
  })) as ResponseRow[];
  return buildSharedReport(
    inv,
    funnelFromResponses(filas),
    (perfil?.display_name as string) ?? null,
  );
}
