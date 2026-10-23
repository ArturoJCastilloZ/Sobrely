import { darDeBaja } from "@/lib/recordatorios/preferencias";

/**
 * Baja de UN CLIC (RFC 8058): el correo trae `List-Unsubscribe-Post`, y Gmail,
 * Apple Mail y otros lo muestran como un botón «Cancelar suscripción» que
 * hace un POST aquí sin abrir ninguna página.
 *
 * Solo el POST escribe. El GET NO da de baja: los escáneres de enlaces y las
 * vistas previas de los clientes de correo piden las URLs con GET, y una baja
 * por GET se la daría a gente que nunca la pidió. El GET manda a la página, que
 * pide confirmación.
 */
export const dynamic = "force-dynamic";

function parametros(request: Request): { u: string; t: string } {
  const url = new URL(request.url);
  return { u: url.searchParams.get("u") ?? "", t: url.searchParams.get("t") ?? "" };
}

export async function POST(request: Request) {
  const { u, t } = parametros(request);
  const ok = await darDeBaja(u, t);
  // Mismo cuerpo para «token malo» y «error»: no se revela cuál fue.
  return ok
    ? Response.json({ ok: true })
    : Response.json({ ok: false }, { status: 400 });
}

export async function GET(request: Request) {
  const { u, t } = parametros(request);
  const destino = new URL("/recordatorios/baja", request.url);
  destino.searchParams.set("u", u);
  destino.searchParams.set("t", t);
  return Response.redirect(destino, 303);
}
