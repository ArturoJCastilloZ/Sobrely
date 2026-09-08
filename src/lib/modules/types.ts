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

/**
 * URL de imagen aceptada por el producto, validada por ORIGEN.
 *
 * Ni `z.string()` a secas ni `z.string().url()`:
 *
 * - a secas deja entrar `javascript:` y `data:`.
 * - **`.url()` TAMPOCO basta**, y esto está medido: se apoya en el constructor
 *   `URL`, que acepta CUALQUIER esquema. `javascript:alert(1)` y
 *   `data:image/svg+xml;…` pasaban los dos.
 * - y `.url()` además RECHAZA `/arte/…`, que es como se sirve el arte de las
 *   plantillas. Sin esto una plantilla no puede traer su propia fotografía, que
 *   es justo lo que la Fase 11 viene a arreglar.
 *
 * Así que: http(s) absoluta —lo que sube el usuario a su Storage— o ruta
 * relativa a la raíz —lo que sirve la app—. `//host/x.png` se rechaza aunque
 * empiece por "/": es un origen externo disfrazado, y colarlo rompería el cero
 * phone-home. Es la misma distinción por origen que `esArteDeLaApp` (`b48d823`).
 */
export const imagenUrlSchema = z.union([
  z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "Solo se admiten URLs http(s)."),
  z.string().regex(/^\/(?!\/)[^\s]*$/, "Ruta de imagen inválida."),
]);

/** Igual, pero vacía = «sin imagen». */
export const imagenUrlOpcionalSchema = z
  .union([z.literal(""), imagenUrlSchema])
  .default("");

// ---- Composición de sección (Fase 11 · P1) --------------------------------

export const SECTION_ALIGNS = ["start", "center", "end"] as const;
export type SectionAlign = (typeof SECTION_ALIGNS)[number];

export const SECTION_FRAMES = ["none", "line", "double", "inset"] as const;
export type SectionFrame = (typeof SECTION_FRAMES)[number];

export const SECTION_FRAME_LABELS: Record<SectionFrame, string> = {
  none: "Sin marco",
  line: "Filete",
  double: "Filete doble",
  inset: "Marco interior",
};

export const SECTION_BLEEDS = ["contained", "full"] as const;
export type SectionBleed = (typeof SECTION_BLEEDS)[number];

export const SECTION_ALIGN_LABELS: Record<SectionAlign, string> = {
  start: "Izquierda",
  center: "Centrado",
  end: "Derecha",
};

export const SECTION_BLEED_LABELS: Record<SectionBleed, string> = {
  contained: "Con márgenes",
  full: "A sangre",
};

/**
 * Perillas de composición que comparten TODOS los módulos que se pintan dentro
 * de `Section`.
 *
 * El research midió que el renderer sólo sabe hacer una columna centrada: 14
 * `text-center` contra 2 `text-left`, y un único eje horizontal en 652 líneas.
 * Esto abre el primer eje.
 *
 * Los defectos son los valores de HOY (`center` / `contained`) y `Section` los
 * trata como "no emitas nada", así que una config vieja renderiza idéntica.
 *
 * `hero` NO los lleva: su composición no pasa por `Section` y es trabajo de P3
 * (`variant`). Meterle estos campos sería config muerta.
 */
const layoutShape = {
  align: z.enum(SECTION_ALIGNS).default("center"),
  bleed: z.enum(SECTION_BLEEDS).default("contained"),
  // Marco de papelería (Fase 11 · P5). Es lo que sostiene la familia F4 del
  // research —la que NO gasta ninguna licencia— y la referencia es Greenvelope:
  // premium por oficio gráfico, no por fotografía. `none` no emite nada.
  frame: z.enum(SECTION_FRAMES).default("none"),
};

// ---- Slot de media (Fase 11 · P2) ----------------------------------------

export const MEDIA_POSITIONS = [
  "none",
  "top",
  "bottom",
  "left",
  "right",
  "background",
] as const;
export type MediaPosition = (typeof MEDIA_POSITIONS)[number];

export const MEDIA_SHAPES = ["rect", "circle", "arch"] as const;
export type MediaShape = (typeof MEDIA_SHAPES)[number];

export const MEDIA_RATIOS = [
  "1/1",
  "4/3",
  "3/4",
  "3/2",
  "2/3",
  "16/9",
] as const;
export type MediaRatio = (typeof MEDIA_RATIOS)[number];

export const MEDIA_FOCALS = ["top", "center", "bottom"] as const;
export type MediaFocal = (typeof MEDIA_FOCALS)[number];

export const MEDIA_POSITION_LABELS: Record<MediaPosition, string> = {
  none: "Sin imagen",
  top: "Arriba",
  bottom: "Abajo",
  left: "A la izquierda",
  right: "A la derecha",
  background: "De fondo",
};

export const MEDIA_SHAPE_LABELS: Record<MediaShape, string> = {
  rect: "Rectángulo",
  circle: "Círculo",
  arch: "Arco",
};

