/**
 * Contenido del blog (SEO). Posts como datos tipados con bloques simples —
 * sin dependencias externas ni parser de markdown, para no romper la soberanía
 * de datos ni agregar superficie. Para publicar un post: agrega una entrada a
 * `BLOG_POSTS` con su cuerpo en bloques.
 */

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  /** Fecha de publicación en ISO (YYYY-MM-DD). */
  date: string;
  /** Enlaces internos recomendados (slugs de landing) para el final del post. */
  related?: string[];
  body: BlogBlock[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "como-hacer-una-invitacion-digital-para-boda",
    title: "Cómo hacer una invitación digital para boda (paso a paso)",
    description:
      "Guía paso a paso para crear tu invitación digital de boda: qué información incluir, cómo personalizarla y cómo compartirla para recibir confirmaciones.",
    date: "2026-08-14",
    related: ["invitaciones-digitales-boda"],
    body: [
      {
        type: "p",
        text: "Una invitación digital de boda te ahorra tiempo y dinero, se comparte por un enlace y te permite saber en tiempo real cuántos invitados asistirán. En esta guía verás, paso a paso, cómo crear la tuya.",
      },
      { type: "h2", text: "1. Reúne la información del evento" },
      {
        type: "p",
        text: "Antes de diseñar, ten a la mano los datos esenciales. Tenerlos listos hace que el resto sea muy rápido:",
      },
      {
        type: "ul",
        items: [
          "Nombres de la pareja y fecha de la boda.",
          "Lugar y hora de la ceremonia y de la recepción.",
          "Itinerario del día (ceremonia, coctel, cena, fiesta).",
          "Código de vestimenta.",
          "Mesa de regalos o datos para obsequios.",
        ],
      },
      { type: "h2", text: "2. Elige un diseño y personalízalo" },
      {
        type: "p",
        text: "Empieza desde una plantilla y ajústala a tu estilo: colores, tipografías y temática. Agrega tus fotos en la portada y en la galería, y activa solo los módulos que necesitas (cuenta regresiva, mapa, itinerario, código de vestimenta, mesa de regalos).",
      },
      { type: "h2", text: "3. Decide cómo van a confirmar tus invitados" },
      {
        type: "p",
        text: "Tienes dos opciones. La confirmación abierta usa un solo enlace público donde cualquiera confirma. La lista de invitados te permite registrar a cada persona con su cupo y darle un enlace único con pase QR para el control de acceso en la entrada.",
      },
      { type: "h2", text: "4. Publica y comparte" },
      {
        type: "p",
        text: "Publica tu invitación para obtener un enlace y compártelo por WhatsApp o redes. A partir de ahí, las confirmaciones llegan a tu panel y puedes ver cuántas personas asistirán.",
      },
      { type: "h2", text: "5. Da seguimiento a las confirmaciones" },
      {
        type: "p",
        text: "Revisa tu panel para ver quién confirmó, enviar recordatorios a quienes faltan y, el día del evento, registrar el ingreso con el código QR de cada invitado.",
      },
    ],
  },
  {
    slug: "textos-para-invitacion-de-xv-anos",
    title: "Textos para invitación de XV años: 10 ejemplos",
    description:
      "Ejemplos de textos para invitación de XV años: formales, modernos y cortos. Copia, adapta y úsalos en tu invitación digital.",
    date: "2026-08-14",
    related: ["invitaciones-digitales-xv-anos"],
    body: [
      {
        type: "p",
        text: "El texto de la invitación marca el tono de la fiesta. Aquí tienes ejemplos que puedes copiar y adaptar según el estilo de tus XV años.",
      },
      { type: "h2", text: "Textos formales" },
      {
        type: "ul",
        items: [
          "\"Con la bendición de Dios y el amor de mis padres, te invito a celebrar mis XV años.\"",
          "\"Hay momentos que se guardan en el corazón. Acompáñame a celebrar mis quince años.\"",
        ],
      },
      { type: "h2", text: "Textos modernos" },
      {
        type: "ul",
        items: [
          "\"Se acabó la espera: ¡llegaron mis XV! Ven a celebrarlo conmigo.\"",
          "\"Una noche, mil recuerdos. Te espero en mis quince años.\"",
        ],
      },
      { type: "h2", text: "Textos cortos" },
      {
        type: "ul",
        items: [
          "\"¡Cumplo XV y quiero celebrarlo contigo!\"",
          "\"Mis quince, tu presencia. Te espero.\"",
        ],
      },
      { type: "h2", text: "Consejo final" },
      {
        type: "p",
        text: "Elige un texto acorde a la temática y colócalo en la portada o en el módulo de bienvenida de tu invitación digital. Recuerda incluir siempre la fecha, la hora y el lugar, y activar la confirmación de asistencia.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** Minutos de lectura estimados (≈200 palabras por minuto). */
export function readingMinutes(post: BlogPost): number {
  const words = post.body.reduce((n, b) => {
    if (b.type === "ul") return n + b.items.join(" ").split(/\s+/).length;
    return n + b.text.split(/\s+/).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}
