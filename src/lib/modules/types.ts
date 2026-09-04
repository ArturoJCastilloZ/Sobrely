import { z } from "zod";

/**
 * Single source of truth for invitation module types, their config schemas
 * and defaults. Shared by the editor (client validation) and the server
 * actions (server validation). New module types are added here.
 */

export const MODULE_TYPES = [
  "hero",
  "welcome",
  "countdown",
  "map",
  "gallery",
  "video",
  "itinerary",
  "dresscode",
  "gifts",
  "music",
  "rsvp",
  "canvas",
] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

/** Optional external URL: valid http(s) URL or empty string. */
const optionalUrl = z
  .union([z.string().trim().url(), z.literal("")])
  .default("");

// ---- Per-module config schemas -------------------------------------------

export const heroConfigSchema = z.object({
  title: z.string().max(120).default("Nuestra celebración"),
  subtitle: z.string().max(200).default(""),
  imageUrl: z.string().url().or(z.literal("")).default(""),
  ctaLabel: z.string().max(40).default(""),
});

export const countdownConfigSchema = z.object({
  title: z.string().max(120).default("Faltan"),
  // ISO datetime string; empty means "not set yet"
  targetDate: z.string().default(""),
  // When true, the countdown uses the invitation's event_date instead of
  // its own targetDate (single source of truth).
  useEventDate: z.boolean().default(false),
});

export const mapConfigSchema = z.object({
  title: z.string().max(120).default("Ubicación"),
  venueName: z.string().max(160).default(""),
  address: z.string().max(300).default(""),
});

export const rsvpConfigSchema = z.object({
  title: z.string().max(120).default("Confirma tu asistencia"),
  description: z.string().max(400).default(""),
  deadline: z.string().default(""),
  allowGuestCount: z.boolean().default(true),
});

export const welcomeConfigSchema = z.object({
  title: z.string().max(120).default("Bienvenidos"),
  message: z.string().max(1000).default(""),
});

export const GALLERY_LAYOUTS = [
  "grid",
  "masonry",
  "collage",
  "carousel",
] as const;
export type GalleryLayout = (typeof GALLERY_LAYOUTS)[number];

export const GALLERY_LAYOUT_LABELS: Record<GalleryLayout, string> = {
  grid: "Cuadrícula",
  masonry: "Mosaico",
  collage: "Collage",
  carousel: "Carrusel",
};

export const galleryConfigSchema = z.object({
  title: z.string().max(120).default("Galería"),
  images: z.array(z.string().url()).max(20).default([]),
  layout: z.enum(GALLERY_LAYOUTS).default("grid"),
  lightbox: z.boolean().default(true),
  kenBurns: z.boolean().default(false),
});

export const videoConfigSchema = z.object({
  title: z.string().max(120).default("Video"),
  url: optionalUrl, // YouTube o Vimeo
});

export const itineraryConfigSchema = z.object({
  title: z.string().max(120).default("Itinerario"),
  items: z
    .array(
      z.object({
        time: z.string().max(40).default(""),
        label: z.string().max(160).default(""),
      }),
    )
    .max(30)
    .default([]),
});

export const DRESSCODE_LEVELS = [
  "etiqueta",
  "formal",
  "semi-formal",
  "casual",
  "custom",
] as const;
export type DresscodeLevel = (typeof DRESSCODE_LEVELS)[number];

export const DRESSCODE_LABELS: Record<DresscodeLevel, string> = {
  etiqueta: "Etiqueta",
  formal: "Formal",
  "semi-formal": "Semi-formal",
  casual: "Casual",
  custom: "Personalizado",
};

export const dresscodeConfigSchema = z.object({
  title: z.string().max(120).default("Código de vestimenta"),
  level: z.enum(DRESSCODE_LEVELS).default("formal"),
  description: z.string().max(400).default(""),
  // Optional custom image (uploaded by the user) shown instead of the built-in
  // illustration.
  imageUrl: optionalUrl,
});

export const giftsConfigSchema = z.object({
  title: z.string().max(120).default("Mesa de regalos"),
  description: z.string().max(400).default(""),
  links: z
    .array(
      z.object({
        label: z.string().max(80).default(""),
        url: optionalUrl,
      }),
    )
    .max(10)
    .default([]),
});

export const musicConfigSchema = z.object({
  title: z.string().max(120).default("Música"),
  url: optionalUrl, // Spotify, YouTube o audio
});

/** Color hexadecimal; local para no acoplar `modules` con `theme`. */
const canvasHex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal de 6 dígitos.");

export const CANVAS_LAYER_KINDS = ["text", "image"] as const;
export type CanvasLayerKind = (typeof CANVAS_LAYER_KINDS)[number];

/**
 * Proporción de la sección. La clave del diseño: al fijar una PROPORCIÓN en vez
 * de una altura en píxeles, las coordenadas fraccionarias de las capas siguen
 * significando lo mismo en cualquier ancho de pantalla. El competidor resuelve
 * esto fijando 900px de alto, o sea renunciando a ser responsive; aquí no hace
 * falta.
 */
export const CANVAS_ASPECTS = ["4/5", "1/1", "3/4", "9/16"] as const;
export type CanvasAspect = (typeof CANVAS_ASPECTS)[number];

export const CANVAS_ASPECT_LABELS: Record<CanvasAspect, string> = {
  "4/5": "Vertical suave (4:5)",
  "1/1": "Cuadrada (1:1)",
  "3/4": "Vertical (3:4)",
  "9/16": "Historia (9:16)",
};

