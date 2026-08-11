import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Utilidades de autorización admin (Fase 8.7).
 *
 * El rol admin vive en `admin_users` (no en `profiles`) y no es auto-asignable.
 * `admin_users` tiene RLS select-own, así que el cliente de sesión puede leer su
 * PROPIA fila para saber si es admin — sin exponer a otros usuarios.
 */

/** ¿El usuario autenticado actual es admin? */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}

/**
 * Exige rol admin; si no lo es (o no hay sesión), redirige. Se llama en el
 * layout de `/admin` como gate duro server-side.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) {
    redirect("/dashboard");
  }

  return { userId: user.id };
}
