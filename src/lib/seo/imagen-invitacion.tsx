import { ImageResponse } from "next/og";
import { FAMILIA_OG, fuentesOG, type FuenteOG } from "@/lib/seo/fuentes-og";
import { imagenGenerica } from "@/lib/seo/imagen-generica";
import type { DatosParaCompartir } from "@/lib/seo/compartir-invitacion";

/** Tamaño recomendado por Facebook/WhatsApp para `summary_large_image`. */
export const TAMANO_OG = { width: 1200, height: 630 };

/**
 * Caché de las imágenes OG de invitación, explícita para no depender del valor
 * por defecto de la librería: `next/og` hoy pone `public, max-age=0,
 * must-revalidate` (`next/dist/server/og/image-response.js`), pero el
 * `@vercel/og` que envuelve pone `immutable` y un año, y esta tarjeta cambia
 * (despublicar, caducar, editar título o fecha). Navegador: revalida siempre
 * (`max-age=0`). CDN: una hora fresca, que es lo que puede tardar en verse un
 * cambio, y un día sirviendo la vieja mientras revalida; ahorra repetir la RPC
 * y el render por cada vista del mismo enlace. WhatsApp/Facebook guardan su
 * propia copia, así que más corto no ganaría frescura.
 */
export const CACHE_OG_DE_INVITACION =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
const CABECERAS_OG = { "cache-control": CACHE_OG_DE_INVITACION };

function tamanoDeTitulo(titulo: string): number {
  if (titulo.length <= 22) return 96;
  if (titulo.length <= 44) return 72;
  return 56;
}

/**
 * Imagen OG de una invitación: título, tipo y fecha del evento con la paleta
 * de su tema. Sin datos (no existe, no publicada, token desconocido) devuelve
 * la imagen genérica de Sobrely, igual a la de la home, para no revelar nada;
 * ambas con `CACHE_OG_DE_INVITACION`, no con la caché de un año de next/og.
 *
 * Solo pinta campos de `DatosParaCompartir` (ver la lista blanca allí). La
 * marca «sobrely.com» va en la esquina solo si el plan muestra marca.
 *
 * Los colores vienen validados como hex por `themeSchema` (`parseTheme`).
 *
 * `opciones.fuentes` sustituye a las de `fuentesOG()` (tests, o forzar la
 * fuente por defecto con `{ fuentes: undefined }`). Sin `opciones`, se leen las
 * del repo; si no están, Satori usa su fuente por defecto.
 */
export async function imagenDeInvitacion(
  d: DatosParaCompartir | null,
  opciones?: { fuentes?: FuenteOG[] },
): Promise<ImageResponse> {
  const fuentes = opciones ? opciones.fuentes : await fuentesOG();
  if (!d) return imagenGenerica(fuentes, CABECERAS_OG);
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
          fontFamily: fuentes ? FAMILIA_OG : "serif",
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
    { ...TAMANO_OG, ...(fuentes ? { fonts: fuentes } : {}), headers: CABECERAS_OG },
  );
}
