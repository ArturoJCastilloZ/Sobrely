import { HERO_BLOQUES, HERO_BLOQUE_LABELS, type ModuleType } from "@/lib/modules/types";

/**
 * Contrato de BLOQUES por tipo de modulo.
 *
 * Que es un bloque: un hijo directo de `Section` (o, en la portada, uno de sus
 * tres textos con nombre). NO es «un texto»: `rsvp` mete titulo y descripcion
 * en un mismo encabezado, y `dresscode` tiene un bloque que son dos figuras de
 * SVG. La tabla describe lo que el renderer emite de verdad, no lo que seria
 * bonito que emitiera.
 *
 * ── Lo que se MIDIO antes de escribir esta tabla, y hay que respetar ──
 *
 * 1. Los huecos de CONTENIDO conservan su slot. `welcome` sin mensaje sigue
 *    emitiendo su segundo bloque, vacio. Asi que el indice de un bloque no se
 *    corre porque el usuario borre un texto.
 *
 * 2. Los hijos CONDICIONALES DE COLA si desaparecen. `gifts` emite 3 bloques
 *    con enlaces y 2 sin ellos (`links.length > 0 && ...`).
 *
 * De 1 + 2 sale el contrato: **la secuencia renderizada es siempre un PREFIJO
 * de esta tabla.** Nunca se reordena ni se salta una posicion, solo se corta
 * por el final. Por eso etiquetar por indice es seguro, y por eso la prueba
 * `bloques.test.ts` afirma «prefijo», no «longitud exacta».
 *
 * ⚠️ Anclar por indice es fragil por naturaleza: si un renderer cambia el ORDEN
 * de sus hijos, los `textOffsets` ya guardados se aplicarian al bloque
 * equivocado, en silencio y sobre invitaciones de clientes. La prueba convierte
 * ese riesgo en un rojo. Si la pones roja, NO es la prueba la que hay que
 * ajustar: es que acabas de mover datos guardados de sitio.
 */
export type Bloque = {
  /** Coincide EXACTAMENTE con el atributo `data-bloque` del DOM. */
  id: string;
  /** Para el nombre accesible y, en la Fase 5, el arbol de capas. */
  etiqueta: string;
  /**
   * La clave de `config` que alimenta este bloque, cuando es UNA sola y esta
   * verificada. `null` cuando el bloque es compuesto (el encabezado de `rsvp`),
   * no es texto (las figuras de vestimenta, la galeria) o no se ha comprobado.
   *
   * La Fase 3 —edicion directa de texto— solo puede tocar los que lo tienen.
   * Se deja en `null` antes que adivinar: escribir en el campo equivocado
   * corrompe la invitacion de un cliente.
   */
  campo: string | null;
};

const b = (id: string, etiqueta: string, campo: string | null = null): Bloque => ({
  id,
  etiqueta,
  campo,
});

/** Por INDICE. El orden es el de los hijos de `Section`, medido del render. */
const POR_INDICE: Record<Exclude<ModuleType, "hero">, Bloque[]> = {
  welcome: [b("0", "Título", "title"), b("1", "Mensaje", "message")],
  countdown: [b("0", "Título", "title"), b("1", "Cuenta atrás")],
  map: [
    b("0", "Título", "title"),
    b("1", "Lugar", "venueName"),
    b("2", "Dirección", "address"),
  ],
  gallery: [b("0", "Título", "title"), b("1", "Fotos")],
  video: [b("0", "Título", "title"), b("1", "Video")],
  itinerary: [b("0", "Título", "title"), b("1", "Programa")],
  dresscode: [
    b("0", "Título", "title"),
    b("1", "Nivel"),
    b("2", "Figuras"),
    b("3", "Notas", "notes"),
  ],
  gifts: [
    b("0", "Título", "title"),
    b("1", "Descripción", "description"),
    b("2", "Enlaces"),
  ],
  music: [b("0", "Título", "title"), b("1", "Enlace")],
  // El primer bloque de `rsvp` es COMPUESTO: encabeza titulo y descripcion en
  // un mismo hijo. Por eso `campo` es null — no hay un campo unico que tocar.
  rsvp: [b("0", "Encabezado"), b("1", "Formulario")],
  signatures: [
    b("0", "Título", "title"),
    b("1", "Descripción", "description"),
    b("2", "Formulario"),
    b("3", "Botón", "buttonLabel"),
  ],
};

/** La portada va por NOMBRE, no por indice: su renderer los etiqueta asi. */
const HERO: Bloque[] = HERO_BLOQUES.map((k) =>
  b(k, HERO_BLOQUE_LABELS[k], k === "cta" ? "ctaLabel" : k),
);

/**
 * Los bloques que un tipo de modulo PUEDE emitir, en orden.
 *
 * Lo que se renderice sera este arreglo o un prefijo suyo — ver la nota de
 * arriba. Quien lo use debe tolerar que el DOM traiga menos.
 */
export function bloquesDe(tipo: ModuleType): Bloque[] {
  return tipo === "hero" ? HERO : POR_INDICE[tipo];
}

/** Busca un bloque por su `data-bloque`. `null` si el tipo no lo declara. */
export function bloquePorId(tipo: ModuleType, id: string): Bloque | null {
  return bloquesDe(tipo).find((x) => x.id === id) ?? null;
}
