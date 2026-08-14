/**
 * Contenido de las landing pages por tipo de evento (SEO).
 *
 * Cada entrada es una página real y única (no un "doorway page"): título,
 * descripción, hero, beneficios y FAQ propios, enfocados a la intención de
 * búsqueda de ese evento. Las rutas son slugs exactos de keyword
 * (`/invitaciones-digitales-<evento>`).
 */

export type EventBenefit = { title: string; body: string };
export type EventFaq = { q: string; a: string };

export type EventLanding = {
  /** Slug de la ruta = keyword exacta. */
  slug: string;
  /** Nombre del evento en minúscula para prosa ("boda"). */
  eventName: string;
  /** <title> absoluto (con keyword). */
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  benefits: EventBenefit[];
  faqs: EventFaq[];
};

export const EVENT_LANDINGS: Record<string, EventLanding> = {
  boda: {
    slug: "invitaciones-digitales-boda",
    eventName: "boda",
    metaTitle: "Invitaciones digitales para boda | Sobrely",
    metaDescription:
      "Crea invitaciones digitales para boda: elegantes, personalizables y con confirmación de asistencia. Comparte por WhatsApp y controla el acceso con QR. Empieza gratis.",
    eyebrow: "Invitaciones digitales para boda",
    h1: "Invitaciones digitales para tu boda",
    intro:
      "Diseña una invitación de boda elegante y a tu estilo: portada, cuenta regresiva, ubicación con mapa, itinerario, galería, código de vestimenta y mesa de regalos. Compártela por un enlace y recibe las confirmaciones de tus invitados en un solo lugar.",
    benefits: [
      {
        title: "Elegante y a tu estilo",
        body: "Colores, tipografías y temáticas que combinan con tu boda, en modo claro u oscuro. Se ve impecable en el celular y en pantalla grande.",
      },
      {
        title: "Confirmación de asistencia",
        body: "Tus invitados confirman en línea y tú ves cuántas personas asistirán, sin llamadas ni listas en papel.",
      },
      {
        title: "Lista de invitados con QR",
        body: "Da a cada invitado su pase con código QR y controla el acceso en la entrada el día del evento.",
      },
    ],
    faqs: [
      {
        q: "¿Cómo hago una invitación digital para boda?",
        a: "Elige un diseño, personaliza los módulos (portada, fecha, ubicación, mesa de regalos), y publica tu invitación. Obtienes un enlace listo para compartir por WhatsApp o redes.",
      },
      {
        q: "¿Puedo saber quién confirmó a mi boda?",
        a: "Sí. Cada confirmación llega a tu panel y ves el total de asistentes. Con la lista de invitados asignas lugares por persona y controlas el acceso con QR.",
      },
      {
        q: "¿Cuánto cuesta una invitación digital de boda?",
        a: "Puedes crearla gratis y pagar una sola vez, por evento, cuando decidas publicarla. No hay suscripción. Revisa los planes en la página de precios.",
      },
    ],
  },
  "xv-anos": {
    slug: "invitaciones-digitales-xv-anos",
    eventName: "XV años",
    metaTitle: "Invitaciones digitales para XV años | Sobrely",
    metaDescription:
      "Invitaciones digitales para XV años originales y personalizables, con cuenta regresiva, música y confirmación de asistencia. Comparte el enlace y controla el acceso con QR.",
    eyebrow: "Invitaciones digitales para XV años",
    h1: "Invitaciones digitales para XV años",
    intro:
      "Celebra los quince con una invitación digital moderna: portada con foto, cuenta regresiva, ubicación, itinerario, código de vestimenta y música. Compártela con un enlace y lleva el control de confirmaciones e invitados.",
    benefits: [
      {
        title: "Diseños originales",
        body: "Temáticas y estilos para unos XV a tu gusto, con animaciones y modo claro u oscuro.",
      },
      {
        title: "Cuenta regresiva y música",
        body: "Genera expectativa con una cuenta regresiva y ambienta la invitación con tu canción.",
      },
      {
        title: "Control de invitados",
        body: "Asigna lugares por invitado, comparte su enlace único y registra su ingreso con QR en la entrada.",
      },
    ],
    faqs: [
      {
        q: "¿Cómo hago una invitación digital de XV años?",
        a: "Escoge un diseño para XV años, personalízalo con tus fotos y datos, y publícalo. Compartes el enlace por WhatsApp y tus invitados confirman en línea.",
      },
      {
        q: "¿Puedo poner música y cuenta regresiva?",
        a: "Sí, la invitación incluye módulos de música y cuenta regresiva, además de galería, itinerario y código de vestimenta.",
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Se crea gratis y solo pagas una vez, por evento, al publicar. Sin cobros recurrentes. Consulta los planes en precios.",
      },
    ],
  },
  cumpleanos: {
    slug: "invitaciones-digitales-cumpleanos",
    eventName: "cumpleaños",
    metaTitle: "Invitaciones digitales para cumpleaños | Sobrely",
    metaDescription:
      "Crea invitaciones digitales para cumpleaños en minutos: personalizables, con confirmación de asistencia y fáciles de compartir por WhatsApp. Empieza gratis.",
    eyebrow: "Invitaciones digitales para cumpleaños",
    h1: "Invitaciones digitales para cumpleaños",
    intro:
      "Organiza tu fiesta con una invitación digital rápida de armar: portada, fecha y hora, ubicación con mapa y confirmación de asistencia. Compártela por un enlace y sabe cuántos van.",
    benefits: [
      {
        title: "Lista en minutos",
        body: "Elige un diseño, escribe los datos y publica. Sin diseñador ni imprenta.",
      },
      {
        title: "Confirmaciones claras",
        body: "Cada invitado confirma con un toque y tú ves el total de asistentes en tu panel.",
      },
      {
        title: "Fácil de compartir",
        body: "Un enlace que abre en cualquier celular, sin que nadie descargue una app.",
      },
    ],
    faqs: [
      {
        q: "¿Cómo hago una invitación digital de cumpleaños?",
        a: "Selecciona un diseño, personaliza fecha, lugar y mensaje, y publica. Compartes el enlace y tus invitados confirman en línea.",
      },
      {
        q: "¿Sirve para cumpleaños infantiles y de adultos?",
        a: "Sí. Ajustas el estilo y los módulos según la fiesta, para niños o adultos.",
      },
      {
        q: "¿Es gratis?",
        a: "Puedes crearla gratis y pagar una sola vez al publicar. Sin suscripción.",
      },
    ],
  },
  "baby-shower": {
    slug: "invitaciones-digitales-baby-shower",
    eventName: "baby shower",
    metaTitle: "Invitaciones digitales para baby shower | Sobrely",
    metaDescription:
      "Invitaciones digitales para baby shower tiernas y personalizables, con confirmación de asistencia y mesa de regalos. Comparte el enlace por WhatsApp. Empieza gratis.",
    eyebrow: "Invitaciones digitales para baby shower",
    h1: "Invitaciones digitales para baby shower",
    intro:
      "Anuncia la llegada del bebé con una invitación digital tierna: portada, fecha y ubicación, mesa de regalos y confirmación de asistencia. Compártela con un enlace y organiza a tus invitadas sin complicaciones.",
    benefits: [
      {
        title: "Diseños tiernos",
        body: "Temáticas suaves y personalizables para tu baby shower, en modo claro u oscuro.",
      },
      {
        title: "Mesa de regalos",
        body: "Incluye tu mesa de regalos o enlace de registro para que tus invitadas sepan qué llevar.",
      },
      {
        title: "Confirmaciones en línea",
        body: "Sabe cuántas personas asistirán con confirmaciones que llegan directo a tu panel.",
      },
    ],
    faqs: [
      {
        q: "¿Cómo hago una invitación digital de baby shower?",
        a: "Elige un diseño, personaliza los datos y la mesa de regalos, y publica. Compartes el enlace por WhatsApp y tus invitadas confirman.",
      },
      {
        q: "¿Puedo incluir mesa de regalos?",
        a: "Sí, hay un módulo de mesa de regalos donde agregas tu registro o instrucciones.",
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Se crea gratis y solo pagas una vez al publicar, por evento. Sin cobros recurrentes.",
      },
    ],
  },
  corporativas: {
    slug: "invitaciones-digitales-corporativas",
    eventName: "evento corporativo",
    metaTitle: "Invitaciones digitales para eventos corporativos | Sobrely",
    metaDescription:
      "Invitaciones digitales para eventos corporativos: profesionales, con registro de asistentes, lista de invitados y control de acceso por QR. Empieza gratis.",
    eyebrow: "Invitaciones digitales para eventos corporativos",
    h1: "Invitaciones digitales para eventos corporativos",
    intro:
      "Convoca a tu evento corporativo con una invitación digital profesional: agenda, ubicación, confirmación de asistencia y lista de invitados con pase QR para el registro en la entrada.",
    benefits: [
      {
        title: "Imagen profesional",
        body: "Personaliza colores y logo para alinear la invitación con tu marca.",
      },
      {
        title: "Registro y control de acceso",
        body: "Asigna un pase con QR a cada asistente y registra su ingreso en la entrada con el escáner.",
      },
      {
        title: "Confirmaciones centralizadas",
        body: "Ve en tiempo real quién confirmó y cuántas personas asistirán, exportable a un archivo.",
      },
    ],
    faqs: [
      {
        q: "¿Sirve para conferencias y eventos de empresa?",
        a: "Sí. Puedes crear una lista de invitados, dar a cada uno su enlace y pase con QR, y controlar el acceso en la entrada.",
      },
      {
        q: "¿Puedo controlar el acceso con QR?",
        a: "Sí. Cada invitado recibe un pase con código QR y desde tu panel escaneas o marcas su ingreso.",
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Se crea gratis y se paga una vez, por evento, al publicar. El límite de invitados depende del plan.",
      },
    ],
  },
};

export const EVENT_LANDING_LIST = Object.values(EVENT_LANDINGS);
