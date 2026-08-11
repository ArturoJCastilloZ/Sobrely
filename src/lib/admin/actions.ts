"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Server Actions del panel admin (Fase 8.7).
 *
 * Todas exigen `requireAdmin()` (gate de app) y escriben con `service_role`
 * (las tablas admin/servicios no aceptan escritura desde el cliente por RLS).
 * Defensa en profundidad: además, las funciones DB de lectura tienen su propio
 * gate `is_admin(auth.uid())`.
 */

const SERVICE_STATUSES = [
  "pending",
  "contacted",
  "in_progress",
  "completed",
  "cancelled",
] as const;
type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

/** Mueve el estado del ciclo de vida de una solicitud de servicio. */
export async function updateServiceRequestStatus(
  id: string,
  status: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  if (!(SERVICE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Estado inválido." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("service_requests")
    .update({ status: status as ServiceStatus })
    .eq("id", id);
  if (error) {
    console.error("[admin] update service_request:", error.message);
    return { ok: false, error: "No se pudo actualizar la solicitud." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Otorga rol admin a un usuario por su email (solo un admin puede). */
export async function grantAdmin(email: string): Promise<AdminActionResult> {
  await requireAdmin();

  const clean = email.trim();
  if (!clean || !clean.includes("@")) {
    return { ok: false, error: "Email inválido." };
  }

  const supabase = await createClient();
  // Resuelve email→uuid vía función SECURITY DEFINER (gate admin interno).
  const { data: uid, error: rpcErr } = await supabase.rpc(
    "admin_user_id_by_email",
    { p_email: clean },
  );
  if (rpcErr) {
    console.error("[admin] admin_user_id_by_email:", rpcErr.message);
    return { ok: false, error: "No se pudo buscar al usuario." };
  }
  if (!uid) {
    return { ok: false, error: "No existe un usuario con ese email." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("admin_users")
    .upsert({ user_id: uid }, { onConflict: "user_id" });
  if (error) {
    console.error("[admin] grant admin:", error.message);
    return { ok: false, error: "No se pudo otorgar admin." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Revoca rol admin. No permite auto-revocarse (evita auto-lockout). */
export async function revokeAdmin(userId: string): Promise<AdminActionResult> {
  const { userId: currentId } = await requireAdmin();

  if (userId === currentId) {
    return { ok: false, error: "No puedes revocar tu propio acceso admin." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("admin_users")
    .delete()
    .eq("user_id", userId);
  if (error) {
    console.error("[admin] revoke admin:", error.message);
    return { ok: false, error: "No se pudo revocar admin." };
  }

  revalidatePath("/admin");
  return { ok: true };
}
