"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInvitationEffectivePlan } from "@/lib/billing/entitlements";
import {
  isReservedVanity,
  isValidVanity,
  normalizeVanity,
} from "@/lib/vanity/validate";

/**
 * URL personalizada premium (Fase B). Un plan Premium puede reclamar un slug
 * GLOBAL único → la invitación se sirve también en `/<slug>` (alias de
 * `/<usuario>/<slug>`).
 *
 * Escritura server-side (service_role) tras verificar propiedad + Premium. El
 * slug no puede chocar con rutas de la app (ver validate.ts).
 */

export interface VanityState {
  isPremium: boolean;
  currentVanity: string | null;
}

/** Estado del vanity para el editor: ¿es Premium? ¿ya tiene uno? */
export async function getVanityState(invitationId: string): Promise<VanityState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isPremium: false, currentVanity: null };

  const { data: inv } = await supabase
    .from("invitations")
    .select("id")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!inv) return { isPremium: false, currentVanity: null };

  const admin = createAdminClient();
  const plan = await getInvitationEffectivePlan(admin, invitationId);
  const { data: v } = await admin
    .from("vanity_slugs")
    .select("slug")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  return {
    isPremium: plan.code === "premium",
    currentVanity: (v?.slug as string) ?? null,
  };
}

export interface VanityResult {
  ok: boolean;
  slug?: string;
  error?: string;
}

/** ¿El vanity está libre y es válido? (para el chequeo en vivo). */
export async function checkVanityAvailability(slug: string): Promise<VanityResult> {
  const s = normalizeVanity(slug);
  if (!isValidVanity(s)) {
    return { ok: false, error: "Usa 3–40 letras, números o guiones." };
  }
  if (isReservedVanity(s)) {
    return { ok: false, error: "Ese nombre está reservado." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vanity_slug_available", {
    p_slug: s,
  });
  if (error) return { ok: false, error: "No se pudo verificar." };
  return data ? { ok: true, slug: s } : { ok: false, error: "Ya está ocupado." };
}

/** Reclama (o cambia) el vanity slug de una invitación Premium publicada. */
export async function claimVanitySlug(
  invitationId: string,
  slug: string,
): Promise<VanityResult> {
  const s = normalizeVanity(slug);
  if (!isValidVanity(s)) {
    return { ok: false, error: "Usa 3–40 letras, números o guiones." };
  }
  if (isReservedVanity(s)) {
    return { ok: false, error: "Ese nombre está reservado." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { data: inv } = await supabase
    .from("invitations")
    .select("id, is_published")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Invitación no encontrada." };
  if (!inv.is_published) {
    return { ok: false, error: "Publica la invitación antes de reclamar la URL." };
  }

  const admin = createAdminClient();
  const plan = await getInvitationEffectivePlan(admin, invitationId);
  if (plan.code !== "premium") {
    return { ok: false, error: "La URL personalizada es exclusiva del plan Premium." };
  }

  // Upsert por invitation_id: una vanity por invitación (cambiarla la reemplaza).
  const { error } = await admin
    .from("vanity_slugs")
    .upsert({ invitation_id: invitationId, slug: s }, { onConflict: "invitation_id" });
  if (error) {
    // 23505 → el slug ya lo tiene otra invitación (unique en slug).
    if (error.code === "23505") {
      return { ok: false, error: "Ese nombre ya está ocupado." };
    }
    console.error("[vanity] claim:", error.message);
    return { ok: false, error: "No se pudo reclamar la URL." };
  }
  return { ok: true, slug: s };
}

/** Libera el vanity slug de una invitación. */
export async function releaseVanitySlug(
  invitationId: string,
): Promise<VanityResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { data: inv } = await supabase
    .from("invitations")
    .select("id")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Invitación no encontrada." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("vanity_slugs")
    .delete()
    .eq("invitation_id", invitationId);
  if (error) return { ok: false, error: "No se pudo liberar la URL." };
  return { ok: true };
}
