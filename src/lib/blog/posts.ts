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
  {
    slug: "invitacion-digital-o-impresa",
    title: "Invitación digital o impresa: ventajas, costos y cuál elegir",
    description:
      "Comparamos la invitación digital y la impresa en costo, tiempo, alcance y sustentabilidad para ayudarte a decidir cuál conviene para tu evento.",
    date: "2026-08-13",
    body: [
      {
        type: "p",
        text: "Elegir entre una invitación digital y una impresa depende de tu presupuesto, tus tiempos y el tipo de evento. Aquí van las diferencias clave para que decidas con calma.",
      },
      { type: "h2", text: "Costo" },
      {
        type: "p",
        text: "La invitación impresa suma diseño, papel, imprenta y envío, y el costo crece con cada invitado. La digital tiene un costo único, sin importar a cuántas personas la mandes.",
      },
      { type: "h2", text: "Tiempo y cambios" },
      {
        type: "p",
        text: "Con la digital publicas en el día y corriges un dato cuando quieras. Con la impresa, un error implica reimprimir. Si tu evento aún tiene detalles por cerrar, la digital te da flexibilidad.",
      },
      { type: "h2", text: "Alcance y confirmaciones" },
      {
        type: "p",
        text: "La digital se comparte por WhatsApp o redes y trae confirmación de asistencia en línea, así ves cuántos van sin llamar a nadie. La impresa depende de que cada quien responda por su cuenta.",
      },
      { type: "h2", text: "Sustentabilidad" },
      {
        type: "p",
        text: "La invitación digital no usa papel ni transporte, una ventaja si te importa el impacto ambiental.",
      },
      { type: "h2", text: "¿Cuál elegir?" },
      {
        type: "p",
        text: "Para la mayoría de los eventos, la invitación digital gana en costo, rapidez y control. La impresa tiene sentido como recuerdo físico o en celebraciones muy formales; incluso puedes combinar ambas.",
      },
    ],
  },
  {
    slug: "controlar-acceso-evento-con-codigos-qr",
    title: "Cómo controlar el acceso a tu evento con códigos QR",
    description:
      "Aprende a usar códigos QR para el control de acceso en tu evento: pases por invitado, escaneo en la entrada y registro de asistentes en tiempo real.",
    date: "2026-08-12",
    related: ["invitaciones-digitales-corporativas", "invitaciones-digitales-boda"],
    body: [
      {
        type: "p",
        text: "Si quieres saber exactamente quién entra a tu evento y evitar colados, el control de acceso con códigos QR es la forma más simple de lograrlo. Así funciona.",
      },
      { type: "h2", text: "1. Crea tu lista de invitados" },
      {
        type: "p",
        text: "Registra a cada invitado con su nombre y cuántos lugares tiene. A cada uno se le genera un enlace único y un pase con su propio código QR.",
      },
      { type: "h2", text: "2. Comparte el pase con cada invitado" },
      {
        type: "p",
        text: "Cada persona recibe su enlace, confirma su asistencia y obtiene su pase con QR, que puede guardar o descargar en el celular.",
      },
      { type: "h2", text: "3. Escanea en la entrada" },
      {
        type: "p",
        text: "El día del evento, desde tu panel escaneas el QR de cada invitado con la cámara. El sistema marca su ingreso y te avisa si alguien ya había entrado, evitando duplicados.",
      },
      { type: "h2", text: "Ventajas del control con QR" },
      {
        type: "ul",
        items: [
          "Sabes en tiempo real cuántas personas han ingresado.",
          "Cada pase es personal e intransferible por su código único.",
          "No necesitas listas en papel ni pasar lista a mano.",
        ],
      },
    ],
  },
  {
    slug: "ideas-para-invitaciones-digitales-de-cumpleanos",
    title: "Ideas para invitaciones digitales de cumpleaños",
    description:
      "Ideas y consejos para que tu invitación digital de cumpleaños destaque: temáticas, textos, cuenta regresiva y cómo compartirla.",
    date: "2026-08-11",
    related: ["invitaciones-digitales-cumpleanos"],
    body: [
      {
        type: "p",
        text: "Una buena invitación de cumpleaños da el tono de la fiesta desde el primer vistazo. Aquí tienes ideas para que la tuya destaque.",
      },
      { type: "h2", text: "Elige una temática clara" },
      {
        type: "p",
        text: "Define un estilo (elegante, colorido, minimalista o infantil) y mantén colores y tipografías coherentes con la fiesta. Una temática consistente se ve más profesional.",
      },
      { type: "h2", text: "Suma una cuenta regresiva" },
      {
        type: "p",
        text: "Un contador hacia el día del cumpleaños genera expectativa y recuerda a tus invitados que la fecha se acerca.",
      },
      { type: "h2", text: "Textos que invitan a venir" },
      {
        type: "ul",
        items: [
          "\"¡Cumplo años y quiero celebrarlo contigo!\"",
          "\"Habrá pastel, música y buena compañía. Solo faltas tú.\"",
          "\"Nos vemos para festejar. ¡Confirma tu lugar!\"",
        ],
      },
      { type: "h2", text: "Facilita la confirmación" },
      {
        type: "p",
        text: "Activa la confirmación de asistencia para saber cuántos van y planear comida y lugar. Comparte el enlace por WhatsApp para que respondan con un toque.",
      },
    ],
  },
  {
    slug: "textos-para-baby-shower",
    title: "Textos para baby shower: frases y ejemplos",
    description:
      "Ejemplos de textos para invitación de baby shower: tiernos, divertidos y cortos. Cópialos y adáptalos a tu celebración.",
    date: "2026-08-10",
    related: ["invitaciones-digitales-baby-shower"],
    body: [
      {
        type: "p",
        text: "El texto de un baby shower debe transmitir la emoción de la llegada del bebé. Aquí tienes ejemplos para distintos estilos.",
      },
      { type: "h2", text: "Textos tiernos" },
      {
        type: "ul",
        items: [
          "\"Un pequeño milagro está por llegar. Acompáñanos a celebrarlo.\"",
          "\"Con mucha ilusión esperamos a nuestro bebé. Ven a festejar con nosotros.\"",
        ],
      },
      { type: "h2", text: "Textos divertidos" },
      {
        type: "ul",
        items: [
          "\"¡Se busca gente feliz para celebrar la llegada del bebé!\"",
          "\"Pañales, risas y mucho amor. Te esperamos en el baby shower.\"",
        ],
      },
      { type: "h2", text: "Textos cortos" },
      {
        type: "ul",
        items: [
          "\"Nuestro bebé viene en camino. ¡Celébralo con nosotros!\"",
          "\"Baby shower en puerta. Tu presencia es el mejor regalo.\"",
        ],
      },
      { type: "h2", text: "No olvides los datos" },
      {
        type: "p",
        text: "Además del texto, incluye la fecha, la hora, el lugar y, si aplica, la mesa de regalos. Activa la confirmación de asistencia para organizar la reunión sin sorpresas.",
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
