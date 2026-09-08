"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultConfigFor, type ModuleType } from "@/lib/modules/types";
import { saveEditorSchema, type SaveEditorInput } from "@/lib/invitations/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canPublishInvitation,
  getInvitationEntitlement,
  isOwnerComped,
} from "@/lib/billing/entitlements";
import { getPlan, resolveExpiry } from "@/lib/billing/plans";
import { templateToDocument } from "@/lib/invitations/template-render";
import type { PlanCode } from "@/lib/billing/types";

/** Short random suffix to keep slugs unique per user without a lookup loop. */
function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Creates a blank invitation (with a default Hero module) and redirects the
 * user into its editor.
 */
export async function createInvitation(
  mode: "open" | "guest_list" = "open",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rsvpMode = mode === "guest_list" ? "guest_list" : "open";
  const slug = `invitacion-${randomSuffix()}`;

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      user_id: user.id,
      title: "Invitación sin título",
      slug,
      status: "draft",
      is_published: false,
      rsvp_mode: rsvpMode,
    })
    .select("id")
    .single();

  if (error || !invitation) {
    throw new Error(error?.message ?? "No se pudo crear la invitación.");
  }

  // Seed a default Hero module so the preview isn't empty.
  const modules: {
    invitation_id: string;
    module_type: ModuleType;
    sort_order: number;
    is_visible: boolean;
    config: Record<string, unknown>;
  }[] = [
    {
      invitation_id: invitation.id,
      module_type: "hero",
      sort_order: 0,
      is_visible: true,
      config: defaultConfigFor("hero"),
    },
  ];

  // En modo lista de invitados el RSVP es obligatorio: se auto-agrega, y como
  // el cupo lo asigna el organizador, se apaga "pedir número de invitados".
  if (rsvpMode === "guest_list") {
    modules.push({
      invitation_id: invitation.id,
      module_type: "rsvp",
      sort_order: 1,
      is_visible: true,
      config: { ...defaultConfigFor("rsvp"), allowGuestCount: false },
    });
  }

  await supabase.from("invitation_modules").insert(modules);

  revalidatePath("/dashboard");
  redirect(`/editor/${invitation.id}`);
}

/**
 * Creates a new invitation from a template, copying its theme and modules,
 * then redirects into the editor.
 */
export async function createFromTemplate(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Templates are publicly readable when active (RLS).
  const { data: template, error: tplErr } = await supabase
    .from("templates")
    .select("id, name, event_type, theme_config, modules_config, is_active")
    .eq("id", templateId)
    .eq("is_active", true)
    .single();

  if (tplErr || !template) {
    throw new Error("La plantilla no existe o no está disponible.");
  }

  const slug = `invitacion-${randomSuffix()}`;

  // UNA sola fuente para "que produce esta plantilla". La galeria captura sus
  // miniaturas con esta misma funcion, asi que lo que se ve en el catalogo es
  // por construccion lo que se recibe al elegirla.
  const doc = templateToDocument(template);

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      user_id: user.id,
      template_id: template.id,
      title: template.name ?? "Invitación sin título",
      slug,
      event_type: template.event_type ?? null,
      status: "draft",
      is_published: false,
      theme_config: doc.theme,
    })
    .select("id")
    .single();

  if (error || !invitation) {
    throw new Error(error?.message ?? "No se pudo crear la invitación.");
  }

  const modules = doc.modules;

  if (modules.length > 0) {
    await supabase.from("invitation_modules").insert(
      modules.map((m) => ({
        invitation_id: invitation.id,
        module_type: m.module_type,
        sort_order: m.sort_order,
        is_visible: m.is_visible,
        config: m.config,
      })),
    );
  }

  revalidatePath("/dashboard");
  redirect(`/editor/${invitation.id}`);
}

export type SetPublishedResult =
  | { ok: true; is_published: boolean }
  | { ok: false; error: string; requiredPlan?: PlanCode; needsUpgrade?: boolean };

