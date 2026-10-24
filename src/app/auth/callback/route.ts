import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rutaInternaSegura } from "@/lib/auth/ruta-interna";
import { leerSesionAnonimaActual, trasladarBorradores } from "@/lib/auth/traspaso";

/**
 * Handles the OAuth (Google) and email-link callbacks. Supabase redirects here
 * with a `code` (PKCE) that we exchange for a session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Aquí el destino se concatena a `origin`, así que `//evil.com` no salía del
  // sitio (medido en el análisis); se valida igual para no depender de ese
  // detalle de cómo se arma la URL, y para que haya UNA sola regla.
  const safeNext = rutaInternaSegura(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    // Un invitado que entra con Google (cuenta que ya tenía) cambia de usuario: se traslada
    // su borrador. Si solo convierte su sesión (mismo id) no hay nada que mover.
    const invitadoId = await leerSesionAnonimaActual(supabase);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (invitadoId && data.user) await trasladarBorradores(invitadoId, data.user.id);
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${safeNext}`);
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