/**
 * Una capa colocable dentro de la sección.
 *
 * Posición y tamaño en FRACCIONES (0–1) del contenedor, misma técnica que ya
 * usan los stickers en producción — es la única que sobrevive bien a móvil. El
 * orden del arreglo es el z-index: el último queda encima.
 */
export const canvasLayerSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(CANVAS_LAYER_KINDS),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.5),
  /** Ancho como fracción del contenedor. */
  w: z.number().min(0.05).max(1).default(0.6),
  rotation: z.number().min(-180).max(180).default(0),
  // --- capa de texto ---
  text: z.string().max(300).default(""),
  /**
   * Tamaño en `cqw`: porcentaje del ANCHO del contenedor. Así el texto escala
   * con la sección en lugar de quedarse chico en móvil o gigante en escritorio,
   * y sigue siendo una unidad relativa (no rompe el zoom como `vw`).
   */
  fontSize: z.number().min(1).max(30).default(7),
  color: canvasHex.default("#111111"),
  align: z.enum(["left", "center", "right"]).default("center"),
  // --- capa de imagen ---
  url: optionalUrl,
});
export type CanvasLayer = z.infer<typeof canvasLayerSchema>;

export const canvasConfigSchema = z.object({
  title: z.string().max(120).default(""),
  aspect: z.enum(CANVAS_ASPECTS).default("4/5"),
  /** Fondo de la sección. Vacío = hereda el de la invitación. */
  background: canvasHex.or(z.literal("")).default(""),
  layers: z.array(canvasLayerSchema).max(24).default([]),
});
export type CanvasConfig = z.infer<typeof canvasConfigSchema>;

export const moduleConfigSchemas = {
  hero: heroConfigSchema,
  welcome: welcomeConfigSchema,
  countdown: countdownConfigSchema,
  map: mapConfigSchema,
  gallery: galleryConfigSchema,
  video: videoConfigSchema,
  itinerary: itineraryConfigSchema,
  dresscode: dresscodeConfigSchema,
  gifts: giftsConfigSchema,
  music: musicConfigSchema,
  rsvp: rsvpConfigSchema,
  canvas: canvasConfigSchema,
} satisfies Record<ModuleType, z.ZodType>;

export type HeroConfig = z.infer<typeof heroConfigSchema>;
export type WelcomeConfig = z.infer<typeof welcomeConfigSchema>;
export type CountdownConfig = z.infer<typeof countdownConfigSchema>;
export type MapConfig = z.infer<typeof mapConfigSchema>;
export type GalleryConfig = z.infer<typeof galleryConfigSchema>;
export type VideoConfig = z.infer<typeof videoConfigSchema>;
export type ItineraryConfig = z.infer<typeof itineraryConfigSchema>;
export type DresscodeConfig = z.infer<typeof dresscodeConfigSchema>;
export type GiftsConfig = z.infer<typeof giftsConfigSchema>;
export type MusicConfig = z.infer<typeof musicConfigSchema>;
export type RsvpConfig = z.infer<typeof rsvpConfigSchema>;

// ---- Registry metadata ----------------------------------------------------

export const MODULE_META: Record<
  ModuleType,
  { label: string; icon: string; description: string }
> = {
  hero: {
    label: "Portada",
    icon: "✨",
    description: "Título principal, subtítulo e imagen de fondo.",
  },
  welcome: {
    label: "Bienvenida",
    icon: "💌",
    description: "Mensaje de bienvenida para tus invitados.",
  },
  countdown: {
    label: "Cuenta regresiva",
    icon: "⏳",
    description: "Temporizador hacia la fecha del evento.",
  },
  map: {
    label: "Ubicación",
    icon: "📍",
    description: "Dirección del lugar con enlace a mapa.",
  },
  gallery: {
    label: "Galería",
    icon: "🖼️",
    description: "Colección de fotos del evento.",
  },
  video: {
    label: "Video",
    icon: "🎬",
    description: "Video de YouTube o Vimeo.",
  },
  itinerary: {
    label: "Itinerario",
    icon: "🗓️",
    description: "Programa del evento por horarios.",
  },
  dresscode: {
    label: "Código de vestimenta",
    icon: "👗",
    description: "Indica el dress code a tus invitados.",
  },
  gifts: {
    label: "Mesa de regalos",
    icon: "🎁",
    description: "Enlaces a tus mesas de regalos.",
  },
  music: {
    label: "Música",
    icon: "🎵",
    description: "Enlace a Spotify, YouTube o audio.",
  },
  rsvp: {
    label: "Confirmación (RSVP)",
    icon: "✅",
    description: "Formulario para confirmar asistencia.",
  },
  canvas: {
    label: "Sección libre",
    icon: "🧩",
    description:
      "Un lienzo con proporción fija donde colocas textos e imágenes donde quieras.",
  },
};

/** Returns the default config for a module type. */
export function defaultConfigFor(type: ModuleType): Record<string, unknown> {
  return moduleConfigSchemas[type].parse({});
}

/**
 * Parses/normalizes a stored config against its schema, filling defaults for
 * missing fields. Falls back to defaults if the stored data is invalid.
 */
export function parseConfig(
  type: ModuleType,
  raw: unknown,
): Record<string, unknown> {
  const result = moduleConfigSchemas[type].safeParse(raw ?? {});
  return result.success
    ? (result.data as Record<string, unknown>)
    : defaultConfigFor(type);
}
