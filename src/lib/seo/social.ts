import type { Metadata } from "next";

/**
 * Open Graph y Twitter Card de una página de marketing.
 *
 * Next reemplaza (no mezcla) `openGraph` y `twitter` de la ruta sobre los del
 * layout, y la imagen de `app/opengraph-image.tsx` solo se adjunta cuando la
 * ruta no define `openGraph`. Por eso cada página que lo define debe declarar
 * la imagen aquí; si no, al compartirla sale sin imagen. Y las que no lo
 * definen heredaban el título y la descripción de la home en `twitter:*`.
 */
const IMAGEN_SOCIAL = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Sobrely — Invitaciones digitales dinámicas",
};

export function metadatosSociales(datos: {
  titulo: string;
  descripcion: string;
  ruta: string;
  tipo?: "website" | "article";
  publicadoEn?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const { titulo, descripcion, ruta, tipo = "website", publicadoEn } = datos;
  return {
    openGraph: {
      type: tipo,
      siteName: "Sobrely",
      locale: "es_MX",
      url: ruta,
      title: titulo,
      description: descripcion,
      images: [IMAGEN_SOCIAL],
      ...(tipo === "article" && publicadoEn ? { publishedTime: publicadoEn } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descripcion,
      images: [IMAGEN_SOCIAL.url],
    },
  };
}
