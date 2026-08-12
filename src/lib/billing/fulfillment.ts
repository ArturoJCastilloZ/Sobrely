import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, resolveExpiry } from "@/lib/billing/plans";
import { DEFAULT_CURRENCY, REFERRAL_CREDIT_AMOUNT } from "@/lib/billing/config";
import {
  mapStatus,
  isRedundantTransition,
  type MpPaymentStatus,
} from "@/lib/billing/mp-status";
import type { PlanCode } from "@/lib/billing/types";

/**
 * Cumplimiento de una orden tras confirmar el pago server-side.
 *
 * Fuente de verdad del estado del pago = la API de Mercado Pago (nunca el
 * navegador). Este módulo es idempotente y solo se ejecuta server-side (webhook
 * o verificación segura de la orden). El mapeo MP→estado interno vive en el
 * módulo puro `mp-status.ts` (testeable sin `server-only`).
 */

export interface FulfillmentResult {
  ok: boolean;
  /** true si la orden ya estaba pagada (webhook duplicado). */
  idempotent?: boolean;
  orderStatus?: string;
  entitlementActivated?: boolean;
  reason?: string;
}

/**
 * Aplica el resultado de un pago a la orden y, si fue aprobado, activa el
 * entitlement de la invitación.
 *
 * @param orderId    id de nuestra orden (external_reference en MP).
 * @param paymentId  id del pago en MP (idempotencia).
 * @param mpStatus   estado real consultado a MP.
 */
export async function applyMercadoPagoPayment(params: {
  orderId: string;
  paymentId: string;
  mpStatus: MpPaymentStatus;
}): Promise<FulfillmentResult> {
  const { orderId, paymentId, mpStatus } = params;
  const admin = createAdminClient();

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, user_id, status, product_type, invitation_id, plan_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr) {
    return { ok: false, reason: `order_lookup_failed: ${orderErr.message}` };
  }
  if (!order) {
    return { ok: false, reason: "order_not_found" };
  }

  const newStatus = mapStatus(mpStatus);

  // Idempotencia: ignora duplicados exactos y no degrada una orden ya `paid`
  // por notificaciones tardías — PERO deja pasar un `refunded` (reembolso o
  // contracargo) para revocar el acceso.
  if (isRedundantTransition(order.status ?? "", newStatus)) {
    return { ok: true, idempotent: true, orderStatus: order.status };
  }

  const { error: updErr } = await admin
    .from("orders")
    .update({ status: newStatus, provider_payment_id: paymentId })
    .eq("id", orderId);

  if (updErr) {
    // El índice único (payment_provider, provider_payment_id) puede rechazar un
    // pago ya registrado en otra orden: se trata como duplicado benigno.
    return { ok: true, idempotent: true, reason: `order_update: ${updErr.message}` };
  }

  // Reembolso / contracargo de un plan: revoca el entitlement (el gate público
  // lo oculta) y despublica la invitación. El dinero ya se devolvió en MP; aquí
  // solo se refleja el estado y se retira el acceso.
  if (
    newStatus === "refunded" &&
    order.product_type === "plan" &&
    order.invitation_id
  ) {
    await admin
      .from("invitation_entitlements")
      .update({ status: "revoked" })
      .eq("invitation_id", order.invitation_id);
    await admin
      .from("invitations")
      .update({ is_published: false, status: "draft" })
      .eq("id", order.invitation_id);
    return { ok: true, orderStatus: "refunded", entitlementActivated: false };
  }

  // Programa de referidos: cualquier compra PAGADA (plan o servicio) del
  // referido acredita al referente. Idempotente y aislado — un fallo aquí no
  // debe tumbar el fulfillment del pago (dominio dinero: el pago manda).
  if (newStatus === "paid" && order.user_id) {
    try {
      await creditReferralIfEligible(admin, order.user_id as string, orderId);
    } catch (err) {
      const m = err instanceof Error ? err.message : "error desconocido";
      console.error("[referrals] crédito de referido falló (no bloquea):", m);
    }
  }

  // Solo un pago aprobado de un plan activa el entitlement.
  if (
    newStatus !== "paid" ||
    order.product_type !== "plan" ||
    !order.invitation_id ||
    !order.plan_id
  ) {
    return { ok: true, orderStatus: newStatus, entitlementActivated: false };
  }

  const { data: planRow } = await admin
    .from("plans")
    .select("code")
    .eq("id", order.plan_id)
    .maybeSingle();

  const plan = planRow ? getPlan(planRow.code as PlanCode) : undefined;
  if (!plan) {
    return {
      ok: false,
      orderStatus: newStatus,
      reason: "plan_config_not_found",
    };
  }

  const { data: invitation } = await admin
    .from("invitations")
    .select("event_date")
    .eq("id", order.invitation_id)
    .maybeSingle();

  const now = new Date();
  const eventDate = invitation?.event_date
    ? new Date(invitation.event_date as string)
    : null;
  const expiresAt = resolveExpiry(plan, now, eventDate);

  const { error: entErr } = await admin.from("invitation_entitlements").upsert(
    {
      invitation_id: order.invitation_id,
      plan_id: order.plan_id,
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      guest_limit: plan.maxGuests,
    },
    { onConflict: "invitation_id" },
  );

  if (entErr) {
    return {
      ok: false,
      orderStatus: newStatus,
      reason: `entitlement_upsert_failed: ${entErr.message}`,
    };
  }

  return { ok: true, orderStatus: "paid", entitlementActivated: true };
}

/**
 * Acredita al referente cuando su referido realiza su primera compra pagada.
 *
 * Idempotente: solo actúa sobre un referral en `pending`; el índice único
 * `referral_credits(referral_id)` impide un doble crédito ante webhooks
 * repetidos. Server-side (service_role) — las tablas de referidos no aceptan
 * escritura desde el cliente.
 *
 * @param admin       cliente service_role.
 * @param referredId  usuario que pagó (posible referido).
 * @param orderId     orden que califica el referido.
 */
async function creditReferralIfEligible(
  admin: SupabaseClient,
  referredId: string,
  orderId: string,
): Promise<void> {
  const { data: referral } = await admin
    .from("referrals")
    .select("id, referrer_user_id, status")
    .eq("referred_user_id", referredId)
    .eq("status", "pending")
    .maybeSingle();

  if (!referral) return; // no referido, o ya acreditado/cancelado.

  const referralId = referral.id as string;
  const referrerId = referral.referrer_user_id as string;
  const amount = REFERRAL_CREDIT_AMOUNT;

  // Marca el referido como acreditado (guard en status='pending' evita carreras).
  const { data: updated } = await admin
    .from("referrals")
    .update({
      status: "credited",
      credit_amount: amount,
      qualifying_order_id: orderId,
      qualified_at: new Date().toISOString(),
    })
    .eq("id", referralId)
    .eq("status", "pending")
    .select("id");

  // Si otra ejecución ya lo movió, no insertamos crédito (evita duplicado).
  if (!updated || updated.length === 0) return;

  const { error: credErr } = await admin.from("referral_credits").insert({
    user_id: referrerId,
    amount,
    currency: DEFAULT_CURRENCY,
    source: "referral",
    referral_id: referralId,
  });

  // 23505 = el crédito de este referral ya existe (índice único): benigno.
  if (credErr && credErr.code !== "23505") {
    console.error("[referrals] insert referral_credits:", credErr.message);
  }
}
