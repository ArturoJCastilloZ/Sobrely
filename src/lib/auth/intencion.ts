import "server-only";
import { cookies } from "next/headers";
import { DESTINO_POR_DEFECTO, rutaInternaSegura } from "@/lib/auth/ruta-interna";

/**
 * Recuerda A DÓNDE iba la persona cuando decidió registrarse por correo.
 *
 * Por qué una cookie y no solo el parámetro `next`: el correo de confirmación
 * lo arma la PLANTILLA de Supabase, y esa plantilla trae el destino escrito a
 * mano (`…&type=signup&next=/dashboard`, ver `docs/email-templates/`). Cambiar
 * el `emailRedirectTo` en el código no la toca. Sin esto, quien eligió una
 * plantilla, se registró y confirmó su correo caía siempre en `/dashboard`.
 *
 * Alcance deliberadamente corto:
 *   - Solo el registro por correo la necesita. Google y el inicio de sesión
 *     llevan `next`/`redirectTo` por URL y no pasan por la plantilla.
 *   - Es de mismo navegador: si se confirma desde otro dispositivo la cookie no
 *     está y se cae al destino por defecto, sin error. Cubrir ese caso exige
 *     cambiar la plantilla en el panel de Supabase (usar `{{ .Data.* }}`), y eso
 *     lo decide el dueño del proyecto, no este código.
 *
 * La cookie es entrada del usuario (se puede editar), así que el valor se
 * REVALIDA al leerlo con la misma función que al guardarlo.
 */
export const COOKIE_INTENCION = "sobrely_next";
const UN_DIA = 60 * 60 * 24;

export async function guardarIntencion(destino: unknown): Promise<void> {
  const seguro = rutaInternaSegura(destino);
  // El destino por defecto no es una intención: no hay nada que recordar.
  if (seguro === DESTINO_POR_DEFECTO) return;
  (await cookies()).set(COOKIE_INTENCION, seguro, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UN_DIA,
  });
}

/** El destino recordado, o `null` si no hay ninguno o la cookie fue manipulada. */
export async function leerIntencion(): Promise<string | null> {
  const valor = (await cookies()).get(COOKIE_INTENCION)?.value;
  if (!valor) return null;
  const seguro = rutaInternaSegura(valor);
  return seguro === DESTINO_POR_DEFECTO ? null : seguro;
}

export async function olvidarIntencion(): Promise<void> {
  (await cookies()).delete(COOKIE_INTENCION);
}

/**
 * Destino tras confirmar el correo.
 *
 * Solo sustituye al destino por defecto: si el enlace trae uno propio
 * (`/reset-password` en la recuperación de contraseña) ese manda, y una
 * intención guardada de otro registro no se le cuela.
 */
export function elegirDestinoTrasConfirmar(
  solicitado: string,
  recordado: string | null,
): string {
  return solicitado === DESTINO_POR_DEFECTO && recordado ? recordado : solicitado;
}
