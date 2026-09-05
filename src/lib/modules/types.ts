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
  "signatures",
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

/**
 * Preguntas personalizadas del RSVP (alergias, menú, acompañante).
 *
 * El `id` es la llave con la que se guarda la respuesta, NO la etiqueta: así
 * el organizador puede corregir la redacción de una pregunta sin huerfanar las
 * respuestas que ya recibió.
 */
export const RSVP_QUESTION_TYPES = ["text", "choice", "boolean"] as const;
export type RsvpQuestionType = (typeof RSVP_QUESTION_TYPES)[number];

export const RSVP_QUESTION_TYPE_LABELS: Record<RsvpQuestionType, string> = {
  text: "Respuesta libre",
  choice: "Opciones a elegir",
  boolean: "Sí o no",
};

/** Tope de preguntas: confirmar asistencia no debe volverse un formulario. */
export const MAX_RSVP_QUESTIONS = 5;
/** Tope de opciones de una pregunta de opción múltiple. */
export const MAX_RSVP_QUESTION_OPTIONS = 6;

export const rsvpQuestionSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(40)
    // Se usa como llave de un objeto jsonb y como `name` de un input.
    .regex(/^[a-z0-9_-]+$/, "El id solo admite minúsculas, números, - y _"),
  label: z.string().trim().min(1, "Escribe la pregunta.").max(120),
  type: z.enum(RSVP_QUESTION_TYPES).default("text"),
  options: z
    .array(z.string().trim().min(1).max(60))
    .max(MAX_RSVP_QUESTION_OPTIONS)
    .default([]),
  required: z.boolean().default(false),
});

export type RsvpQuestion = z.infer<typeof rsvpQuestionSchema>;

/**
 * ¿Esta pregunta se puede responder siquiera?
 *
 * Una de "elegir una" sin opciones no: el invitado ve un desplegable vacío y
 * no hay valor que `sanitizeAnswers` pueda aceptar. Si además es obligatoria,
 * confirmar sería IMPOSIBLE.
 */
export function isAnswerableQuestion(q: RsvpQuestion): boolean {
  return q.type !== "choice" || q.options.length > 0;
}

export const rsvpConfigSchema = z.object({
  title: z.string().max(120).default("Confirma tu asistencia"),
  description: z.string().max(400).default(""),
  deadline: z.string().default(""),
  allowGuestCount: z.boolean().default(true),
  questions: z.array(rsvpQuestionSchema).max(MAX_RSVP_QUESTIONS).default([]),
});

/** Tope de firmas que se muestran de una vez en la página pública. */
export const SIGNATURES_PAGE_SIZE = 30;

/**
 * Libro de firmas. La CONFIG solo describe el módulo; las firmas en sí NO
 * caben aquí — las escribe un visitante anónimo y `invitation_modules` es
 * solo-dueño por RLS. Viven en su propia tabla (`invitation_signatures`,
 * migración 0023), igual que las respuestas del RSVP.
 */
export const signaturesConfigSchema = z.object({
  title: z.string().max(120).default("Libro de firmas"),
  description: z
    .string()
    .max(400)
    .default("Déjanos unas palabras. Las leeremos todas."),
  /** Etiqueta del botón. Cambia mucho según el tipo de evento. */
  buttonLabel: z.string().max(40).default("Firmar"),
  /**
   * Si el anfitrión quiere revisar antes de publicar. Con `true`, la firma se
   * guarda oculta y él decide. Por defecto NO, porque una boda con moderación
   * obligatoria deja el muro vacío toda la fiesta.
   */
  requireApproval: z.boolean().default(false),
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
  signatures: signaturesConfigSchema,
} satisfies Record<ModuleType, z.ZodType>;

/**
 * Esquemas de ESCRITURA: los mismos, pero exigentes.
 *
 * La distinción importa. `moduleConfigSchemas` se usa al LEER, y ahí
 * `parseConfig` descarta la config ENTERA si algo no valida: una restricción
 * nueva convertiría configs viejos y perfectamente guardados en "inválidos" y
 * la página pública perdería título, descripción y fecha límite en silencio —
 * y el editor persistiría esa pérdida al primer guardado.
 *
 * Por eso lo estricto vive solo aquí, en la puerta de entrada: se rechaza al
 * guardar, que es cuando hay alguien enfrente a quien avisarle, y nunca al
 * leer lo que ya estaba.
 */
const rsvpConfigWriteSchema = rsvpConfigSchema.superRefine((cfg, ctx) => {
  cfg.questions.forEach((q, i) => {
    if (!isAnswerableQuestion(q)) {
      ctx.addIssue({
        code: "custom",
        message: "Una pregunta de opciones necesita al menos una opción.",
        path: ["questions", i, "options"],
      });
    }
  });
});

export const moduleConfigWriteSchemas = {
  ...moduleConfigSchemas,
  rsvp: rsvpConfigWriteSchema,
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
export type SignaturesConfig = z.infer<typeof signaturesConfigSchema>;

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
  signatures: {
    label: "Libro de firmas",
    icon: "🖋️",
    description: "Tus invitados te dejan un mensaje.",
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
