import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FilaError } from "./agrupar";

/**
 * Lectura de `error_events` para `/admin/errores`. Solo la llama una página que
 * ya pasó por `requireAdmin()`: la tabla solo la lee `service_role`.
 */
export async function leerErrores(dias: number): Promise<FilaError[]> {
  const admin = createAdminClient();
  let q = admin
    .from("error_events")
    .select("created_at, origen, severidad, huella, mensaje, contexto, alertado_en")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (dias > 0) q = q.gte("created_at", new Date(Date.now() - dias * 86_400_000).toISOString());
  const { data } = await q;
  return (data ?? []) as FilaError[];
}
