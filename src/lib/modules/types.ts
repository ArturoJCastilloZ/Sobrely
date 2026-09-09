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
// ---- Movimiento libre del texto ------------------------------------------

/**
 * Desplazamiento de un bloque respecto de su posición NATURAL, en fracciones
 * del contenedor.
 *
 * Por qué desplazamientos y no posiciones absolutas — es la decisión que
 * gobierna todo esto:
 *
 * 1. **La altura no se colapsa.** Si los bloques salieran del flujo, la caja de
 *    la sección mediría 0 y habría que declararle una altura fija. Eso es lo que
 *    hace Invitio —secciones de 900 px— o sea **renunciar al responsive**, y es
 *    justo lo que la PoC de canvas dejó escrito que NO había que copiar.
 * 2. **Mantiene el diseño**, que es el requisito: el preset elegido sigue
 *    mandando y el usuario mueve piezas encima. El interruptor es un
 *    modificador, no otro diseño.
 * 3. **Un solo modelo para los 12 módulos.** Una sección no tiene foto de fondo
 *    contra la que colocar; sí tiene una posición natural desde la que empujar.
 *
 * El rango es −1..1, o sea hasta un ancho/alto entero del contenedor en cada
 * dirección: alcanza cualquier punto de la caja sin permitir mandar un texto a
 * la nada. `limitarDesplazamiento` lo aprieta más, contra el tamaño real del
 * bloque.
 */
/**
 * Una fracción de desplazamiento: se RECORTA, nunca se rechaza.
 *
 * Es deliberado y la prueba lo cazó: `min`/`max` de zod **rechazan**, y
 * `parseConfig` descarta la config ENTERA del módulo cuando algo no valida. O
 * sea que un `dx: 9` escrito a mano —o guardado por una versión futura con otro
 * rango— habría borrado el título, el subtítulo y la foto de la portada, no
 * sólo el desplazamiento. Recortar degrada; rechazar destruye.
 */
const fraccionDeDesplazamiento = z
  .number()
  .catch(0)
  .transform((v) => Math.min(1, Math.max(-1, v)))
  .default(0);

export const desplazamientoSchema = z
  .object({
    dx: fraccionDeDesplazamiento,
    dy: fraccionDeDesplazamiento,
  })
  // Con defecto propio: así un `textOffsets` parcial —sólo el título— no tumba
  // el objeto por los bloques que faltan.
  .default({ dx: 0, dy: 0 });
export type Desplazamiento = z.infer<typeof desplazamientoSchema>;

const SIN_DESPLAZAR = { dx: 0, dy: 0 } as const;

/**
 * Deja el CENTRO del bloque dentro del marco.
 *
 * ⚠️ Todo va en la MISMA unidad: fracciones del ANCHO de la sección, los dos
 * ejes. Es la unidad del render (`cqw`), y se eligió midiéndola:
 *
 * - `top` en `%` con `position: relative` da **0** cuando la caja tiene
 *   `min-height` en vez de altura definida — comprobado en el navegador. Así
 *   que el eje vertical no puede ir en porcentaje de la altura.
 * - `cqw` con `container-type: inline-size` **en la propia sección** sí
 *   resuelve, contra su ancho, y **sin sacar el contenido del flujo**: la altura
 *   no colapsa y el diseño elegido se mantiene. Y al no depender de ningún
 *   ancestro, mide igual en el editor móvil —que no declara `@container/inv`—
 *   que en producción.
 *
 * Por eso hace falta `extension`: en unidades de ancho, el eje horizontal llega
 * a 1 pero el vertical llega a `alto/ancho` de la sección, que no es 1.
 *
 * Ya no recibe el tamaño del bloque: con el centro como límite, el tamaño no
 * entra en la cuenta. El parámetro estaba y se quitó al cambiar el criterio,
 * en vez de dejarlo muerto en la firma.
 */
