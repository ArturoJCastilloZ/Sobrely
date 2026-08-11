import { ImageResponse } from "next/og";

/**
 * Imagen Open Graph de marketing (Fase 7.1). Se usa al compartir la landing en
 * redes/chat. Generada con next/og (sin assets externos ni fuentes remotas para
 * respetar el aislamiento y no depender de la red en build/runtime).
 *
 * Las invitaciones públicas tienen su propio OG (Fase 3); esta es la de marca.
 */
export const alt = "Sobrely — Invitaciones digitales dinámicas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 55%, #7c3aed 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2 }}>
          Sobrely
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
    { ...size },
  );
}
