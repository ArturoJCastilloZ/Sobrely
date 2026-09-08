"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Marcar y desmarcar un favorito del marketplace (migración `0031`).
 *
 * NO se manda `user_id` desde el cliente: se toma de `auth.getUser()` en el
 * servidor. Aunque la política `with_check` ya impide insertar a nombre de otro
 * —probado por efecto, HTTP 403 con freno RLS—, dejar que el cliente proponga
 * el dueño de la fila convierte una defensa en una carrera que se gana sola en
 * cuanto alguien toque esa política. El id del dueño se deriva de la sesión.
 *
 * Devuelve el estado resultante en vez de `void` para que el cliente pueda
 * reconciliar su marca optimista con lo que de verdad quedó guardado.
 */
export async function toggleFavorite(
  templateId: string,
): Promise<{ ok: boolean; favorito: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sin sesión no se redirige: esto se llama desde un botón dentro del
  // dashboard, y un `redirect()` en una acción disparada por un clic tira la
  // vista entera. Se devuelve el fallo y el cliente revierte su marca.
  if (!user) return { ok: false, favorito: false };

  const { data: existente } = await supabase
    .from("template_favorites")
    .select("template_id")
    .eq("user_id", user.id)
    .eq("template_id", templateId)
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("template_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("template_id", templateId);
    if (error) return { ok: false, favorito: true };
    revalidatePath("/dashboard/templates");
    return { ok: true, favorito: false };
  }

  const { error } = await supabase
    .from("template_favorites")
    .insert({ user_id: user.id, template_id: templateId });
  if (error) return { ok: false, favorito: false };
  revalidatePath("/dashboard/templates");
  return { ok: true, favorito: true };
}
