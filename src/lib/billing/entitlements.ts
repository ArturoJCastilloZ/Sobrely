import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModuleType } from "@/lib/modules/types";
import type { Plan, PlanCode, PlanFeature } from "@/lib/billing/types";
import {
  getPlan,
  minimalPlanForModules,
  minimalPlanForFeature,
  planAllowsModule,
  planHasFeature,
} from "@/lib/billing/plans";
import { parseTheme } from "@/lib/theme/theme";
import { isThemePackPremium } from "@/lib/theme/theme-packs";

/**
 * Helpers de ENTITLEMENTS (Subfase 8.4).
 *
 * Verifican en SERVIDOR qué puede hacer una invitación según su plan efectivo.
 * El frontend puede ocultar botones, pero estas funciones son la capa real de
 * autorización (server actions / route handlers). NUNCA confiar solo en el
 * cliente.
 *
 * Reciben un `SupabaseClient` para poder usarse tanto con el cliente del
 * usuario (lectura del propio entitlement vía RLS) como con el cliente admin
 * (contextos anónimos como el RSVP público, que no pueden leer por RLS).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

const FREE_PLAN = getPlan("free")!;

export interface EntitlementInfo {
  planCode: PlanCode;
  status: string;
  expiresAt: Date | null;
  guestLimit: number | null;
  isActive: boolean;
}

/** Lee el entitlement de una invitación (o null si no tiene). */
export async function getInvitationEntitlement(
  supabase: AnyClient,
  invitationId: string,
): Promise<EntitlementInfo | null> {
  const { data } = await supabase
    .from("invitation_entitlements")
    .select("status, expires_at, guest_limit, plan:plans(code)")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  if (!data) return null;

  const expiresAt = data.expires_at ? new Date(data.expires_at as string) : null;
  const isActive =
    data.status === "active" && (!expiresAt || expiresAt > new Date());
  // El join a `plans` puede tiparse como objeto o arreglo según la inferencia.
  const planRel = data.plan as
    | { code?: string }
    | { code?: string }[]
    | null;
  const rawCode = Array.isArray(planRel) ? planRel[0]?.code : planRel?.code;
  const planCode = (rawCode as PlanCode | undefined) ?? "free";

  return {
    planCode,
    status: data.status as string,
    expiresAt,
    guestLimit: (data.guest_limit as number | null) ?? null,
    isActive,
  };
}

/** ¿La invitación tiene un entitlement vigente ahora? */
export async function isEntitlementActive(
  supabase: AnyClient,
  invitationId: string,
): Promise<boolean> {
  const ent = await getInvitationEntitlement(supabase, invitationId);
  return ent?.isActive ?? false;
}

/**
 * Plan EFECTIVO de una invitación: el del entitlement activo, o Free como base.
 */
export async function getInvitationEffectivePlan(
  supabase: AnyClient,
  invitationId: string,
): Promise<Plan> {
  const ent = await getInvitationEntitlement(supabase, invitationId);
  if (ent?.isActive) {
    return getPlan(ent.planCode) ?? FREE_PLAN;
  }
  return FREE_PLAN;
}

/** Plan base del usuario (profiles.plan). Baseline; el plan real es por invitación. */
export async function getUserPlan(
  supabase: AnyClient,
  userId: string,
): Promise<Plan> {
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  return getPlan((data?.plan as PlanCode) ?? "free") ?? FREE_PLAN;
}

/** ¿El plan permite el módulo? (re-export tipado para uso en enforcement). */
export function canUseModule(plan: Plan, moduleType: ModuleType): boolean {
  return planAllowsModule(plan, moduleType);
}

/** ¿El plan incluye la capacidad? */
export function canUseFeature(plan: Plan, feature: PlanFeature): boolean {
  return planHasFeature(plan, feature);
}

/** Borradores ilimitados: crear invitación siempre permitido. */
export function canCreateInvitation(): boolean {
  return true;
}

export interface PublishCheck {
  allowed: boolean;
  effectivePlanCode: PlanCode;
  /** Módulos usados que el plan efectivo no cubre (⭐ premium). */
  premiumModulesUsed: ModuleType[];
  /** Key del theme pack premium aplicado que el plan no desbloquea (o undefined). */
  premiumThemePackUsed?: string;
  /** Plan más barato que desbloquearía todo lo usado (CTA de upgrade). */
  requiredPlanCode?: PlanCode;
  reason?: string;
}

/**
 * ¿Se puede publicar la invitación con su plan efectivo?
 *
 * Regla: todos los módulos VISIBLES deben estar cubiertos por el plan efectivo,
 * y si la invitación tiene aplicado un theme pack ⭐ premium, el plan debe
 * incluir `advanced_personalization`. Si algo excede el plan se bloquea y se
 * indica el plan mínimo que lo desbloquea (el más alto que cubra módulos Y
 * temática). NUNCA se borran los módulos ni el tema bloqueados (se conservan
 * para que el usuario pueda actualizar y publicar después).
 */