/**
 * Publica o despublica una invitación (solo el dueño).
 *
 * Gate de entitlements (Subfase 8.4): al PUBLICAR, todos los módulos visibles
 * deben estar cubiertos por el plan efectivo. Si usa módulos ⭐ sin un plan
 * pagado que los cubra, se bloquea con el plan requerido (para el CTA de compra
 * de la 8.5) y NO se borra nada. Si el plan efectivo es Free (sin entitlement
 * pagado), se publica como DEMO creando un entitlement Free con vigencia de 14
 * días (server-side, con el cliente admin).
 */
export async function setPublished(
  invitationId: string,
  published: boolean,
): Promise<SetPublishedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // Despublicar: solo apaga la bandera.
  if (!published) {
    const { error } = await supabase
      .from("invitations")
      .update({ is_published: false, status: "draft" })
      .eq("id", invitationId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/editor/${invitationId}`);
    revalidatePath("/dashboard");
    return { ok: true, is_published: false };
  }

  // Publicar: verifica propiedad y trae la fecha del evento.
  const { data: inv, error: invErr } = await supabase
    .from("invitations")
    .select("id, event_date")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (invErr || !inv) {
    return { ok: false, error: "No tienes acceso a esta invitación." };
  }

  // Gate: módulos ⊆ plan efectivo.
  const check = await canPublishInvitation(supabase, invitationId);
  if (!check.allowed) {
    return {
      ok: false,
      error:
        check.reason ??
        "Necesitas un plan superior para publicar esta invitación.",
      requiredPlan: check.requiredPlanCode,
      needsUpgrade: true,
    };
  }

  // Sin entitlement activo → publicación DEMO en Free (14 días). El comp de
  // admin NO crea la fila: sería un entitlement Free (branding y `guest_limit`
  // de Free) encima del plan de cortesía, y al vencer ensuciaría el estado.
  // `is_entitlement_active` en la BD ya deja pública la invitación comped.
  const ent = await getInvitationEntitlement(supabase, invitationId);
  const comped = await isOwnerComped(supabase, invitationId);
  if (!ent?.isActive && !comped) {
    const free = getPlan("free")!;
    const now = new Date();
    const eventDate = inv.event_date ? new Date(inv.event_date as string) : null;
    const expiresAt = resolveExpiry(free, now, eventDate);

    const admin = createAdminClient();
    const { data: planRow } = await admin
      .from("plans")
      .select("id")
      .eq("code", "free")
      .maybeSingle();
    if (planRow) {
      await admin.from("invitation_entitlements").upsert(
        {
          invitation_id: invitationId,
          plan_id: planRow.id,
          status: "active",
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          guest_limit: free.maxGuests,
        },
        { onConflict: "invitation_id" },
      );
    }
  }

  const { error } = await supabase
    .from("invitations")
    .update({ is_published: true, status: "published" })
    .eq("id", invitationId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/editor/${invitationId}`);
  revalidatePath("/dashboard");
  return { ok: true, is_published: true };
}

export async function deleteInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS also enforces ownership; the explicit filter keeps intent clear.
  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export type SavedModule = {
  id: string;
  module_type: string;
  sort_order: number;
  is_visible: boolean;
  config: Record<string, unknown>;
};

export type SaveEditorResult =
  | { ok: true; modules: SavedModule[]; version: number }
  /**
   * `conflict` distingue "otra pestaña guardó antes que tú" de un error
   * cualquiera. El editor lo necesita para PARAR de guardar en vez de mostrar
   * un toast y seguir reintentando: reintentar un conflicto no lo resuelve,
   * solo repite el aviso.
   */
  | { ok: false; error: string; conflict?: true };

/**
 * Persists the full editor state: invitation settings + the module list.
 * New modules (temp ids) are inserted, removed ones deleted, the rest updated.
 */