/**
 * Imagen del módulo (Fase 11 · P2).
 *
 * El research midió que la fotografía del producto NO existe: 0 de 50 heroes
 * con foto y 30 de 30 galerías vacías. Las únicas superficies de imagen del
 * catálogo estaban declaradas y vacías. Esto le da una a cada módulo.
 *
 * `position: "none"` por defecto — y `Section` entonces renderiza EXACTAMENTE
 * el árbol de antes, sin una envoltura de más.
 *
 * `left`/`right` son el eje horizontal de verdad: son el «editorial partido»
 * (familia F1 del research), y por eso la retícula genérica de 12 columnas se
 * pudo dejar fuera de P1 — el reparto lo hace el propio slot.
 *
 * `overlay` es un velo que se declara POR IMAGEN, no un valor fijo. Es la
 * lección que ya está pagada: `scripts/verificar-contraste-arte.mts` calcula el
 * velo MÍNIMO midiendo el peor píxel de la banda central, porque un valor fijo o
 * se queda corto y deja texto ilegible, o se pasa y borra la foto. El defecto es
 * 0 porque sin texto encima no hace falta velar nada.
 */
const mediaShape = {
  media: z
    .object({
      url: imagenUrlOpcionalSchema,
      // Vacío = decorativa. Quien la pinta le pone `aria-hidden` en ese caso,
      // que es lo correcto para una imagen sin contenido propio.
      alt: z.string().max(160).default(""),
      position: z.enum(MEDIA_POSITIONS).default("none"),
      ratio: z.enum(MEDIA_RATIOS).default("4/3"),
      focal: z.enum(MEDIA_FOCALS).default("center"),
      overlay: z.number().min(0).max(1).default(0),
      shape: z.enum(MEDIA_SHAPES).default("rect"),
    })
    // El defecto va explícito y no `{}`: esta versión de zod pide el objeto de
    // SALIDA completo. Es el mismo patrón que `backgroundImage` en theme.ts.
    .default({
      url: "",
      alt: "",
      position: "none",
      ratio: "4/3",
      focal: "center",
      overlay: 0,
      shape: "rect",
    }),
};

/** `z.object` + las perillas de composición, para no repetirlas en 11 sitios. */
const objetoConLayout = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ ...shape, ...layoutShape, ...mediaShape });

// ---- Per-module config schemas -------------------------------------------

export const HERO_VARIANTS = [
  "centered",
  "offset",
  "split",
  "editorial",
  "plain",
] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

export const HERO_VARIANT_LABELS: Record<HeroVariant, string> = {
  centered: "Centrada",
  offset: "Texto a un lado",
  split: "Partida",
  editorial: "Editorial",
  plain: "Sólo tipografía",
};

export const heroConfigSchema = z.object({
  title: z.string().max(120).default("Nuestra celebración"),
  subtitle: z.string().max(200).default(""),
  // Antes `z.string().url()`, que RECHAZABA `/arte/…`: una plantilla no podía
  // traer su propia portada. Ver `imagenUrlSchema`.
  imageUrl: imagenUrlOpcionalSchema,
  ctaLabel: z.string().max(40).default(""),
  // El velo sobre la foto del hero estaba HARDCODEADO en `rgba(0,0,0,.45)`, lo
  // que contradice la disciplina del velo MÍNIMO medido por imagen
  // (`verificar-contraste-arte.mts`). Ahora se declara. El defecto sigue siendo
  // 0.45 a proposito: es el valor que tenian las invitaciones ya guardadas, y
  // cambiarlo les moveria el render.
  overlay: z.number().min(0).max(1).default(0.45),
  // Composición de la portada (Fase 11 · P3). El hero tenía UNA sola: texto
  // centrado sobre foto a sangre. `centered` es esa, y es el defecto, así que
  // las 50 no se mueven.
  //
  //   centered  · la de siempre
  //   offset    · misma foto a sangre, texto abajo a un lado (referencia: Joy)
  //   split     · foto a la mitad, texto en la otra (familia F1 del research)
  //   editorial · sin foto a sangre: tipografía grande y foto contenida
  //   plain     · sólo tipografía, IGNORA la foto (familia F4, cero licencias)
  variant: z.enum(HERO_VARIANTS).default("centered"),
});

export const countdownConfigSchema = objetoConLayout({
  title: z.string().max(120).default("Faltan"),
  // ISO datetime string; empty means "not set yet"
  targetDate: z.string().default(""),
  // When true, the countdown uses the invitation's event_date instead of
  // its own targetDate (single source of truth).
  useEventDate: z.boolean().default(false),
});

