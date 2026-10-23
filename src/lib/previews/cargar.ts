import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicInvitation, PublicModule } from "@/lib/invitations/public-types";
import { getInvitationEffectivePlan } from "@/lib/billing/entitlements";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

/**
 * Id que ve la vista pública de una vista previa. NO es el de la invitación.
 *
 * La vista pública pasa `invitation.id` a los módulos que hablan con el servidor
 * (confirmaciones, firmas). Con el id real, quien reciba una liga de una
 * invitación YA PUBLICADA podría enviar confirmaciones reales desde la vista
 * previa. La vista previa renderiza esos módulos de forma estática (ver
 * `vistaPrevia` en `PublicInvitationView`), y además el id es sintético: aunque
 * un cambio futuro volviera a montar un formulario, no podría apuntar al dato
 * real.
 */
export const ID_DE_VISTA_PREVIA = "vista-previa";

/**
 * Lee la invitación con la que se arma la vista previa. Mismos campos que
 * `get_public_invitation`, pero SIN exigir que esté publicada ni que tenga
 * entitlement: ese es justo el propósito (enseñarla antes de pagar).
 *
 * Solo módulos VISIBLES, en su orden, igual que la página pública: la vista
 * previa tiene que mostrar lo que verían los invitados, no lo que el anfitrión
 * dejó oculto.
 *
 * `admin` porque `anon` ya no puede leer `invitations` (migración 0053).
 */
export async function cargarInvitacionDeVistaPrevia(
  admin: AnyClient,
  invitationId: string,
): Promise<PublicInvitation | null> {
  const { data: inv } = await admin
    .from("invitations")
    .select("title, slug, event_type, event_date, theme_config, user_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return null;

  const { data: perfil } = await admin
    .from("profiles")
    .select("display_name, username")
    .eq("id", inv.user_id)
    .maybeSingle();

  const { data: mods } = await admin
    .from("invitation_modules")
    .select("id, module_type, sort_order, is_visible, config")
    .eq("invitation_id", invitationId)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });

  // Plan EFECTIVO (con comp de admin incluido), como la RPC pública: decide el
  // branding. Sin entitlement es Free, es decir marca completa — lo mismo que
  // verían los invitados si se publicara hoy.
  const plan = await getInvitationEffectivePlan(admin, invitationId);

  return {
    id: ID_DE_VISTA_PREVIA,
    title: (inv.title as string | null) ?? "",
    slug: (inv.slug as string | null) ?? "",
    event_type: (inv.event_type as string | null) ?? null,
    event_date: (inv.event_date as string | null) ?? null,
    theme_config: (inv.theme_config as Record<string, unknown> | null) ?? null,
    owner_name: (perfil?.display_name as string | null) ?? null,
    owner_username: (perfil?.username as string | null) ?? "",
    plan_code: plan.code,
    modules: ((mods ?? []) as PublicModule[]).map((m, i) => ({
      // Ids de módulo sintéticos también: nada del dato real sale a la vista. Por
      // posición y no por `sort_order`, que no tiene por qué ser único (y las
      // claves de React duplicadas dan avisos y renders raros).
      id: `${ID_DE_VISTA_PREVIA}-${i}`,
      module_type: m.module_type,
      sort_order: m.sort_order,
      is_visible: true,
      config: m.config,
    })),
  };
}
