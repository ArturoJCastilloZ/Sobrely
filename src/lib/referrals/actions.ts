"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CURRENCY, REFERRAL_ENABLED } from "@/lib/billing/config";
import { generateCode, isValidCodeFormat, normalizeCode } from "@/lib/referrals/codes";
import type { ReferralSummary } from "@/lib/referrals/types";

/**
 * Server Actions del programa de referidos (Subfase 8.6).
 *
 * Escritura siempre server-side (service_role): `referral_codes`, `referrals` y
 * `referral_credits` no aceptan escritura desde el cliente por RLS, así un
 * usuario no puede fabricarse referidos ni auto-acreditarse crédito.
 */

/**
 * Devuelve el código de referido del usuario, creándolo si no existe.
 * Idempotente; reintenta ante colisión del índice único de `code`.
 */
export async function ensureReferralCode(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.code) return existing.code as string;

  // Inserta con reintentos ante colisión (23505 = unique_violation).
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    const { error } = await admin
      .from("referral_codes")
      .insert({ user_id: user.id, code });
    if (!error) return code;
    if (error.code !== "23505") {
      console.error("[referrals] no se pudo crear el código:", error.message);
      return null;
    }
    // Si la colisión es porque el usuario ya tiene código (carrera), léelo.
    const { data: row } = await admin
      .from("referral_codes")
      .select("code")
      .eq("user_id", user.id)
      .maybeSingle();
    if (row?.code) return row.code as string;
  }
  return null;
}

export interface ApplyReferralResult {
  ok: boolean;
  error?: string;
}

/**
 * Aplica un código de referido a la cuenta actual (una sola vez por usuario).
 * Bloquea auto-referido y doble-referido; deja el vínculo en `pending` hasta que
 * el referido realice una compra pagada (ver fulfillment).
 */
export async function applyReferralCode(rawCode: string): Promise<ApplyReferralResult> {
  if (!REFERRAL_ENABLED) {
    return { ok: false, error: "El programa de referidos no está disponible." };
  }
  const code = normalizeCode(rawCode);
  if (!isValidCodeFormat(code)) {
    return { ok: false, error: "Código inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const admin = createAdminClient();

  // ¿Ya fue referido antes? (unique en referred_user_id, pero avisamos claro).
  const { data: already } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_user_id", user.id)
    .maybeSingle();
  if (already) {
    return { ok: false, error: "Ya aplicaste un código de referido." };
  }

  // Resuelve el dueño del código sin exponer la tabla (SECURITY DEFINER).
  const { data: referrerId, error: rpcErr } = await admin.rpc(
    "get_referrer_by_code",
    { p_code: code },
  );
  if (rpcErr) {
    console.error("[referrals] rpc get_referrer_by_code:", rpcErr.message);
    return { ok: false, error: "No se pudo validar el código." };
  }
  if (!referrerId) {
    return { ok: false, error: "El código no existe." };
  }
  if (referrerId === user.id) {
    return { ok: false, error: "No puedes usar tu propio código." };
  }

  const { error: insErr } = await admin.from("referrals").insert({
    referrer_user_id: referrerId,
    referred_user_id: user.id,
    status: "pending",
  });
  if (insErr) {
    // 23505 → carrera: ya existe el vínculo.
    if (insErr.code === "23505") {
      return { ok: false, error: "Ya aplicaste un código de referido." };
    }
    console.error("[referrals] no se pudo registrar el referido:", insErr.message);
    return { ok: false, error: "No se pudo aplicar el código." };
  }

  return { ok: true };
}

/**
 * Resumen del panel de referidos: código, enlace para compartir, lista de
 * referidos y saldo de crédito acumulado (suma del ledger).
 */
export async function getReferralSummary(
  siteUrl: string,
): Promise<ReferralSummary | null> {
  const code = await ensureReferralCode();
  if (!code) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Lectura con RLS (dueño lee lo suyo).
  const [{ data: refs }, { data: credits }] = await Promise.all([
    supabase
      .from("referrals")
      .select("id, referred_user_id, status, credit_amount, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("referral_credits").select("amount"),
  ]);

  const creditBalance = (credits ?? []).reduce(
    (sum, c) => sum + Number(c.amount ?? 0),
    0,
  );

  const base = siteUrl.replace(/\/$/, "");
  return {
    code,
    shareUrl: `${base}/register?ref=${code}`,
    referrals: (refs ?? []).map((r) => ({
      id: r.id as string,
      referredUserId: r.referred_user_id as string,
      status: r.status as ReferralSummary["referrals"][number]["status"],
      creditAmount: Number(r.credit_amount ?? 0),
      createdAt: r.created_at as string,
    })),
    creditBalance,
    currency: DEFAULT_CURRENCY,
  };
}