export async function canPublishInvitation(
  supabase: AnyClient,
  invitationId: string,
): Promise<PublishCheck> {
  const plan = await getInvitationEffectivePlan(supabase, invitationId);

  const { data: mods } = await supabase
    .from("invitation_modules")
    .select("module_type, is_visible")
    .eq("invitation_id", invitationId);

  const visible = (mods ?? [])
    .filter((m) => m.is_visible !== false)
    .map((m) => m.module_type as ModuleType);

  const premiumModulesUsed = visible.filter((m) => !planAllowsModule(plan, m));

  // Gate de temática: un theme pack ⭐ premium exige advanced_personalization.
  const { data: inv } = await supabase
    .from("invitations")
    .select("theme_config")
    .eq("id", invitationId)
    .maybeSingle();
  const parsedTheme = parseTheme(inv?.theme_config);
  const themePackKey = parsedTheme.themePack;
  const themePackGated =
    isThemePackPremium(themePackKey) &&
    !planHasFeature(plan, "advanced_personalization");
  const premiumThemePackUsed = themePackGated ? themePackKey : undefined;

  // Gate de arte propio (B2, Premium): fondo de imagen (y stickers en B2.2).
  const customArtGated =
    Boolean(parsedTheme.backgroundImage?.url) &&
    !planHasFeature(plan, "custom_art");

  if (premiumModulesUsed.length === 0 && !themePackGated && !customArtGated) {
    return { allowed: true, effectivePlanCode: plan.code, premiumModulesUsed: [] };
  }

  // Plan requerido = el más alto entre el que cubre los módulos y el que
  // desbloquea la temática premium (si aplica cada uno).
  const requiredForModules =
    premiumModulesUsed.length > 0 ? minimalPlanForModules(visible) : undefined;
  const requiredForTheme = themePackGated
    ? minimalPlanForFeature("advanced_personalization")
    : undefined;
  const requiredForArt = customArtGated
    ? minimalPlanForFeature("custom_art")
    : undefined;
  const candidates = [
    requiredForModules,
    requiredForTheme,
    requiredForArt,
  ].filter((p): p is Plan => Boolean(p));
  const required =
    candidates.length > 0
      ? candidates.sort((a, b) => b.displayOrder - a.displayOrder)[0]
      : undefined;

  const reasonParts: string[] = [];
  if (premiumModulesUsed.length > 0) reasonParts.push("módulos");
  if (themePackGated) reasonParts.push("una temática");
  if (customArtGated) reasonParts.push("arte propio");
  const what = reasonParts.join(" y ");

  return {
    allowed: false,
    effectivePlanCode: plan.code,
    premiumModulesUsed,
    premiumThemePackUsed,
    requiredPlanCode: required?.code,
    reason: required
      ? `Tu invitación usa ${what} que requieren el plan ${required.name}.`
      : `Tu invitación usa ${what} no disponibles en ningún plan activo.`,
  };
}

export interface GuestCheck {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
}

/**
 * ¿Cabe una confirmación de `addGuests` invitados sin pasar el tope del plan?
 * Suma los `guest_count` existentes. Usar con cliente ADMIN (el RSVP es anónimo
 * y RLS no le deja leer). El tope sale del entitlement; si no hay, cae al Free.
 */
export async function canAddGuest(
  admin: AnyClient,
  invitationId: string,
  addGuests: number,
): Promise<GuestCheck> {
  const ent = await getInvitationEntitlement(admin, invitationId);
  const limit = ent?.guestLimit ?? FREE_PLAN.maxGuests;

  const { data: rows } = await admin
    .from("rsvp_responses")
    .select("guest_count")
    .eq("invitation_id", invitationId);

  const used = (rows ?? []).reduce(
    (sum, r) => sum + ((r.guest_count as number) ?? 0),
    0,
  );

  return {
    allowed: used + addGuests <= limit,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

export interface StorageStatus {
  usedMb: number;
  limitMb: number;
  remainingMb: number;
  allowed: boolean;
}

/**
 * Uso de almacenamiento de una invitación (suma de bytes en su carpeta del
 * bucket) contra la cuota del plan efectivo. Usar con cliente ADMIN.
 *
 * Nota: la subida hoy ocurre directo desde el cliente; este chequeo es una
 * barrera server-side previa. El enforcement DURO (que un usuario no pueda
 * saltarse la cuota subiendo directo a Storage) requiere mover la subida a un
 * route handler o una policy de Storage — anotado como pendiente.
 */
export async function getStorageStatus(
  admin: AnyClient,
  userId: string,
  invitationId: string,
  addBytes = 0,
): Promise<StorageStatus> {
  const plan = await getInvitationEffectivePlan(admin, invitationId);
  const folder = `${userId}/${invitationId}`;

  const { data: files } = await admin.storage
    .from("invitation-images")
    .list(folder, { limit: 1000 });

  const usedBytes = (files ?? []).reduce((sum, f) => {
    const size = (f.metadata as { size?: number } | null)?.size ?? 0;
    return sum + size;
  }, 0);

  const usedMb = usedBytes / (1024 * 1024);
  const limitMb = plan.maxStorageMb;
  const projectedMb = (usedBytes + addBytes) / (1024 * 1024);

  return {
    usedMb: Math.round(usedMb * 100) / 100,
    limitMb,
    remainingMb: Math.max(0, Math.round((limitMb - usedMb) * 100) / 100),
    allowed: projectedMb <= limitMb,
  };
}
