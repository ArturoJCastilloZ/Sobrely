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

/** Título y subtítulo de la portada tal como los traía la plantilla de origen. */
export type PortadaBase = { title: string; subtitle: string };

/**
 * Lee la portada de `templates.modules_config` (tolerante a datos raros). `null` si no hay.
 * Una sola función para el servidor del evento, la página del editor y las pruebas.
 */
export function leerPortadaDePlantilla(modulesConfig: unknown): PortadaBase | null {
  if (!Array.isArray(modulesConfig)) return null;
  const portada = (modulesConfig as { module_type?: unknown; config?: Record<string, unknown> }[]).find(
    (m) => m?.module_type === "hero",
  );
  if (!portada?.config) return null;
  const { title, subtitle } = portada.config;
  return {
    title: typeof title === "string" ? title : "",
    subtitle: typeof subtitle === "string" ? subtitle : "",
  };
}

/**
 * ¿La persona ya puso SUS nombres en la portada? Es cierto si el título O el subtítulo ya no
 * son los de la plantilla. Los dos, porque según la plantilla los nombres van en uno u otro: en
 * una boda el título SON los nombres («Ana & Carlos») y en XV años el título es una frase y el
 * nombre va en el subtítulo (`ranuraDeNombres` en `datos-iniciales.ts`). Mirar solo el título
 * dejaba «nombres» pendiente a quien ya había escrito su nombre en un XV.
 * Sin plantilla (invitación en blanco) se compara con el título por defecto y un subtítulo vacío.
 */
export function nombresPersonalizados(
  modulos: ModuloLeve[],
  base: PortadaBase | null | undefined,
): boolean {
  const portada = visible(modulos, "hero");
  if (!portada) return false;
  const titulo = texto(portada.config, "title");
  const subtitulo = texto(portada.config, "subtitle");
  const tituloBase = (base?.title ?? "").trim() || TITULO_PORTADA_POR_DEFECTO;
  const subtituloBase = (base?.subtitle ?? "").trim();
  const tituloNuevo = titulo !== "" && titulo !== tituloBase;
  const subtituloNuevo = subtitulo !== "" && subtitulo !== subtituloBase;
  return tituloNuevo || subtituloNuevo;
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
  portadaDeLaPlantilla: PortadaBase | null | undefined;
}): PasoDeProgreso[] {
  const faltan = new Set(
    faltantesSinNombres({ fechaDelEvento: datos.fechaDelEvento, modulos: datos.modulos }),
  );
  return [
    {
      clave: "nombres",
      etiqueta: "Tus nombres",
      hecho: nombresPersonalizados(datos.modulos, datos.portadaDeLaPlantilla),
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
