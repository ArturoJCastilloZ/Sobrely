/**
 * Destino interno SEGURO para `next` / `redirectTo` tras autenticar.
 *
 * Sustituye al `valor.startsWith("/")` que había copiado en cinco sitios
 * (login, login page, Google, callback, confirmación). Ese chequeo deja pasar
 * `//evil.com`: para el navegador una URL que empieza por `//` es
 * «protocolo-relativa» y navega a OTRO host. Con `redirect("//evil.com")` tras un
 * inicio de sesión legítimo, un enlace de phishing con el dominio real de
 * Sobrely termina en la página del atacante, ya con la confianza del login.
 *
 * Tampoco bastaba con probar `//`: los navegadores normalizan antes de
 * resolver, así que estas variantes se comportan igual que `//host`:
 *   - `/\evil.com`        la barra invertida se trata como `/`
 *   - `/\t/evil.com`      tabuladores y saltos de línea se ELIMINAN de la URL
 * Por eso se rechaza cualquier espacio, control o barra invertida, no solo `//`.
 *
 * Una ruta como `/%2F/evil.com` o `/@evil.com` NO sale del sitio (el navegador
 * no decodifica `%2F` en el path al resolver, y `@` en el path no es userinfo),
 * así que no se rechazan: bloquearlas rompería rutas legítimas.
 *
 * Es una función pura y vive aparte para poder demostrarla con pruebas; las
 * server actions que la usan hablan con Supabase y no se pueden probar así.
 */
export const DESTINO_POR_DEFECTO = "/dashboard";

const LARGO_MAXIMO = 2048;
// Espacio, controles C0/C1 y barra invertida.
const CARACTER_PROHIBIDO = /[\u0000- \u007f-\u009f\\]/;

export function rutaInternaSegura(
  valor: unknown,
  porDefecto: string = DESTINO_POR_DEFECTO,
): string {
  if (typeof valor !== "string") return porDefecto;
  if (valor.length === 0 || valor.length > LARGO_MAXIMO) return porDefecto;
  if (CARACTER_PROHIBIDO.test(valor)) return porDefecto;
  if (valor[0] !== "/") return porDefecto;
  // `//host` es protocolo-relativa → otro origen.
  if (valor[1] === "/") return porDefecto;
  return valor;
}

/**
 * Enlace entre las pantallas de acceso que conserva a dónde iba la persona:
 * de «Crear cuenta» a «Iniciar sesión» (y al revés) sin perder la plantilla que
 * eligió. Con el destino por defecto devuelve la ruta limpia, sin parámetro.
 *
 * El destino se vuelve a validar aquí: este enlace se pinta en HTML a partir de
 * un parámetro de la URL, así que no puede fiarse de que ya venga saneado.
 */
export function enlaceConDestino(
  base: "/login" | "/register",
  parametro: "redirectTo" | "next",
  destino: unknown,
): string {
  const seguro = rutaInternaSegura(destino);
  return seguro === DESTINO_POR_DEFECTO
    ? base
    : `${base}?${parametro}=${encodeURIComponent(seguro)}`;
}
