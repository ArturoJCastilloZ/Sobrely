import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Enlace de baja SIN estado: el token es un HMAC del id de la persona.
 *
 * Se descartó guardar un token por persona: no hace falta una columna más, un
 * token en claro en la base es un secreto más que proteger, y con HMAC el mismo
 * enlace sigue valiendo en todos los correos que se le hayan mandado. Lo que
 * cuesta: rotar `REMINDER_SECRET` invalida los enlaces de correos YA enviados.
 * Es un compromiso aceptable (la baja también está en el panel), pero conviene
 * saberlo antes de rotar.
 *
 * El prefijo `baja:` separa dominios: si algún día el mismo secreto firmara otra
 * cosa, un token de una no valdría para la otra.
 */
const MIN_SECRETO = 32;

function firmar(userId: string, secreto: string): Buffer {
  return createHmac("sha256", secreto).update(`baja:${userId}`).digest();
}

export function firmarBaja(userId: string, secreto: string): string {
  if (!secreto || secreto.length < MIN_SECRETO) {
    throw new Error(`REMINDER_SECRET debe tener al menos ${MIN_SECRETO} caracteres.`);
  }
  return firmar(userId, secreto).toString("base64url");
}

/** Verifica en tiempo constante. Un secreto ausente o corto SIEMPRE da falso. */
export function verificarBaja(
  userId: string,
  token: string,
  secreto: string | undefined,
): boolean {
  if (!secreto || secreto.length < MIN_SECRETO) return false;
  if (!userId || !token) return false;
  const esperado = firmar(userId, secreto);
  let recibido: Buffer;
  try {
    recibido = Buffer.from(token, "base64url");
  } catch {
    return false;
  }
  if (recibido.length !== esperado.length) return false;
  return timingSafeEqual(recibido, esperado);
}
