import { CONTACT_EMAIL, SERVICE_AREA_LABEL } from "@/lib/seo/site";

/**
 * Señal local visible: zona de servicio + correo de contacto.
 *
 * Va en los footers de las páginas de marketing (nunca en la invitación
 * pública, que en planes sin marca no debe exponer a Sobrely). El texto debe
 * coincidir EXACTO con el perfil de Google Business: la consistencia de estos
 * datos entre el sitio y el perfil es lo que se pondera en búsqueda local.
 *
 * Deliberadamente SIN calle ni número: el domicilio es particular y en Google
 * está oculto por ser negocio de área de servicio. Publicarlo aquí lo expondría
 * y además crearía una inconsistencia con el perfil.
 */
export function LocalLine({ className = "" }: { className?: string }) {
  return (
    <p className={className}>
      {SERVICE_AREA_LABEL} ·{" "}
      <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">
        {CONTACT_EMAIL}
      </a>
    </p>
  );
}