export const mapConfigSchema = objetoConLayout({
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

export const rsvpConfigSchema = objetoConLayout({
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
export const signaturesConfigSchema = objetoConLayout({
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

export const welcomeConfigSchema = objetoConLayout({
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

export const galleryConfigSchema = objetoConLayout({
  title: z.string().max(120).default("Galería"),
  // Mismo motivo que el hero: una plantilla tiene que poder sembrar sus
  // imágenes desde `public/`.
  images: z.array(imagenUrlSchema).max(20).default([]),
  layout: z.enum(GALLERY_LAYOUTS).default("grid"),
  lightbox: z.boolean().default(true),
  kenBurns: z.boolean().default(false),
});

export const videoConfigSchema = objetoConLayout({
  title: z.string().max(120).default("Video"),
  url: optionalUrl, // YouTube o Vimeo
});

export const itineraryConfigSchema = objetoConLayout({
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

export const dresscodeConfigSchema = objetoConLayout({
  title: z.string().max(120).default("Código de vestimenta"),
  level: z.enum(DRESSCODE_LEVELS).default("formal"),
  description: z.string().max(400).default(""),
  // Optional custom image (uploaded by the user) shown instead of the built-in
  // illustration.
  imageUrl: optionalUrl,
});

export const giftsConfigSchema = objetoConLayout({
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

export const musicConfigSchema = objetoConLayout({
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

/** La imagen de un módulo, ya normalizada. */
export type MediaConfig = z.infer<typeof mediaShape.media>;

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

/**
 * Metadatos de cada tipo. El ICONO ya no vive aqui: era un emoji, y un emoji se
 * renderiza con la fuente del sistema, no hereda color ni grosor del tema y
 * cambia de forma entre Windows, Android y macOS. Ahora es un componente de
 * `lucide-react` y vive en `components/modules/registry.tsx`, junto al resto
 * de lo que define un modulo.
 */
export const MODULE_META: Record<
  ModuleType,
  { label: string; description: string }
> = {
  hero: {
    label: "Portada",
    description: "Título principal, subtítulo e imagen de fondo.",
  },
  welcome: {
    label: "Bienvenida",
    description: "Mensaje de bienvenida para tus invitados.",
  },
  countdown: {
    label: "Cuenta regresiva",
    description: "Temporizador hacia la fecha del evento.",
  },
  map: {
    label: "Ubicación",
    description: "Dirección del lugar con enlace a mapa.",
  },
  gallery: {
    label: "Galería",
    description: "Colección de fotos del evento.",
  },
  video: {
    label: "Video",
    description: "Video de YouTube o Vimeo.",
  },
  itinerary: {
    label: "Itinerario",
    description: "Programa del evento por horarios.",
  },
  dresscode: {
    label: "Código de vestimenta",
    description: "Indica el dress code a tus invitados.",
  },
  gifts: {
    label: "Mesa de regalos",
    description: "Enlaces a tus mesas de regalos.",
  },
  music: {
    label: "Música",
    description: "Enlace a Spotify, YouTube o audio.",
  },
  rsvp: {
    label: "Confirmación (RSVP)",
    description: "Formulario para confirmar asistencia.",
  },
  signatures: {
    label: "Libro de firmas",
    description: "Tus invitados te dejan un mensaje.",
  },
};

/** Returns the default config for a module type. */
export function defaultConfigFor(type: ModuleType): Record<string, unknown> {
  return moduleConfigSchemas[type].parse({});
}

/**
 * Lee un `config` guardado y lo normaliza contra su esquema.
 *
 * Antes, si UN campo no validaba, se descartaba la config ENTERA y se devolvían
 * los defaults. El comentario decía "falls back", pero el efecto real era
 * pérdida total: un `imageUrl` mal guardado se llevaba por delante el título,
 * la descripción y todo lo demás de ese módulo — y el editor PERSISTÍA esa
 * pérdida al primer guardado, porque escribe lo que tiene en pantalla.
 *
 * Ahora el descarte es por CAMPO: se parte de los defaults y se acepta cada
 * campo guardado que valide por sí solo. Un campo roto cuesta ese campo, no el
 * módulo.
 *
 * Se midió antes de cambiarlo, porque endurecer o relajar una lectura es
 * retroactivo sobre datos que ya existen: de los **52 módulos en producción,
 * cero** fallaban la validación. El riesgo era latente, no activo — pero
 * latente en el peor sitio posible.
 *
 * `onDescartado` permite reportar lo que se cayó en vez de tragárselo; sin él,
 * el modo de fallo silencioso solo se hace más pequeño, no desaparece.
 */
export function parseConfig(
  type: ModuleType,
  raw: unknown,
  onDescartado?: (campo: string) => void,
): Record<string, unknown> {
  const esquema = moduleConfigSchemas[type];
  const directo = esquema.safeParse(raw ?? {});
  if (directo.success) return directo.data as Record<string, unknown>;

  // Camino lento, solo cuando algo no valida. Se prueba campo a campo sobre los
  // defaults: así se conserva todo lo que sí es válido.
  const base = defaultConfigFor(type);
  if (raw === null || typeof raw !== "object") return base;

  const salida: Record<string, unknown> = { ...base };
  for (const [campo, valor] of Object.entries(raw as Record<string, unknown>)) {
    if (!(campo in base)) continue; // campo que el esquema no conoce
    const intento = esquema.safeParse({ ...salida, [campo]: valor });
    if (intento.success) {
      salida[campo] = (intento.data as Record<string, unknown>)[campo];
    } else {
      onDescartado?.(campo);
    }
  }
  return salida;
}
