import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con la **service_role key** — SOLO server-side.
 *
 * Bypassa RLS: se usa exclusivamente en flujos de confianza del servidor
 * (webhook de pago, activación de entitlements). NUNCA se importa desde el
 * cliente (`import "server-only"` lo hace fallar en build si alguien lo intenta)
 * y la key NUNCA va en una var `NEXT_PUBLIC_*`.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para el cliente admin.",
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
