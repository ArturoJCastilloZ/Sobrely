import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarBaja } from "@/lib/recordatorios/baja-token";

/**
 * Consentimiento para recibir recordatorios. Módulo del SERVIDOR, sin
 * `"use server"` a propósito: un archivo con esa directiva expone cada función
 * exportada como un endpoint que cualquiera puede llamar con los argumentos que
 * quiera, y `registrarDecision(userIdAjeno, true)` sería suscribir a otra persona.
 * Las acciones que el navegador sí puede invocar viven en `acciones.ts` y SIEMPRE
 * toman el id de la sesión, nunca de un argumento.
 *
 * Versión del texto que la persona ve junto al interruptor. Si el texto cambia
 * de fondo, se cambia esta versión: la constancia de consentimiento dice qué
 * aceptó cada quien.
 */
export const VERSION_TEXTO_CONSENTIMIENTO = "v1-2026-10-23";

export const TEXTO_CONSENTIMIENTO =
  "Enviarme un correo si dejo una invitación sin publicar o se acerca mi evento (como máximo uno al día). Puedo dejar de recibirlos cuando quiera.";

export type FuenteDeDecision = "panel" | "baja";

/**
 * - `{ optedIn }`      la persona ya decidió.
 * - `null`             nunca ha decidido (sin consentimiento).
 * - `"no_disponible"`  no se pudo leer (p. ej. la migración 0061 aún no está
 *                      aplicada): el panel oculta la opción en vez de mostrar un
 *                      interruptor que fallaría al usarse.
 */
export type Preferencia = { optedIn: boolean } | null | "no_disponible";

export async function leerPreferencia(userId: string): Promise<Preferencia> {
  const { data, error } = await createAdminClient()
    .from("reminder_preferences")
    .select("opted_in")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return "no_disponible";
  if (!data) return null;
  return { optedIn: data.opted_in === true };
}

/** Guarda la decisión vigente. `true` solo si de verdad quedó escrita una fila. */
export async function registrarDecision(
  userId: string,
  optedIn: boolean,
  fuente: FuenteDeDecision,
): Promise<boolean> {
  const { data: filas, error } = await createAdminClient()
    .from("reminder_preferences")
    .upsert(
      {
        user_id: userId,
        opted_in: optedIn,
        consent_text_version: VERSION_TEXTO_CONSENTIMIENTO,
        source: fuente,
        decided_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id");
  // Un upsert que no devuelve fila no registró nada: decir «listo» aquí sería
  // afirmar una baja (obligación legal) que el servidor no tiene.
  if (error || !filas) return false;
  return filas.length > 0;
}

/**
 * Baja con enlace firmado. Un token inválido NO escribe nada y no dice por qué:
 * la respuesta es la misma para «token malo» que para «secreto sin configurar».
 */
export async function darDeBaja(userId: string, token: string): Promise<boolean> {
  if (!verificarBaja(userId, token, process.env.REMINDER_SECRET)) return false;
  return registrarDecision(userId, false, "baja");
}
