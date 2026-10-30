import type { Metadata } from "next";
import type { PublicInvitation } from "@/lib/invitations/public-types";
import { brandingForPlanCode } from "@/lib/billing/branding";
import { parseTheme } from "@/lib/theme/theme";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo/site";
import { metadatosSociales } from "@/lib/seo/social";

/**
 * Lo que una invitación enseña cuando su enlace se pega en WhatsApp/Facebook.
 *
 * PRIVACIDAD. La tarjeta la ve cualquiera a quien se le reenvíe el enlace, y en
 * `/g/<token>` el enlace es personal. Por eso esto es una LISTA BLANCA: solo
 * salen el título del evento, su tipo, la fecha y los colores del tema. Nunca
 * el invitado (nombre, cupo, respuesta), ni los módulos (dirección, lugar,
 * teléfonos, mesa de regalos), ni el anfitrión. Todo lo que se pinte o se
 * escriba en las etiquetas debe salir de `DatosParaCompartir`, no de la
 * invitación entera.
 */
export type DatosParaCompartir = {
  titulo: string;
  tipoEvento: string | null;
  fecha: string | null;
  colores: { fondo: string; texto: string; primario: string };
  /** El plan muestra marca de Sobrely (`full` o `reduced`). */
  conMarca: boolean;
};

const FECHA = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  // Igual que la portada (`info-evento.ts`): la fecha se guarda como mediodía
  // de México central; con esta zona el día no se corre en el servidor.
  timeZone: "America/Mexico_City",
});

/** Longitud máxima del título en la tarjeta: los buscadores cortan en ~60-90. */
const MAX_TITULO = 90;

function recortar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto;
}

/**
 * Paleta de respaldo de la tarjeta: la de la marca (tokens `--color-brand-ink`,
 * `--color-brand-cream` y `--color-brand-gold` de `globals.css`). Solo cuando la
 * invitación no trae colores propios: sin ella la tarjeta caía al blanco y gris
 * por defecto del tema, que no dice nada. Dorado sobre negro mate: 8.4:1.
 */
export const COLORES_DE_MARCA: DatosParaCompartir["colores"] = {
  fondo: "#111827",
  texto: "#f5eedb",
  primario: "#d4af37",
};

function tieneColoresPropios(themeConfig: unknown): boolean {
  if (typeof themeConfig !== "object" || themeConfig === null) return false;
  const colores = (themeConfig as { colors?: unknown }).colors;
  return typeof colores === "object" && colores !== null;
}

export function datosParaCompartir(inv: PublicInvitation): DatosParaCompartir {
  const tema = parseTheme(inv.theme_config);
  const t = inv.event_date ? new Date(inv.event_date) : null;
  const tipo = inv.event_type?.trim();
  return {
    titulo: recortar(inv.title?.trim() || "Invitación", MAX_TITULO),
    tipoEvento: tipo ? tipo : null,
    fecha: t && !Number.isNaN(t.getTime()) ? FECHA.format(t) : null,
    colores: tieneColoresPropios(inv.theme_config)
      ? {
          fondo: tema.colors.background,
          texto: tema.colors.text,
          primario: tema.colors.primary,
        }
      : { ...COLORES_DE_MARCA },
    conMarca: brandingForPlanCode(inv.plan_code) !== "none",
  };
}

export function descripcionParaCompartir(d: DatosParaCompartir): string {
  return [d.tipoEvento, d.fecha, "Te invitamos"].filter(Boolean).join(" · ");
}

/**
 * `description`, `openGraph` y `twitter` de una invitación publicada.
 *
 * La imagen no se declara: la genera el `opengraph-image.tsx` de la ruta con
 * estos mismos datos. En planes sin marca tampoco va `og:site_name`.
 *
 * `ruta` es la URL de la página que se comparte (`/<usuario>/<slug>` o
 * `/g/<token>`). El `title` de la pestaña lo arma cada página: en `/g` lleva
 * el nombre del invitado, que aquí no entra.
 */
export function metadatosDeInvitacion(
  inv: PublicInvitation,
  ruta: string,
): Pick<Metadata, "description" | "openGraph" | "twitter"> {
  const d = datosParaCompartir(inv);
  const descripcion = descripcionParaCompartir(d);
  return {
    description: descripcion,
    ...metadatosSociales({
      titulo: d.titulo,
      descripcion,
      ruta,
      imagen: "del-segmento",
      sinMarca: !d.conMarca,
    }),
  };
}

/**
 * La tarjeta genérica de Sobrely, idéntica a la que hereda cualquier página
 * del layout. Para invitaciones que no se pueden servir (no existe, no está
 * publicada, caducó, token desconocido): la tarjeta no debe revelar cuál de
 * esos casos es, ni que un token corresponde a alguien.
 */
export function metadatosGenericos(): Pick<Metadata, "openGraph" | "twitter"> {
  return metadatosSociales({
    titulo: SITE_TITLE,
    descripcion: SITE_DESCRIPTION,
    ruta: "/",
  });
}
