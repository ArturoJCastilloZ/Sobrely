import { ImageResponse } from "next/og";
import OpengraphImage from "@/app/opengraph-image";
import type { DatosParaCompartir } from "@/lib/seo/compartir-invitacion";

/** Tamaño recomendado por Facebook/WhatsApp para `summary_large_image`. */
export const TAMANO_OG = { width: 1200, height: 630 };

function tamanoDeTitulo(titulo: string): number {
  if (titulo.length <= 22) return 96;
  if (titulo.length <= 44) return 72;
  return 56;
}

/**
 * Imagen OG de una invitación: título, tipo y fecha del evento con la paleta
 * de su tema. Sin datos (no existe, no publicada, token desconocido) devuelve
 * la imagen genérica de Sobrely, igual a la de la home, para no revelar nada.
 *
 * Solo pinta campos de `DatosParaCompartir` (ver la lista blanca allí). La
 * marca «sobrely.com» va en la esquina solo si el plan muestra marca.
 *
 * Los colores vienen validados como hex por `themeSchema` (`parseTheme`).
 */
export function imagenDeInvitacion(d: DatosParaCompartir | null): ImageResponse {
  if (!d) return OpengraphImage();
  const { fondo, texto, primario } = d.colores;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: fondo,
          color: texto,
          fontFamily: "serif",
          padding: 36,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `3px solid ${primario}`,
            borderRadius: 24,
            padding: "48px 72px",
            textAlign: "center",
            position: "relative",
          }}
        >
          {d.tipoEvento && (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: primario,
              }}
            >
              {d.tipoEvento}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: tamanoDeTitulo(d.titulo),
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 28,
              maxWidth: 980,
              justifyContent: "center",
            }}
          >
            {d.titulo}
          </div>
          <div
            style={{
              display: "flex",
              width: 120,
              height: 3,
              background: primario,
              marginTop: 36,
            }}
          />
          {d.fecha && (
            <div style={{ display: "flex", fontSize: 34, marginTop: 32, opacity: 0.85 }}>
              {d.fecha}
            </div>
          )}
          {d.conMarca && (
            <div
              style={{
                display: "flex",
                position: "absolute",
                right: 28,
                bottom: 20,
                fontSize: 22,
                opacity: 0.55,
              }}
            >
              sobrely.com
            </div>
          )}
        </div>
      </div>
    ),
    { ...TAMANO_OG },
  );
}
