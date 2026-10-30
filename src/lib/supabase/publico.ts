import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase ANÓNIMO y sin cookies, para lecturas públicas en páginas
 * que deben ser estáticas o ISR (p. ej. las landings por evento).
 *
 * Por qué no `@/lib/supabase/server`: ese cliente lee `cookies()`, una API de
 * petición que vuelve dinámica la ruta entera (`ƒ`, `Cache-Control: private,
 * no-store`). Este no lee ni escribe sesión, así que la ruta se puede
 * prerenderizar.
 *
 * Solo para datos que la RLS ya expone al rol `anon` (p. ej.
 * `templates_select_active_public`, 0001). Nunca para nada del usuario: aquí no
 * hay usuario. Usa la clave publicable (pública por diseño), no la service role.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para el cliente público.",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
