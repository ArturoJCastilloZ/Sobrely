/**
 * Estilo de cada plantilla, para el filtro del catálogo (T14).
 *
 * Es una dimensión TRANSVERSAL a propósito: cada estilo aparece en varios tipos
 * de evento (ver la prueba), así que cruzar «Boda + Natural» o «Cumpleaños +
 * Moderno» da resultados. La cabecera de `marketplace.ts` explica por qué los
 * datos que ya existían (`themePack`, arte de fondo) no servían: cada uno vive
 * dentro de UN solo tipo de evento.
 *
 * Etiquetado a mano, revisando la vista previa de las 65 junto con su paleta,
 * tipografía y nombre (24 oct 2026). No sale de un campo de la base: una
 * plantilla nueva necesita su entrada aquí, y una prueba falla si no la tiene.
 * Se guarda por slug en el código y no en una columna para no tocar producción
 * por una etiqueta de catálogo.
 */
export const ESTILOS = [
  { clave: "elegante", etiqueta: "Elegante" },
  { clave: "romantico", etiqueta: "Romántico" },
  { clave: "natural", etiqueta: "Natural" },
  { clave: "moderno", etiqueta: "Moderno" },
  { clave: "divertido", etiqueta: "Divertido" },
] as const;

export type EstiloClave = (typeof ESTILOS)[number]["clave"];

const E: EstiloClave = "elegante";
const R: EstiloClave = "romantico";
const N: EstiloClave = "natural";
const M: EstiloClave = "moderno";
const D: EstiloClave = "divertido";

export const ESTILO_POR_SLUG: Readonly<Record<string, EstiloClave>> = {
  // Baby shower
  "baby-nube-de-algodon": N,
  "baby-nubes-acuarela": N,
  "baby-punto-y-flor": N,
  "baby-shower": D,
  "baby-shower-animalitos": D,
  "baby-shower-completo": D,
  "baby-shower-con-video": D,
  "baby-shower-mesa-regalos": D,
  "baby-shower-neutro": N,
  "baby-shower-nubes": D,
  "baby-shower-revelacion": D,
  "baby-shower-salvia": N,
  "baby-shower-sencillo": M,
  // Bautizo, comunión, graduación, revelación
  "bautizo-cera-blanca": E,
  "comunion-cinta": E,
  "graduacion-diploma": M,
  "revelacion-coral": D,
  "revelacion-dos-sobres": R,
  // Boda
  "boda-acuarela-eucalipto": N,
  "boda-botanica": N,
  "boda-carta-romantica": R,
  "boda-cinematografica": E,
  "boda-de-lujo": E,
  "boda-destino": N,
  "boda-elegante": E,
  "boda-en-la-playa": N,
  "boda-jardin": N,
  "boda-jardin-partido": N,
  "boda-marco-nuestro": E,
  "boda-minimalista": M,
  "boda-papel-y-lino": E,
  "boda-terracota": N,
  // Corporativo
  "corporativo-cena-fin-de-ano": E,
  "corporativo-completo": M,
  "corporativo-con-sede": M,
  "corporativo-conferencia-agenda": M,
  "corporativo-congreso-video": M,
  "corporativo-junta-resultados": M,
  "corporativo-lanzamiento": M,
  "corporativo-reticula": M,
  "corporativo-sencillo": M,
  "corporativo-taller": M,
  "evento-corporativo": M,
  // Cumpleaños
  "cumpleanos-adulto": M,
  "cumpleanos-fiesta-mexicana": D,
  "cumpleanos-arco": D,
  "cumpleanos-con-video": M,
  "cumpleanos-dinosaurios": D,
  "cumpleanos-futbol": D,
  "cumpleanos-galaxia": D,
  "cumpleanos-infantil": D,
  "cumpleanos-kawaii": D,
  "cumpleanos-moderno": M,
  "cumpleanos-papel-picado": D,
  "cumpleanos-sencillo": M,
  "cumpleanos-superheroes": D,
  // XV años
  "xv-acuarela-peonias": R,
  "xv-anos": R,
  "xv-clasicos-elegantes": E,
  "xv-con-salon": E,
  "xv-con-sesion": E,
  "xv-con-video": M,
  "xv-corona": E,
  "xv-glam-moderno": M,
  "xv-manuscrita": R,
  "xv-noche-estelar": E,
  "xv-noche-estrellada": E,
  "xv-produccion-completa": E,
  "xv-seda": R,
  "xv-sencillos": R,
};

/** Estilo de una plantilla, o `null` si todavía no se etiquetó. */
export function estiloDe(slug: string): EstiloClave | null {
  return ESTILO_POR_SLUG[slug] ?? null;
}

export function etiquetaDeEstilo(clave: EstiloClave): string {
  return ESTILOS.find((e) => e.clave === clave)?.etiqueta ?? clave;
}
