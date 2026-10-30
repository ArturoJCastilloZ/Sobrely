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

export type ImagenSocial = {
  url: string;
  width?: number;
  height?: number;
  alt: string;
};

export function metadatosSociales(datos: {
  titulo: string;
  descripcion: string;
  ruta: string;
  tipo?: "website" | "article";
  publicadoEn?: string;
  /**
   * Imagen propia de la página (p. ej. la miniatura de una plantilla). Por
   * omisión, la genérica de Sobrely. `"del-segmento"` NO declara imagen: la
   * pone el `opengraph-image.tsx` de la ruta, que Next solo adjunta cuando
   * `openGraph.images` no está definido (`mergeStaticMetadata` en
   * `next/dist/lib/metadata/resolve-metadata.js`). En Twitter tampoco se
   * declara: X usa `og:image` cuando falta `twitter:image`.
   */
  imagen?: ImagenSocial | "del-segmento";
  /** Sin `og:site_name` «Sobrely»: invitaciones de planes sin marca. */
  sinMarca?: boolean;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const {
    titulo,
    descripcion,
    ruta,
    tipo = "website",
    publicadoEn,
    imagen = IMAGEN_SOCIAL,
    sinMarca = false,
  } = datos;
  const delSegmento = imagen === "del-segmento";
  return {
    openGraph: {
      type: tipo,
      ...(sinMarca ? {} : { siteName: "Sobrely" }),
      locale: "es_MX",
      url: ruta,
      title: titulo,
      description: descripcion,
      ...(delSegmento ? {} : { images: [imagen] }),
      ...(tipo === "article" && publicadoEn ? { publishedTime: publicadoEn } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descripcion,
      ...(delSegmento ? {} : { images: [imagen.url] }),
    },
  };
}
