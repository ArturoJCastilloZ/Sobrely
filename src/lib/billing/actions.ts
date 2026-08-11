"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mpPreference } from "@/lib/billing/mercadopago";
import { getEffectivePrice, getPlan } from "@/lib/billing/plans";
import { getStorageStatus } from "@/lib/billing/entitlements";
import type { PlanCode } from "@/lib/billing/types";

/**
 * Server Action: inicia el checkout de un plan por evento con Mercado Pago
 * (Checkout Pro).
 *
 * Flujo: valida sesión + propiedad de la invitación → registra la orden
 * `pending` (con el cliente admin, porque `orders` no acepta escritura desde el
 * cliente) → crea la preferencia de MP con `external_reference` = id de la orden
 * y `notification_url` al webhook → devuelve el `init_point` para redirigir.
 *
 * La activación del plan NO ocurre aquí: depende de la confirmación server-side
 * del webhook (ver fulfillment).
 */
export interface CheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export interface UploadQuotaResult {
  allowed: boolean;
  usedMb: number;
  limitMb: number;
  error?: string;
}

/**
 * Barrera server-side de cuota de almacenamiento antes de subir una imagen.
 * El uploader la llama con el tamaño (comprimido) a subir. Verifica propiedad y
 * calcula el uso contra el plan efectivo de la invitación.
 */
export async function checkUploadQuota(
  invitationId: string,
  addBytes: number,
): Promise<UploadQuotaResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { allowed: false, usedMb: 0, limitMb: 0, error: "Sesión expirada." };
  }

  const { data: inv } = await supabase
    .from("invitations")
    .select("id")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!inv) {
    return { allowed: false, usedMb: 0, limitMb: 0, error: "No autorizado." };
  }

  const admin = createAdminClient();
  const status = await getStorageStatus(admin, user.id, invitationId, addBytes);
  return {
    allowed: status.allowed,
    usedMb: status.usedMb,
    limitMb: status.limitMb,
  };
}

export async function createPlanCheckout(
  planCode: PlanCode,
  invitationId: string,
): Promise<CheckoutResult> {
  const plan = getPlan(planCode);
  if (!plan || !plan.isActive) {
    return { ok: false, error: "Plan no disponible." };
  }
  if (plan.billingType !== "per_event") {
    return { ok: false, error: "Este plan no requiere pago." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  // Propiedad de la invitación (RLS ya lo garantiza, pero validamos explícito).
  const { data: invitation, error: invErr } = await supabase
    .from("invitations")
    .select("id, user_id, title")
    .eq("id", invitationId)
    .maybeSingle();
  if (invErr || !invitation || invitation.user_id !== user.id) {
    return { ok: false, error: "Invitación no encontrada." };
  }

  // URL base PÚBLICA para las back_urls y el webhook. Mercado Pago exige que la
  // back_url sea pública para usar `auto_return`; en localhost eso falla, así
  // que se usa `MP_PUBLIC_BASE_URL` (p.ej. la URL del túnel en pruebas) y, si no
  // es https, se omite `auto_return` para no romper el checkout en dev local.
  const baseUrl = process.env.MP_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    return { ok: false, error: "Configuración del sitio incompleta." };
  }
  const isPublicHttps = baseUrl.startsWith("https://");

  const admin = createAdminClient();

  // plan_id real desde la BD (la config tipada es la fuente; la BD guarda el id).
  const { data: planRow, error: planErr } = await admin
    .from("plans")
    .select("id")
    .eq("code", plan.code)
    .maybeSingle();
  if (planErr || !planRow) {
    return { ok: false, error: "Plan no encontrado en la base de datos." };
  }

  const amount = getEffectivePrice(plan);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      invitation_id: invitation.id,
      plan_id: planRow.id,
      product_type: "plan",
      amount,
      currency: plan.currency,
      status: "pending",
      payment_provider: "mercadopago",
      metadata: { plan_code: plan.code, invitation_title: invitation.title },
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return { ok: false, error: "No se pudo registrar la orden." };
  }

  try {
    const pref = await mpPreference().create({
      body: {
        items: [
          {
            id: plan.code,
            title: `InvitaFlow — Plan ${plan.name}`,
            quantity: 1,
            unit_price: amount,
            currency_id: plan.currency,
          },
        ],
        external_reference: order.id,
        back_urls: {
          success: `${baseUrl}/billing/success?order=${order.id}`,
          pending: `${baseUrl}/billing/pending?order=${order.id}`,
          failure: `${baseUrl}/billing/cancel?order=${order.id}`,
        },
        // auto_return solo con back_urls públicas (https); MP lo rechaza en localhost.
        ...(isPublicHttps ? { auto_return: "approved" as const } : {}),
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        metadata: { order_id: order.id, plan_code: plan.code },
      },
    });

    const initPoint = pref.init_point ?? pref.sandbox_init_point;
    if (!initPoint) {
      return { ok: false, error: "Mercado Pago no devolvió un enlace de pago." };
    }

    await admin
      .from("orders")
      .update({ provider_order_id: pref.id })
      .eq("id", order.id);

    return { ok: true, url: initPoint };
  } catch (err) {
    // Deja la orden como fallida para no dejar 'pending' colgado.
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    const message = err instanceof Error ? err.message : "error desconocido";
    console.error("[mercadopago] create preference failed:", message);
    return { ok: false, error: "No se pudo iniciar el pago." };
  }
}
