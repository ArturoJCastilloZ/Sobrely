/**
 * ¿Un borrador está «completo»? (evento `complete_draft`, T05)
 *
 * Criterio aprobado por el dueño (24 oct 2026): nombres, fecha, lugar y foto.
 * NO es `getPublishPreflight`: esa lista es de recomendaciones previas a
 * publicar (RSVP, música, vestimenta) y no mira nombres ni foto.
 *
 * Cada punto exige una ACCIÓN de la persona, no solo un campo lleno, porque una
 * plantilla ya trae título y foto de ejemplo:
 *  - fecha:  `event_date` no vacía (la plantilla nace sin fecha).
 *  - lugar:  el módulo de ubicación visible con lugar o dirección.
 *  - nombres: el título de la portada distinto del que traía la plantilla.
 *  - foto:   una imagen SUBIDA por la persona (bucket `invitation-images`), en la
 *            portada o en la galería; las de `/arte/…` son de la plantilla.
 *
 * Pura, sin `server-only`, para poder probarla.
 */
export const TITULO_PORTADA_POR_DEFECTO = "Nuestra celebración";
const MARCA_DE_FOTO_SUBIDA = "/invitation-images/";

type ModuloLeve = {
  module_type: string;
  is_visible: boolean;
  config: Record<string, unknown>;
};

export type Faltante = "fecha" | "lugar" | "nombres" | "foto";

function texto(config: Record<string, unknown>, clave: string): string {
  const v = config[clave];
  return typeof v === "string" ? v.trim() : "";
}

function visible(modulos: ModuloLeve[], tipo: string): ModuloLeve | undefined {
  return modulos.find((m) => m.module_type === tipo && m.is_visible);
}

function esFotoSubida(url: unknown): boolean {
  return typeof url === "string" && url.includes(MARCA_DE_FOTO_SUBIDA);
}

/** Todo menos los nombres (que necesitan la plantilla de origen para comparar). */
export function faltantesSinNombres(datos: {
  fechaDelEvento: string | null | undefined;
  modulos: ModuloLeve[];
}): Faltante[] {
  const { fechaDelEvento, modulos } = datos;
  const faltan: Faltante[] = [];

  if (!fechaDelEvento || fechaDelEvento.trim().length === 0) faltan.push("fecha");

  const mapa = visible(modulos, "map");
  if (!mapa || !(texto(mapa.config, "venueName") || texto(mapa.config, "address"))) {
    faltan.push("lugar");
  }

  const portada = visible(modulos, "hero");
  const galeria = visible(modulos, "gallery");
  const imagenes = Array.isArray(galeria?.config.images) ? (galeria!.config.images as unknown[]) : [];
  if (!(portada && esFotoSubida(portada.config.imageUrl)) && !imagenes.some(esFotoSubida)) {
    faltan.push("foto");
  }

  return faltan;
}

/** El título de la portada ya no es el de la plantilla (ni está vacío). */
export function nombresPersonalizados(
  modulos: ModuloLeve[],
  tituloDeLaPlantilla: string | null | undefined,
): boolean {
  const portada = visible(modulos, "hero");
  if (!portada) return false;
  const actual = texto(portada.config, "title");
  if (!actual) return false;
  const base = (tituloDeLaPlantilla ?? "").trim() || TITULO_PORTADA_POR_DEFECTO;
  return actual !== base;
}
