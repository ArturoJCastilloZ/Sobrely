import type { SupabaseClient } from "@supabase/supabase-js";
import { estadoDeLiga, hashToken, tieneFormatoDeToken } from "@/lib/previews/token";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

export type ResultadoResolver =
  | { ok: true; invitationId: string; expiresAt: string }
  | { ok: false };

/**
 * ¿Esta liga abre algo? Devuelve la invitación a la que apunta, o `{ ok: false }`.
 *
 * Una sola salida negativa a propósito: inválido, inexistente, vencida y
 * revocada son TODAS `{ ok: false }`, y la ruta las convierte en el mismo 404.
 * Distinguirlas le diría a quien prueba tokens al azar cuáles existieron alguna
 * vez, y al anfitrión no le sirve de nada que el invitado lo sepa.
 *
 * Se descarta por FORMA antes de tocar la base: un valor basura no llega a una
 * consulta. Cualquier error de la base (la tabla aún no existe porque la
 * migración no se ha aplicado, un fallo de red) también cierra: ante la duda, no
 * se abre una invitación.
 *
 * `admin` es el cliente de servicio: la tabla no es legible para nadie más.
 */
export async function resolverVistaPrevia(
  admin: AnyClient,
  token: unknown,
  ahora: Date = new Date(),
): Promise<ResultadoResolver> {
  if (!tieneFormatoDeToken(token)) return { ok: false };

  const { data, error } = await admin
    .from("invitation_previews")
    .select("invitation_id, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) {
    console.error("[vista-previa] no se pudo leer la liga:", error.message);
    return { ok: false };
  }
  if (!data) return { ok: false };

  const fila = data as {
    invitation_id: string;
    expires_at: string;
    revoked_at: string | null;
  };
  if (estadoDeLiga(fila, ahora) !== "vigente") return { ok: false };

  return { ok: true, invitationId: fila.invitation_id, expiresAt: fila.expires_at };
}
