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

/**
 * Lista de progreso del editor (T13): los mismos cuatro puntos del evento
 * `complete_draft`, en el mismo criterio, para que lo que la persona ve y lo que
 * se cuenta en el embudo no puedan discrepar. Es informativa: NUNCA bloquea el
 * botón de publicar (el riesgo que el plan señala para esta alternativa).
 */
export type ClaveProgreso = "nombres" | "fecha" | "lugar" | "foto";

export type PasoDeProgreso = {
  clave: ClaveProgreso;
  etiqueta: string;
  hecho: boolean;
  /** Qué hacer si falta; una frase corta. */
  ayuda: string;
};

export function progresoEsencial(datos: {
  fechaDelEvento: string | null | undefined;
  modulos: ModuloLeve[];
  tituloDeLaPlantilla: string | null | undefined;
}): PasoDeProgreso[] {
  const faltan = new Set(
    faltantesSinNombres({ fechaDelEvento: datos.fechaDelEvento, modulos: datos.modulos }),
  );
  return [
    {
      clave: "nombres",
      etiqueta: "Tus nombres",
      hecho: nombresPersonalizados(datos.modulos, datos.tituloDeLaPlantilla),
      ayuda: "Cambia el título de la portada por el de tu evento.",
    },
    {
      clave: "fecha",
      etiqueta: "La fecha",
      hecho: !faltan.has("fecha"),
      ayuda: "Ponla en Ajustes para activar la cuenta regresiva.",
    },
    {
      clave: "lugar",
      etiqueta: "El lugar",
      hecho: !faltan.has("lugar"),
      ayuda: "Agrega el nombre del lugar o la dirección en Ubicación.",
    },
    {
      clave: "foto",
      etiqueta: "Tu foto",
      hecho: !faltan.has("foto"),
      ayuda: "Sube una foto tuya en la portada o en la galería.",
    },
  ];
}