export async function saveEditor(
  input: SaveEditorInput,
): Promise<SaveEditorResult> {
  const parsed = saveEditorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  const { invitationId, version, settings, theme, modules } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // Verify ownership up front (defense in depth alongside RLS). Trae también
  // la versión, solo para poder distinguir "no es tuya / ya no existe" de
  // "otra pestaña se te adelantó" cuando el compare-and-set de abajo no
  // afecte ninguna fila. Este chequeo es INFORMATIVO: la defensa real es el
  // `where version = ...` de la sentencia siguiente.
  const { data: owned, error: ownErr } = await supabase
    .from("invitations")
    .select("id, version")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .single();
  if (ownErr || !owned) {
    return { ok: false, error: "No tienes acceso a esta invitación." };
  }

  // 1) Update invitation settings — compare-and-set de la versión.
  //
  // El `where version = <esperada>` y el `version = <esperada> + 1` van en la
  // MISMA sentencia, así que de N guardados concurrentes con la misma versión
  // esperada pasa exactamente uno: los demás afectan 0 filas. Leer la versión
  // en una consulta y escribirla en otra no defendería nada — es la lección
  // que dejó el contador de intentos del reporte con PIN (`0020`).
  //
  // `select().maybeSingle()` es lo que permite CONTAR las filas afectadas: sin
  // el select, PostgREST no devuelve el cuerpo y un update que no tocó nada es
  // indistinguible de uno que sí.
  const { data: bumped, error: updErr } = await supabase
    .from("invitations")
    .update({
      title: settings.title,
      slug: settings.slug,
      event_type: settings.eventType || null,
      event_date: settings.eventDate || null,
      theme_config: theme,
      version: version + 1,
    })
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .eq("version", version)
    .select("version")
    .maybeSingle();

  if (updErr) {
    if (updErr.code === "23505") {
      return { ok: false, error: "Ya tienes otra invitación con ese slug." };
    }
    return { ok: false, error: updErr.message };
  }

  // 0 filas afectadas con la invitación existente y siendo tuya = la versión
  // no coincidió. Se responde ANTES de tocar los módulos, así que un conflicto
  // no deja nada escrito a medias: ni ajustes, ni borrados, ni inserciones.
  if (!bumped) {
    return {
      ok: false,
      conflict: true,
      error:
        "Otra pestaña o dispositivo guardó cambios más nuevos. Recarga para no borrar ese trabajo.",
    };
  }

  // 2) Reconcile modules.
  const { data: existing } = await supabase
    .from("invitation_modules")
    .select("id")
    .eq("invitation_id", invitationId);

  const existingIds = new Set((existing ?? []).map((m) => m.id as string));
  const keptIds = new Set(
    modules.map((m) => m.id).filter((id) => existingIds.has(id)),
  );

  // Delete modules removed in the editor.
  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("invitation_modules")
      .delete()
      .in("id", toDelete);
    if (delErr) return { ok: false, error: delErr.message };
  }

  // Update existing modules.
  for (const mod of modules) {
    if (existingIds.has(mod.id)) {
      const { error } = await supabase
        .from("invitation_modules")
        .update({
          module_type: mod.module_type,
          sort_order: mod.sort_order,
          is_visible: mod.is_visible,
          config: mod.config,
        })
        .eq("id", mod.id)
        .eq("invitation_id", invitationId);
      if (error) return { ok: false, error: error.message };
    }
  }

  // Insert new modules (temp ids).
  const toInsert = modules
    .filter((m) => !existingIds.has(m.id))
    .map((m) => ({
      invitation_id: invitationId,
      module_type: m.module_type,
      sort_order: m.sort_order,
      is_visible: m.is_visible,
      config: m.config,
    }));
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from("invitation_modules")
      .insert(toInsert);
    if (insErr) return { ok: false, error: insErr.message };
  }

  // Re-read the reconciled module list so the client can adopt real DB ids.
  const { data: fresh } = await supabase
    .from("invitation_modules")
    .select("id, module_type, sort_order, is_visible, config")
    .eq("invitation_id", invitationId)
    .order("sort_order", { ascending: true });

  revalidatePath(`/editor/${invitationId}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    modules: (fresh ?? []) as SavedModule[],
    // La versión que dejó el compare-and-set. El cliente la adopta; si se
    // quedara con la vieja, su siguiente guardado chocaría contra sí mismo.
    version: bumped.version as number,
  };
}
