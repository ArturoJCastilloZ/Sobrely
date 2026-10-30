import { ImageResponse } from "next/og";
import { FAMILIA_OG, type FuenteOG } from "@/lib/seo/fuentes-og";

/**
 * La imagen genérica de Sobrely (la de la home). Vive aquí, y no solo en
 * `app/opengraph-image.tsx`, porque las invitaciones que no se pueden servir
 * la devuelven también (`imagenDeInvitacion(null)`) y deben recibir las mismas
 * fuentes. Sin `fuentes`, Satori usa su fuente por defecto (ver `fuentes-og`).
 *
 * `headers` se pasa tal cual a `ImageResponse`: la de la raíz no manda nada y
 * se queda con la caché por defecto de next/og (su contenido es fijo); las rutas de
 * invitación mandan la suya (ver `CACHE_OG_DE_INVITACION`).
 */
export function imagenGenerica(
  fuentes?: FuenteOG[],
  headers?: Record<string, string>,
): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #faf6ec 0%, #f0e6c8 55%, #e6d3a3 100%)",
          color: "#111827",
          fontFamily: fuentes ? FAMILIA_OG : "serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
          Sobre<span style={{ color: "#aa8c2c" }}>ly</span>
        </div>
        <div
          style={{
            fontSize: 40,
            marginTop: 24,
            maxWidth: 900,
            lineHeight: 1.3,
            opacity: 0.92,
          }}
        >
          Invitaciones digitales dinámicas y personalizables
        </div>
        <div style={{ fontSize: 28, marginTop: 40, opacity: 0.7 }}>
          Bodas · XV años · Cumpleaños · Corporativo
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fuentes ? { fonts: fuentes } : {}),
      ...(headers ? { headers } : {}),
    },
  );
}
