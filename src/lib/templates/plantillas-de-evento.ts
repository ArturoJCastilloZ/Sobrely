import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTheme } from "@/lib/theme/theme";
import { getThemePack } from "@/lib/theme/theme-packs";
import {
  aPlantillaPublica,
  COLUMNAS,
  type FilaPlantillaPublica,
} from "@/lib/templates/galeria-publica";
import type { PlantillaMarketplace } from "@/lib/templates/marketplace";
import { etiquetaDeEstilo } from "@/lib/templates/estilos";

/**
 * Plantillas REALES de un tipo de evento para las landings de SEO
 * (`/invitaciones-digitales-<evento>`).
 *
 * Misma fuente y mismo precio que el catálogo público (`cargarGaleriaPublica` →
 * `aPlantillaPublica`): solo activas, del `event_type` exacto, y solo las que
 * tienen miniatura, porque la landing es una vitrina de imágenes y una tarjeta
 * sin imagen no enseña nada. El texto alternativo se arma AQUÍ, en el servidor,
 * con el tema de la plantilla: al navegador no llega `theme_config`.
 */

/** Cuántas enseña cada landing: se reparte parejo en 2, 3 y 4 columnas. */
export const MAX_PLANTILLAS_LANDING = 12;

export type PlantillaLanding = PlantillaMarketplace & {
  /** Miniatura garantizada: sin ella no entra a la landing. */
  preview_image_url: string;
  /** Texto alternativo: tipo de evento, estilo y color. Sin el nombre. */
  alt: string;
};

/** Enlace al catálogo con el filtro del evento ya puesto (`/plantillas?evento=`). */
export function hrefPlantillasDeEvento(eventType: string): string {
  return `/plantillas?evento=${encodeURIComponent(eventType)}`;
}

/**
 * Nombre en español del tono de un color hex, para el `alt`. Gruesa a propósito:
 * «dorado» o «azul» describe la miniatura; «#8a6d3b» no le dice nada a nadie.
 * `null` si el hex no es válido.
 */
export function nombreDeColor(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (l < 0.15) return "negro";
  if (l > 0.93) return "blanco";
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.15) return "gris";
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 10 || h >= 345) return "rojo";
  if (h < 35) return "naranja";
  if (h < 55) return "dorado";
  if (h < 70) return "amarillo";
  if (h < 165) return "verde";
  if (h < 195) return "turquesa";
  if (h < 250) return "azul";
  if (h < 290) return "morado";
  return "rosa";
}

/**
 * Colores y modo con los que se PINTA la plantilla: si `theme_config` no trae
 * colores pero sí un `themePack`, mandan los del pack (así se siembran varias);
 * si no, los del tema con sus valores por defecto.
 */
function coloresDeLaPlantilla(themeConfig: unknown): {
  primary: string;
  mode: "light" | "dark";
} {
  const tema = parseTheme(themeConfig);
  const crudo =
    typeof themeConfig === "object" && themeConfig !== null
      ? (themeConfig as { colors?: unknown })
      : {};
  const pack = tema.themePack ? getThemePack(tema.themePack) : undefined;
  if (pack && (crudo.colors === undefined || crudo.colors === null)) {
    return { primary: pack.theme.colors.primary, mode: pack.theme.mode ?? "light" };
  }
  return { primary: tema.colors.primary, mode: tema.mode };
}


/** El evento que pide la landing: el valor exacto de la BD y su nombre en prosa. */
export type EventoDeLanding = {
  /** `templates.event_type` exacto («XV años»). */
  eventType: string;
  /** Para el texto: «XV años», «boda», «evento corporativo». */
  nombreEvento: string;
};

/**
 * «Invitación digital de boda, estilo elegante, en color dorado sobre fondo
 * oscuro». El nombre de la plantilla NO va: es el título visible de la
 * tarjeta, y repetirlo haría que un lector de pantalla lo leyera dos veces.
 */
export function altDePlantilla(
  p: Pick<PlantillaMarketplace, "estilo">,
  themeConfig: unknown,
  nombreEvento: string,
): string {
  const partes = [`Invitación digital de ${nombreEvento}`];
  if (p.estilo) partes.push(`estilo ${etiquetaDeEstilo(p.estilo).toLowerCase()}`);
  const { primary, mode } = coloresDeLaPlantilla(themeConfig);
  const color = nombreDeColor(primary);
  if (color) {
    partes.push(`en color ${color}${mode === "dark" ? " sobre fondo oscuro" : ""}`);
  }
  return partes.join(", ");
}

/**
 * Selección pura (la consulta ya filtra; esto lo defiende y es lo que prueba la
 * suite): solo activas, del tipo exacto, con miniatura, en el orden recibido y
 * como mucho `max`.
 */
export function seleccionarPlantillasDeEvento(
  filas: readonly (FilaPlantillaPublica & { is_active?: boolean | null })[],
  evento: EventoDeLanding,
  max: number = MAX_PLANTILLAS_LANDING,
  ahora: Date = new Date(),
): PlantillaLanding[] {
  const elegidas: PlantillaLanding[] = [];
  for (const fila of filas) {
    if (elegidas.length >= max) break;
    if (fila.is_active !== true) continue;
    if (fila.event_type !== evento.eventType) continue;
    if (!fila.preview_image_url) continue;
    const base = aPlantillaPublica(fila, ahora);
    elegidas.push({
      ...base,
      preview_image_url: fila.preview_image_url,
      alt: altDePlantilla(base, fila.theme_config, evento.nombreEvento),
    });
  }
  return elegidas;
}

export async function cargarPlantillasDeEvento(
  supabase: SupabaseClient,
  evento: EventoDeLanding,
  max: number = MAX_PLANTILLAS_LANDING,
): Promise<PlantillaLanding[]> {
  const { data, error } = await supabase
    .from("templates")
    .select(`${COLUMNAS}, is_active`)
    .eq("is_active", true)
    .eq("event_type", evento.eventType)
    .not("preview_image_url", "is", null)
    .order("name", { ascending: true })
    .limit(max);
  // Igual que la galería: sin datos la sección no se pinta, pero el error se
  // registra en vez de tragarse.
  if (error) console.error("landing de evento: no se pudo leer templates", error.message);
  return seleccionarPlantillasDeEvento(
    (data ?? []) as unknown as (FilaPlantillaPublica & { is_active: boolean })[],
    evento,
    max,
  );
}
