/**
 * Formato de los segmentos de las URLs públicas, para descartar lo inventado
 * ANTES de consultar la base (las rutas OG hacen RPC + render por cualquier
 * URL). Si no cumple, la ruta responde igual que a un dato inexistente, para no
 * dar un oráculo de formato. Ser estricto aquí esconde tarjetas reales, así que
 * cada regla sale de cómo la app genera el dato:
 *
 * - token del invitado: `encode(gen_random_bytes(24), 'hex')` (0011): 48 hex en
 *   minúscula, y la RPC lo compara tal cual (`g.access_token = p_token`).
 * - usuario: `handle_new_user` (0001/0002) filtra a `[a-zA-Z0-9_]` y añade
 *   `-<6 hex>`. La base no impone forma, así que se acepta el alfabeto con
 *   guion y un tope holgado, sin exigir el sufijo.
 * - slug: `invitationSettingsSchema` (`[a-z0-9-]`, máx. 60) y
 *   `invitacion-<sufijo>` al crear. Se acepta el alfabeto sin exigir la forma
 *   exacta de guiones, para no perder un slug con un guion al borde.
 */
const TOKEN_DE_INVITADO = /^[0-9a-f]{48}$/;
const USUARIO = /^[A-Za-z0-9_-]{1,100}$/;
const SLUG_DE_INVITACION = /^[a-z0-9-]{1,60}$/;

export function esTokenDeInvitado(token: string): boolean {
  return TOKEN_DE_INVITADO.test(token);
}

export function esRutaDeInvitacionPublica(usuario: string, slug: string): boolean {
  return USUARIO.test(usuario) && SLUG_DE_INVITACION.test(slug);
}
