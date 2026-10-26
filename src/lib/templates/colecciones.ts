import { ESTILOS, type EstiloClave } from "@/lib/templates/estilos";

/**
 * Colecciones por estilo (fase 3 de la propuesta visual): una página indexable
 * por cada estilo del catálogo, en `/plantillas/estilo/<clave>`.
 *
 * El texto es ÚNICO por colección a propósito: cinco páginas con la misma
 * plantilla de frase y solo el nombre cambiado serían contenido duplicado, justo
 * lo que `05` advertía de esta alternativa. No lleva cifras de plantillas ni de
 * precio: esas salen del catálogo en vivo y un número escrito aquí se
 * desactualizaría con la primera plantilla nueva.
 */
export type Coleccion = {
  clave: EstiloClave;
  /** Segmento de la URL; coincide con la clave del estilo. */
  slug: EstiloClave;
  h1: string;
  /** Sin el sufijo «· Sobrely»: lo pone el template del layout raíz. */
  metaTitulo: string;
  metaDescripcion: string;
  intro: string;
  cuandoElegirla: string;
};

const TEXTO: Record<EstiloClave, Omit<Coleccion, "clave" | "slug">> = {
  elegante: {
    h1: "Invitaciones digitales elegantes",
    metaTitulo: "Invitaciones digitales elegantes para bodas",
    metaDescripcion:
      "Plantillas de invitaciones digitales elegantes: tipografía clásica y paletas sobrias para bodas, XV años, bautizos y cenas de gala. Diseñar es gratis.",
    intro:
      "Tipografía clásica, paletas sobrias y mucho aire alrededor del texto. Son plantillas que le dan peso a la portada y piden pocas palabras, para que el nombre y la fecha sean lo primero que se lea.",
    cuandoElegirla:
      "Elígelas si tu evento es formal o de salón: una boda por la iglesia, unos XV años con vals, un bautizo o una cena de fin de año de la empresa.",
  },
  romantico: {
    h1: "Invitaciones digitales románticas",
    metaTitulo: "Invitaciones digitales románticas para XV años",
    metaDescripcion:
      "Invitaciones digitales con aire romántico: letra manuscrita, tonos suaves y detalles delicados para XV años, bodas y revelaciones. Diseñar es gratis.",
    intro:
      "Letra manuscrita, tonos suaves y detalles delicados. Se sienten más como una carta escrita a mano que como un cartel, y se leen bien en el teléfono porque el texto manda sobre la decoración.",
    cuandoElegirla:
      "Funcionan cuando quieres que la invitación suene personal: unos XV años íntimos, una boda pequeña o el aviso de que viene un bebé.",
  },
  natural: {
    h1: "Invitaciones digitales naturales",
    metaTitulo: "Invitaciones digitales naturales de jardín y playa",
    metaDescripcion:
      "Plantillas de invitaciones digitales con motivos de jardín, playa y botánica, en tonos tierra y verdes. Para bodas y baby showers. Diseñar es gratis.",
    intro:
      "Hojas, flores, tonos tierra y verdes apagados. Reflejan eventos al aire libre y se combinan bien con fotografías de campo, de playa o de jardín.",
    cuandoElegirla:
      "Son buena opción para una boda en jardín, hacienda o playa, y para baby showers tranquilos donde buscas colores neutros en lugar de rosa o azul.",
  },
  moderno: {
    h1: "Invitaciones digitales modernas",
    metaTitulo: "Invitaciones digitales modernas y minimalistas",
    metaDescripcion:
      "Plantillas de invitaciones digitales modernas: diseño limpio, tipografía sin adornos y datos claros. Para eventos corporativos, cumpleaños, XV años y más.",
    intro:
      "Diseño limpio, tipografía sin adornos y la información ordenada por bloques. Son las que más espacio dejan a los datos prácticos: programa, sede, horarios y confirmación.",
    cuandoElegirla:
      "Elígelas para un evento de empresa, un congreso, una graduación o un cumpleaños adulto, o cuando prefieres una invitación sencilla antes que una decorada.",
  },
  divertido: {
    h1: "Invitaciones digitales divertidas",
    metaTitulo: "Invitaciones digitales divertidas para cumpleaños",
    metaDescripcion:
      "Invitaciones digitales con color e ilustraciones para cumpleaños infantiles, baby showers y revelaciones de género. Diseñar es gratis; pagas al publicar.",
    intro:
      "Colores vivos, ilustraciones y temas pensados para festejos con niños: animalitos, dinosaurios, superhéroes, nubes. Se ven alegres desde la portada y animan a confirmar.",
    cuandoElegirla:
      "Son para cumpleaños infantiles, baby showers y revelaciones de género, donde el tono ligero es parte de la fiesta.",
  },
};

export const COLECCIONES: readonly Coleccion[] = ESTILOS.map((e) => ({
  clave: e.clave,
  slug: e.clave,
  ...TEXTO[e.clave],
}));

export function coleccionDe(slug: string): Coleccion | undefined {
  return COLECCIONES.find((c) => c.slug === slug);
}

export function hrefColeccion(clave: EstiloClave): string {
  return `/plantillas/estilo/${clave}`;
}
