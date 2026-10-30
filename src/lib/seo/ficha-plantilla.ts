import type { Metadata } from "next";
import type { PlantillaMarketplace } from "@/lib/templates/marketplace";
import { etiquetaDeEstilo } from "@/lib/templates/estilos";
import { metadatosSociales } from "@/lib/seo/social";

/**
 * Metadata de la ficha `/plantillas/<slug>`.
 *
 * Antes solo tenía `title` y `robots`, así que heredaba el `openGraph` del
 * layout: al compartir una ficha salía la tarjeta de la home con
 * `og:url=https://sobrely.com` (medido en producción, auditoría SEO hallazgo
 * 4). Ahora la tarjeta es la de la plantilla: su nombre, su descripción, su
 * ruta y su miniatura.
 *
 * Sigue `noindex` (ver el comentario de la página) y declara canonical propio.
 * No se pone el precio: cambia con las ofertas y WhatsApp/Facebook guardan la
 * tarjeta en caché mucho después.
 */
export function metadatosDeFicha(
  tpl: Pick<
    PlantillaMarketplace,
    "slug" | "name" | "description" | "event_type" | "preview_image_url" | "estilo"
  >,
): Metadata {
  const ruta = `/plantillas/${encodeURIComponent(tpl.slug)}`;
  const tipo = tpl.event_type?.trim();
  const resumen = [
    `Plantilla de invitación digital${tipo ? ` para ${tipo}` : ""}`,
    tpl.estilo ? `estilo ${etiquetaDeEstilo(tpl.estilo).toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const descripcion = [`${resumen}.`, tpl.description?.trim()]
    .filter(Boolean)
    .join(" ");
  const titulo = `${tpl.name} · Plantilla`;

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    ...metadatosSociales({
      titulo: `${titulo} · Sobrely`,
      descripcion,
      ruta,
      ...(tpl.preview_image_url
        ? { imagen: { url: tpl.preview_image_url, alt: `Plantilla ${tpl.name}` } }
        : {}),
    }),
    robots: { index: false, follow: true },
  };
}