export function limitarDesplazamiento(
  d: Desplazamiento,
  centroNatural: { x: number; y: number },
  extension: { ancho: number; alto: number } = { ancho: 1, alto: 1 },
): Desplazamiento {
  // Lo que se mantiene dentro del marco es el CENTRO del bloque, no el bloque
  // ENTERO. La primera versión exigía que cupiera entero y era la causa del
  // segundo «sigue sin moverse»: `h2`, `p` y el `div` del CTA son elementos de
  // BLOQUE, su caja ocupa casi todo el ancho del contenedor, y un bloque de
  // ancho casi completo **no tiene a dónde ir**. Medido en la invitación del
  // dev: el título ocupaba 325 px de 418, o sea 46 px de recorrido; se
  // arrastraban 90 y se movía 41. Con un título que llena el ancho, el
  // recorrido era EXACTAMENTE cero.
  //
  // Con el centro dentro, el recorrido es el ancho entero de la sección y el
  // texto puede empujarse casi fuera —como en cualquier editor de verdad— sin
  // poder perderse nunca: al menos su mitad queda visible.
  const eje = (valor: number, centro: number, ext: number) => {
    if (!Number.isFinite(valor)) return 0;
    if (!Number.isFinite(ext) || ext <= 0) return 0;
    return Math.min(ext - centro, Math.max(-centro, valor));
  };
  return {
    dx: eje(d.dx, centroNatural.x, extension.ancho),
    dy: eje(d.dy, centroNatural.y, extension.alto),
  };
}

/**
 * Pares de bloques que se PISAN, para poder avisar.
 *
 * Se avisa y no se impide: solapar puede ser deliberado —un título sobre una
 * línea fina— y la invitación es del usuario. Pero un solape accidental deja
 * texto ilegible y en el lienzo pequeño del editor no siempre se ve. Es la
 * misma postura que el aviso de la manuscrita en el cuerpo del texto.
 *
 * Se pidió mover cada texto POR SEPARADO, y esta guarda es la contrapartida:
 * con los tres bloques sueltos, solaparse deja de ser imposible.
 */
export function paresSolapados(
  cajas: { id: string; x: number; y: number; w: number; h: number }[],
): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const a = cajas[i];
      const b = cajas[j];
      // Rectángulos centrados en x/y: se pisan si se solapan en LOS DOS ejes.
      if (
        Math.abs(a.x - b.x) * 2 < a.w + b.w &&
        Math.abs(a.y - b.y) * 2 < a.h + b.h
      ) {
        out.push([a.id, b.id]);
      }
    }
  }
  return out;
}

const layoutShape = {
  align: z.enum(SECTION_ALIGNS).default("center"),
  bleed: z.enum(SECTION_BLEEDS).default("contained"),
  // Marco de papelería (Fase 11 · P5). Es lo que sostiene la familia F4 del
  // research —la que NO gasta ninguna licencia— y la referencia es Greenvelope:
  // premium por oficio gráfico, no por fotografía. `none` no emite nada.
  frame: z.enum(SECTION_FRAMES).default("none"),
  /**
   * Movimiento libre del texto, el MISMO interruptor que la portada.
   *
   * Vive en `layoutShape`, así que lo heredan los 11 módulos que usan
   * `objetoConLayout` sin tocar sus esquemas uno por uno — el patrón de emitir
   * DESPUÉS y que el defecto sea vacío.
   *
   * Aquí los bloques se identifican por ÍNDICE y no por nombre, porque cada
   * módulo tiene un contenido distinto (bienvenida trae título y mensaje;
   * cuenta atrás sólo título; RSVP título y descripción...). El envoltorio
   * `Section` es el único sitio que los ve a todos, y ahí sólo tiene los hijos
   * en orden.
   *
   * ⚠️ Eso ancla a la POSICIÓN, no a la superficie, y esta base de código ya ha
   * pagado ese error. La contrapartida es una prueba que fija el número de
   * bloques de cada módulo: si un renderer cambia su orden o su cuenta, la
   * suite se pone roja en vez de mover los desplazamientos guardados en
   * silencio.
   */
  freeMove: z.boolean().default(false),
  textOffsets: z.array(desplazamientoSchema).max(6).default([]),
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
  // Entró con la 3.ª tanda de fotos: `boda-anillos-papel` es 1600x2843 (0.563)
  // y ninguna de las otras la calzaba sin recortar más del 15 %.
  "9/16",
  // `1/2` calza las dos piezas de 840x1800 de la 1.ª investigación (0.467) al
  // 6.6 %. Se añadió en vez de subir el umbral del pre-vuelo para que pasaran,
  // que era la salida fácil.
  "1/2",
] as const;
export type MediaRatio = (typeof MEDIA_RATIOS)[number];

