import { cargarInvitacionDeInvitadoParaCompartir } from "@/lib/invitations/cargar-publica";
import { esTokenDeInvitado } from "@/lib/invitations/formato-publico";
import { datosParaCompartir } from "@/lib/seo/compartir-invitacion";
import { imagenDeInvitacion, TAMANO_OG } from "@/lib/seo/imagen-invitacion";

/**
 * Imagen al compartir el enlace personal de un invitado. Es la del EVENTO, no
 * la del invitado: solo usa `bundle.invitation` y, dentro, la lista blanca de
 * `datosParaCompartir`. Un token desconocido o una invitación caducada (la RPC
 * del invitado no filtra el entitlement) dan la genérica de Sobrely. Un token
 * sin el formato real también, sin llegar a la base.
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
  if (!esTokenDeInvitado(token)) return imagenDeInvitacion(null);
  const bundle = await cargarInvitacionDeInvitadoParaCompartir(token);
  return imagenDeInvitacion(bundle ? datosParaCompartir(bundle.invitation) : null);
}
