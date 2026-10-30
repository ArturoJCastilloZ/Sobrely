import { cargarInvitacionPublica } from "@/lib/invitations/cargar-publica";
import { esRutaDeInvitacionPublica } from "@/lib/invitations/formato-publico";
import { datosParaCompartir } from "@/lib/seo/compartir-invitacion";
import { imagenDeInvitacion, TAMANO_OG } from "@/lib/seo/imagen-invitacion";

/**
 * Imagen al compartir la invitación pública: título, tipo y fecha con la
 * paleta del tema. Si no se puede servir (no existe, no publicada, caducada)
 * sale la genérica de Sobrely; con un usuario o slug sin formato válido, también,
 * sin llegar a la base.
 */
export const alt = "Invitación";
export const size = TAMANO_OG;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string; invitationSlug: string }>;
}) {
  const { username, invitationSlug } = await params;
  if (!esRutaDeInvitacionPublica(username, invitationSlug)) return imagenDeInvitacion(null);
  const inv = await cargarInvitacionPublica(username, invitationSlug);
  return imagenDeInvitacion(inv ? datosParaCompartir(inv) : null);
}