/**
 * La proporción del catálogo más cercana a una imagen real, con el recorte que
 * implica.
 *
 * Existe porque exponer `variant` en el editor sin esto reintroduce, para el
 * usuario, el defecto que la Fase 11 pagó dos veces: `split` y `editorial`
 * pintan la foto dentro de una FIGURA con `object-fit: cover`, y si la
 * proporción declarada no es la de la fuente **recorta en silencio y no da
 * error**. Con `imageRatio: "auto"` la figura usa 3/4 o 4/3 HARDCODEADOS, así
 * que un usuario que sube una panorámica y elige «foto a la mitad» perdería la
 * mitad de su foto sin que nada se lo diga.
 *
 * Devuelve también el recorte para poder DECIRLO en la interfaz en vez de
 * dejarlo pasar. El mismo umbral del 15 % que usa el pre-vuelo del seed.
 */
export function proporcionMasCercana(
  ancho: number,
  alto: number,
): { ratio: MediaRatio; recorte: number } | null {
  if (!Number.isFinite(ancho) || !Number.isFinite(alto)) return null;
  if (ancho <= 0 || alto <= 0) return null;
  const fuente = ancho / alto;
  let mejor: { ratio: MediaRatio; recorte: number } | null = null;
  for (const r of MEDIA_RATIOS) {
    const [a, b] = r.split("/").map(Number);
    const caja = a / b;
    // Los DOS ejes: una caja más ancha que la fuente recorta igual, por arriba
    // y abajo. Es la mitad que la primera versión del pre-vuelo no miraba.
    const recorte = caja < fuente ? 1 - caja / fuente : 1 - fuente / caja;
    if (!mejor || recorte < mejor.recorte) mejor = { ratio: r, recorte };
  }
  return mejor;
}

/**
 * El parche que el editor escribe al cambiar la composición de la portada.
 *
 * Vive aquí y no dentro del componente para que sea COMPROBABLE: es la única
 * lógica real del selector, y el proyecto no tiene entorno de DOM para probar
 * componentes. Sacarla es más barato que traerse `testing-library` y decidir
 * dependencias de paso.
 *
 * Lo que decide, y por qué importa:
 *
 * - `split` y `editorial` meten la foto en una FIGURA con `object-fit: cover`.
 *   Si `imageRatio` queda en `auto`, el renderer usa 3/4 o 4/3 HARDCODEADOS y
 *   recorta la foto del usuario en silencio. Así que al entrar en esas
 *   variantes se fija la proporción de la FUENTE MEDIDA.
 * - Sin medida no se toca `imageRatio`: se prefiere la conducta de siempre a
 *   inventar un encuadre.
 * - Al salir a una variante sin figura se devuelve a `auto`, que es el valor
 *   retro-compatible y no mueve nada guardado.
 */
export function parcheDeComposicionDePortada(
  variant: HeroVariant,
  medida: { w: number; h: number } | null,
): { variant: HeroVariant; imageRatio?: "auto" | MediaRatio } {
  const enFigura = variant === "split" || variant === "editorial";
  if (!enFigura) return { variant, imageRatio: "auto" };
  const r = medida ? proporcionMasCercana(medida.w, medida.h) : null;
  return r ? { variant, imageRatio: r.ratio } : { variant };
}

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

/**
 * Rótulos de cara al usuario, no nombres de familia.
 *
 * «Partida» y «Editorial» eran jerga del research: describen la familia, no lo
 * que el usuario obtiene. Y el control del panel se llama «Diseño de la
 * portada», NO «Alineación del texto»: el bloque de sección ya tiene uno
 * llamado «Alineación» (Izquierda/Centrado/Derecha) y éste mueve la FOTO además
 * del texto. Dos controles con nombres casi iguales haciendo cosas distintas es
 * un defecto de etiquetado que acaba en soporte.
 */
