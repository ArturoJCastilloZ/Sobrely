import { cargarInvitacionDeInvitado } from "@/lib/invitations/cargar-publica";
import { datosParaCompartir } from "@/lib/seo/compartir-invitacion";
import { imagenDeInvitacion, TAMANO_OG } from "@/lib/seo/imagen-invitacion";

/**
 * Imagen al compartir el enlace personal de un invitado. Es la del EVENTO, no
 * la del invitado: solo usa `bundle.invitation` y, dentro, la lista blanca de
 * `datosParaCompartir`. Un token desconocido da la genérica de Sobrely.
 */
export const alt = "Invitación";
export const size = TAMANO_OG;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bundle = await cargarInvitacionDeInvitado(token);
  return imagenDeInvitacion(bundle ? datosParaCompartir(bundle.invitation) : null);
}
