import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, resolveExpiry } from "@/lib/billing/plans";
import { canPublishInvitation } from "@/lib/billing/entitlements";
import { decidirEntitlement } from "@/lib/billing/no-degradar-entitlement";
import {
  puedeQuedarEntitlementPendiente,
  hayEntitlementPendiente,
} from "@/lib/billing/reentrada-fulfillment";
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
  /** true si se auto-publicó la invitación (checkout desde "Publicar"). */
  published?: boolean;
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
    .select("id, user_id, status, product_type, invitation_id, plan_id, metadata")
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
    // ...salvo que todavía quede TRABAJO por hacer. Este guard mira sólo el
    // estado de la ORDEN, y lo que puede faltar es el ENTITLEMENT: si el
    // `UPDATE` a `paid` commiteó y después falló la escritura del acceso,
    // devolvimos `ok: false` para que MP reintentara — y el reintento entraba
    // justo aquí y se cortaba con `ok: true`. El cliente pagaba y no tenía
    // acceso, sin un solo aviso. Ver `reentrada-fulfillment.ts`.
    const reentrada = { reentrar: false, motivo: "" };
    if (
      puedeQuedarEntitlementPendiente({
        nuevoEstado: newStatus,
        productType: order.product_type ?? null,
        invitationId: order.invitation_id ?? null,
        planId: order.plan_id ?? null,
      })
    ) {
      const { data: entVivo, error: entVivoErr } = await admin
        .from("invitation_entitlements")
        .select("status")
        .eq("invitation_id", order.invitation_id)
        .maybeSingle();

      if (entVivoErr) {
        // Fail-closed: sin saber si hay acceso no se puede afirmar que no
        // queda trabajo, y decir `ok: true` aquí es cerrar la puerta otra vez.
        return {
          ok: false,
          orderStatus: order.status ?? undefined,
          reason: `reentrada_lookup_failed: ${entVivoErr.message}`,
        };
      }
      if (hayEntitlementPendiente(entVivo)) {
        reentrada.reentrar = true;
        reentrada.motivo = entVivo
          ? `entitlement en '${entVivo.status}'`
          : "sin entitlement";
      }
    }

    if (!reentrada.reentrar) {
      return { ok: true, idempotent: true, orderStatus: order.status };
    }
    console.error(
      "[fulfillment] reentrando en una orden ya `paid` porque falta el acceso:",
      { orderId, motivo: reentrada.motivo },
    );
  }

  const { data: ordenTocada, error: updErr } = await admin
    .from("orders")
    .update({ status: newStatus, provider_payment_id: paymentId })
    .eq("id", orderId)
    .select("id");

  if (updErr) {
    // SOLO el `23505` del índice único (payment_provider,
    // provider_payment_id) es un duplicado benigno: ese pago ya está
    // registrado en otra orden.
    //
    // Antes se devolvía `ok: true` ante CUALQUIER error, y eso es dinero
    // perdido: el webhook responde 200, **Mercado Pago deja de reintentar**, la
    // orden se queda en `pending` y el entitlement nunca se crea. El cliente
    // pagó y no tiene acceso, sin un solo aviso. La dirección segura es la
    // contraria — `ok: false` hace que la ruta devuelva 500 y MP lo reintente.
    if (updErr.code === "23505") {
      return {
        ok: true,
        idempotent: true,
        reason: `order_update_duplicado: ${updErr.message}`,
      };
    }
    return {
      ok: false,
      orderStatus: order.status ?? undefined,
      reason: `order_update_failed: ${updErr.message}`,
    };
  }
  if (!ordenTocada || ordenTocada.length === 0) {
    // En PostgREST un update que no encuentra fila NO es error. Seguir aquí
    // dejaría la orden con su estado viejo y activaría el entitlement igual.
    return { ok: false, reason: "order_update_sin_filas" };
  }

  // Reembolso / contracargo de un plan: revoca el entitlement (el gate público
  // lo oculta) y despublica la invitación. El dinero ya se devolvió en MP; aquí
  // solo se refleja el estado y se retira el acceso.
  if (
    newStatus === "refunded" &&
    order.product_type === "plan" &&
    order.invitation_id
  ) {
    // Sin `plan_id` no se puede saber QUÉ se está reembolsando. Se elige no
    // tocar nada: quitarle el acceso a quien sí pagó —y despublicarle su
    // invitación en vivo— es peor que dejar un reembolso sin reflejar, y esto
    // último un humano lo puede ver y arreglar. Se grita en el log.
    if (!order.plan_id) {
      console.error(
        "[fulfillment] reembolso de un plan SIN plan_id; no se revoca nada:",
        orderId,
      );
      return {
        ok: true,
        orderStatus: "refunded",
        entitlementActivated: false,
        reason: "refund_sin_plan_id_revision_manual",
      };
    }

    // El filtro por `plan_id` es LO QUE ARREGLA EL DEFECTO. Antes se filtraba
    // sólo por `invitation_id`, así que reembolsar el plan barato revocaba el
    // entitlement de la invitación **aunque estuviera pagada con el caro**, y
    // encima la despublicaba. Ahora sólo se revoca si el acceso vivo es el de
    // ESTA orden.
    const { data: revocados, error: revErr } = await admin
      .from("invitation_entitlements")
      .update({ status: "revoked" })
      .eq("invitation_id", order.invitation_id)
      .eq("plan_id", order.plan_id)
      .eq("status", "active")
      .select("invitation_id");

    if (revErr) {
      return {
        ok: false,
        orderStatus: "refunded",
        reason: `entitlement_revoke_failed: ${revErr.message}`,
      };
    }

    if (!revocados || revocados.length === 0) {
      // El entitlement vivo es de otro plan (o ya estaba revocado). No se toca
      // y, sobre todo, NO se despublica: ese acceso lo pagó otra orden.
      return {
        ok: true,
        orderStatus: "refunded",
        entitlementActivated: false,
        reason: "entitlement_de_otro_plan_no_se_revoca",
      };
    }

    const { error: pubErr } = await admin
      .from("invitations")
      .update({ is_published: false, status: "draft" })
      .eq("id", order.invitation_id)
      .select("id");
    if (pubErr) {
      // El acceso YA está revocado, así que el gate público la oculta igual.
      // Se reporta el fallo para que MP reintente y la bandera se reconcilie.
      return {
        ok: false,
        orderStatus: "refunded",
        reason: `unpublish_failed: ${pubErr.message}`,
      };
    }
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

  // NO DEGRADAR. El `upsert` a secas reemplazaba la fila, asi que un pago de un
  // plan inferior se comia un entitlement activo de un plan superior: el
  // cliente pagaba Esencial teniendo Premium vigente y se quedaba con Esencial.
  // La decision vive en `no-degradar-entitlement.ts`, donde SI se puede probar.
  const { data: filaActual, error: leerErr } = await admin
    .from("invitation_entitlements")
    .select("plan_id, status, expires_at, plan:plans(code)")
    .eq("invitation_id", order.invitation_id)
    .maybeSingle();

  if (leerErr) {
    return {
      ok: false,
      orderStatus: newStatus,
      reason: `entitlement_lookup_failed: ${leerErr.message}`,
    };
  }

  const codigoActual = (
    filaActual?.plan as { code?: string } | { code?: string }[] | null
  );
  const codeActual = Array.isArray(codigoActual)
    ? codigoActual[0]?.code
    : codigoActual?.code;

  const decision = decidirEntitlement({
    planPagado: plan.code,
    expiraPagado: expiresAt,
    actual:
      filaActual && codeActual
        ? {
            planCode: codeActual as PlanCode,
            status: String(filaActual.status ?? ""),
            expiresAt: filaActual.expires_at
              ? new Date(filaActual.expires_at as string)
              : null,
          }
        : null,
    ahora: now,
  });

  if (decision.accion === "no-degradar") {
    // La orden queda `paid` —el dinero entro— y el acceso se conserva como
    // estaba. Se reporta el motivo para que se vea en el log del webhook.
    console.error(
      "[fulfillment] pago que NO se aplica para no degradar el acceso:",
      { orderId, motivo: decision.motivo },
    );
    return {
      ok: true,
      orderStatus: newStatus,
      entitlementActivated: false,
      reason: `no_degradar: ${decision.motivo}`,
    };
  }

  // El plan que se escribe puede NO ser el pagado (si se conserva uno
  // superior), asi que el `plan_id` y el cupo se resuelven del plan DECIDIDO.
  const planEscrito = getPlan(decision.planCode);
  if (!planEscrito) {
    return { ok: false, orderStatus: newStatus, reason: "plan_config_not_found" };
  }
  const planIdEscrito =
    decision.planCode === plan.code ? order.plan_id : filaActual?.plan_id;

  const { data: entFilas, error: entErr } = await admin
    .from("invitation_entitlements")
    .upsert(
      {
        invitation_id: order.invitation_id,
        plan_id: planIdEscrito,
        status: "active",
        starts_at: now.toISOString(),
        expires_at: decision.expiresAt.toISOString(),
        guest_limit: planEscrito.maxGuests,
      },
      { onConflict: "invitation_id" },
    )
    .select("invitation_id");

  if (entErr) {
    return {
      ok: false,
      orderStatus: newStatus,
      reason: `entitlement_upsert_failed: ${entErr.message}`,
    };
  }
  if (!entFilas || entFilas.length === 0) {
    // Cobrado y sin acceso es el peor desenlace posible: se falla para que MP
    // reintente en vez de responder 200 sobre una escritura que no ocurrio.
    return {
      ok: false,
      orderStatus: newStatus,
      reason: "entitlement_upsert_sin_filas",
    };
  }

  // Auto-publicación: SOLO si el checkout salió del botón "Publicar"
  // (metadata.publish_on_paid) y los módulos visibles caben en el plan recién
  // activado. Si el usuario agregó módulos ⭐ extra después de pagar, el gate
  // falla y se deja como borrador (no se auto-publica algo no cubierto).
  const publishOnPaid =
    (order.metadata as { publish_on_paid?: boolean } | null)?.publish_on_paid ===
    true;
  let published = false;
  if (publishOnPaid) {
    const check = await canPublishInvitation(admin, order.invitation_id);
    if (check.allowed) {
      const { error: pubErr } = await admin
        .from("invitations")
        .update({ is_published: true, status: "published" })
        .eq("id", order.invitation_id);
      published = !pubErr;
    }
  }

  return {
    ok: true,
    orderStatus: "paid",
    entitlementActivated: true,
    published,
  };
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