export const HERO_VARIANT_LABELS: Record<HeroVariant, string> = {
  centered: "Texto centrado sobre la foto",
  offset: "Texto abajo a un lado",
  split: "Foto a un lado, texto al otro",
  editorial: "Texto arriba, foto abajo",
  plain: "Sólo texto, sin foto",
};

/**
 * El `transform` de un bloque desplazado, o nada.
 *
 * Vive aquí y no en el componente para poder probarla: el proyecto corre
 * vitest sin entorno de DOM. Apagado o sin desplazamiento devuelve `{}`, así
 * que el render de una invitación que no usa esto **no cambia ni un píxel** —
 * es lo que hace que la función sea aditiva y no toque nada guardado.
 *
 * `cqw` en los DOS ejes, o sea fracciones del ANCHO de la sección. Medido en
 * el navegador: `top` en `%` da 0 con `min-height`, y `cqw` sobre la propia
 * sección resuelve sin sacar el contenido del flujo. Ver
 * `limitarDesplazamiento`.
 */
export function estiloDeDesplazamiento(
  activo: boolean,
  d: Desplazamiento | undefined,
): { transform?: string; touchAction?: "none" } {
  if (!activo) return {};
  // `touchAction: none` va en el BLOQUE y sólo con el interruptor encendido:
  // en un móvil, sin esto el navegador se lleva el gesto como scroll a media
  // colocación. Ponerlo en el contenedor entero habría matado el scroll de la
  // vista previa; en el bloque, tocar el texto arrastra y tocar al lado sigue
  // scrolleando.
  //
  // Se emite AUNQUE el desplazamiento sea cero: un bloque sin mover también
  // tiene que poder agarrarse.
  const base = { touchAction: "none" as const };
  if (!d || (d.dx === 0 && d.dy === 0)) return base;
  return { ...base, transform: `translate(${d.dx * 100}cqw, ${d.dy * 100}cqw)` };
}

/**
 * El patch que escribe un arrastre.
 *
 * Las dos formas de guardar desplazamientos conviven a propósito y esta función
 * es la única que sabe de las dos: la portada los guarda por NOMBRE —tiene tres
 * bloques fijos y nombrarlos es más robusto que su orden— y las secciones por
 * ÍNDICE, porque cada módulo tiene un contenido distinto y `Section` sólo ve
 * hijos en orden.
 *
 * Devuelve `null` si el bloque no encaja con la forma esperada, en vez de
 * escribir en un sitio inventado: un `data-bloque` que no reconoce no debe
 * corromper los desplazamientos que ya hay.
 */
export function parcheDeDesplazamiento(
  esPortada: boolean,
  actual: unknown,
  bloque: string,
  d: Desplazamiento,
): { textOffsets: unknown } | null {
  if (esPortada) {
    if (!(HERO_BLOQUES as readonly string[]).includes(bloque)) return null;
    const base =
      actual && typeof actual === "object" && !Array.isArray(actual)
        ? (actual as Record<string, Desplazamiento>)
        : {};
    return { textOffsets: { ...base, [bloque]: d } };
  }

  // `/^\d+$/` y no `Number(...)`: `Number("")` es **0**, así que un
  // `data-bloque` vacío se colaba como índice 0 y escribía en el primer bloque.
  // Lo cazó la prueba.
  if (!/^\d+$/.test(bloque)) return null;
  const i = Number(bloque);
  if (i > 5) return null;
  const base = Array.isArray(actual) ? [...(actual as Desplazamiento[])] : [];
  // Los huecos se rellenan sin desplazar: un array disperso no sobrevive a
  // JSON y dejaría `null` donde el esquema espera un objeto.
  while (base.length <= i) base.push({ dx: 0, dy: 0 });
  base[i] = d;
  return { textOffsets: base };
}

