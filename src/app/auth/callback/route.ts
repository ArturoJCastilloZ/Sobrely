import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rutaInternaSegura } from "@/lib/auth/ruta-interna";
import { leerSesionAnonimaActual, trasladarBorradores } from "@/lib/auth/traspaso";
import { registrarEvento } from "@/lib/analytics/embudo";
import { decidirRegistro } from "@/lib/analytics/registro-regla";

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
      // Embudo (T05): `sign_up` solo si fue un registro (cuenta nueva o invitado
      // que convirtió su sesión), una vez por persona.
      if (data.user) {
        const reg = decidirRegistro({
          userId: data.user.id,
          creadoEn: data.user.created_at,
          invitadoId,
          proveedor: data.user.app_metadata?.provider,
          ahora: Date.now(),
        });
        if (reg.registrar) await registrarEvento("sign_up", data.user.id, { method: reg.metodo });
      }
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
