"use server";

import { createClient } from "@/lib/supabase/server";
import { darDeBaja, registrarDecision } from "@/lib/recordatorios/preferencias";

/**
 * Lo único de recordatorios que el navegador puede invocar.
 *
 * `guardarPreferenciaRecordatorios` toma la persona de la SESIÓN, nunca de un
 * argumento: no hay forma de suscribir ni dar de baja a otra. `optedIn` llega del
 * navegador, así que se exige booleano estricto (un `"false"` en texto sería
 * truthy en un `if` descuidado).
 */
export type ResultadoPreferencia = { ok: true } | { ok: false; error: string };

export async function guardarPreferenciaRecordatorios(
  optedIn: boolean,
): Promise<ResultadoPreferencia> {
  if (typeof optedIn !== "boolean") {
    return { ok: false, error: "Solicitud inválida." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para cambiar esta opción." };

  const guardado = await registrarDecision(user.id, optedIn, "panel");
  if (!guardado) {
    return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
  }
  return { ok: true };
}

/**
 * Baja desde la página del enlace del correo. El «quién» viene del token firmado,
 * no de la sesión: la persona suele abrirlo desde el celular sin haber iniciado
 * sesión.
 */
export async function confirmarBajaRecordatorios(
  formData: FormData,
): Promise<ResultadoPreferencia> {
  const u = String(formData.get("u") ?? "");
  const t = String(formData.get("t") ?? "");
  const ok = await darDeBaja(u, t);
  return ok
    ? { ok: true }
    : { ok: false, error: "Este enlace no es válido o ya no funciona." };
}