/**
 * ¿Se MUESTRA el interruptor de movimiento libre?
 *
 * Encendido. Se apagó un rato el 2026-09-08 porque el dev reportaba que el
 * arrastre no movía nada y yo no conseguía reproducirlo, y un control muerto es
 * peor que ninguno. Resultó que **sí funciona**: el dev lo confirmó al ver el
 * título y el subtítulo desplazados en su propio editor.
 *
 * Lo que falló fueron MIS sondas, y queda escrito porque es un patrón:
 *   1. La primera «verificación» fue una página HTML hecha a mano que imitaba
 *      el árbol — no tenía el `px-6` real ni el ancho de bloque de un `h2`.
 *   2. La última leía `el.style.transform` INMEDIATAMENTE después de despachar
 *      los eventos, y el estado de React se actualiza de forma ASÍNCRONA:
 *      leía el valor de antes. Reportó «no se movió» mientras el texto se
 *      movía.
 *
 * La bandera se queda para poder esconderlo rápido, pero NO para tapar un
 * defecto sin diagnosticar: eso fue lo que costó un turno.
 */
export const MOSTRAR_MOVIMIENTO_LIBRE = true;

/** Los tres textos que la portada ya tiene. No se puede añadir un cuarto. */
export const HERO_BLOQUES = ["title", "subtitle", "cta"] as const;
export type HeroBloque = (typeof HERO_BLOQUES)[number];

export const HERO_BLOQUE_LABELS: Record<HeroBloque, string> = {
  title: "Título",
  subtitle: "Subtítulo",
  cta: "Etiqueta",
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
  /**
   * Proporción de la figura en `split` y `editorial` (Fase 11 · P3).
   *
   * Estaba HARDCODEADA —3/4 en split, 4/3 en editorial— y eso recortaba a
   * ciegas, igual que pasó con el slot de media: medido, `boda-jardin-partido`
   * perdía el **50 %** del ancho de su fotografía y `cumpleanos-arco` el 45 %,
   * las dos ya en producción y las dos aprobadas en la puntuación sin que se
   * notara, porque el sujeto llena el encuadre.
   *
   * `auto` conserva EXACTAMENTE el valor por variante de antes, así que ninguna
   * invitación guardada se mueve.
   */
  imageRatio: z.enum(["auto", ...MEDIA_RATIOS]).default("auto"),
  /**
   * Interruptor del movimiento libre. Va SEPARADO de `variant` a propósito:
   * el diseño elegido se mantiene y esto sólo permite empujar los textos
   * encima. Meterlo como una sexta variante habría obligado a elegir entre
   * diseño y libertad, y son cosas distintas.
   */
  freeMove: z.boolean().default(false),
  /**
   * Los desplazamientos se guardan SIEMPRE, aunque el interruptor esté
   * apagado: así apagarlo y volverlo a encender no pierde la colocación. Y
   * apagado no afecta al render, así que una invitación vieja se ve igual.
   */
  textOffsets: z
    .object({
      title: desplazamientoSchema,
      subtitle: desplazamientoSchema,
      cta: desplazamientoSchema,
    })
    // Defecto explícito y completo: esta versión de zod pide el objeto de
    // SALIDA entero, el mismo patrón que `media` y `backgroundImage`.
    .default({
      title: SIN_DESPLAZAR,
      subtitle: SIN_DESPLAZAR,
      cta: SIN_DESPLAZAR,
    }),
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
 * ¿El módulo lleva las perillas de composición de sección?
 *
 * Se DERIVA del esquema —`objetoConLayout` es lo que las añade— en vez de
 * mantener una lista a mano. Así un módulo nuevo que use `objetoConLayout`
 * hereda su UI sin que nadie tenga que acordarse, y uno que no las tenga
 * (`hero`, que compone con `variant` y no con `align`) no la muestra.
 *
 * Es el patrón que ya salvó un cambio transversal en esta base: emitir DESPUÉS
 * y que el defecto sea vacío, en vez de tocar N sitios.
 */
export function tieneComposicionDeSeccion(tipo: ModuleType): boolean {
  const esquema = moduleConfigSchemas[tipo];
  const shape = (esquema as unknown as { shape?: Record<string, unknown> }).shape;
  return Boolean(shape && "align" in shape && "bleed" in shape && "frame" in shape);
}

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
