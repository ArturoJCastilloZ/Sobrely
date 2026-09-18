import {
  MODULE_TYPES,
  parseConfig,
  type ModuleType,
} from "@/lib/modules/types";

/**
 * El arte que el SLOT DE MEDIA de un modulo pone en la pagina.
 *
 * Existe porque el gate de `custom_art` —«Arte propio (fondo e imagenes)»— solo
 * miraba TRES campos, y los tres del `theme`: `backgroundImage`, `stickers` y
 * `decoration.imageUrl`. No miraba la `config` de ningun modulo.
 *
 * Mientras el editor no expusiera el slot de media eso no costaba dinero: las
 * otras dos superficies de subida que hay hoy (`gallery.images` y
 * `dresscode.imageUrl`) viven en modulos de Celebracion, y Celebracion YA trae
 * `custom_art`, asi que el gate de MODULO las cubre de rebote. Pero el slot de
 * media lo heredan los ONCE, y tres de ellos —`welcome`, `countdown` y
 * `rsvp`— son del plan Free. Exponerlo sin esto regala la capacidad que
 * `custom_art` vende.
 *
 * ── Por que se lee por el ESQUEMA y no del jsonb crudo ────────────────
 *
 * Se cobra por lo que se RENDERIZA. El renderer lee la config con
 * `parseConfig`, asi que el gate usa la misma lente: si un valor no valida, el
 * renderer no lo pinta y aqui tampoco cuenta. Leer el jsonb crudo cobraria por
 * una imagen que el visitante no llega a ver.
 *
 * ⚠️ Medido al escribir esto: `parseConfig` NO descarta la config entera cuando
 * algo no valida —tiene un camino lento que recupera campo a campo sobre los
 * defaults—. El bloque RETOMAR del plan afirma lo contrario; queda corregido
 * ahi. Para este gate da igual el camino: en los dos sale la `media.url` que el
 * renderer va a usar.
 *
 * NO devuelve `hero.imageUrl`, `gallery.images` ni `dresscode.imageUrl`. Los
 * dos ultimos ya estan cubiertos por el gate de modulo; el del `hero` es una
 * fuga que YA EXISTE hoy —`hero` es Free y su «Imagen de fondo» no la mira
 * nadie— y cerrarla podria empezar a exigir Celebracion a invitaciones vivas
 * que hoy publican gratis. Es una decision de precio del dev, no de este
 * cambio, y queda anotada como deuda en el plan.
 */
export function urlDelSlotDeMedia(
  tipo: ModuleType,
  rawConfig: unknown,
): string | null {
  // `module_type` es `text` sin CHECK en la base, y la policy `modules_owner_all`
  // deja al dueno insertar por PostgREST sin pasar por `editorModuleSchema`. Con
  // un tipo que el esquema no conoce, `moduleConfigSchemas[tipo]` es `undefined`
  // y `parseConfig` revienta con «Cannot read properties of undefined (reading
  // 'safeParse')» — reproducido, no supuesto.
  //
  // Antes de este gate esa fila daba una NEGATIVA limpia por `planAllowsModule`;
  // sin esta guarda daria un 500 desde la accion de publicar. Se devuelve `null`
  // y el modulo desconocido lo sigue rechazando el gate de modulos, que es a
  // quien le toca.
  if (!(MODULE_TYPES as readonly string[]).includes(tipo)) return null;

  const config = parseConfig(tipo, rawConfig);
  // `!media` es el caso de `hero`, que no lleva `mediaShape` en su esquema.
  //
  // NO se comprueba ademas que sea un objeto: `parseConfig` ya lo normaliza
  // —un `media: "basura"` cae al defecto del esquema— y la guarda de mas
  // resulto ser codigo muerto. Se vio porque el mutante que la quitaba
  // SOBREVIVIA a la suite: no era una prueba floja, era una rama inalcanzable.
  const media = config.media;
  if (!media) return null;
  const url = (media as { url?: unknown }).url;
  if (typeof url !== "string" || !url) return null;
  // `position: "none"` es el defecto y significa que el slot no se pinta: el
  // renderer exige posicion Y url para envolver nada (`conMedia` en
  // `previews.tsx`). Una url guardada con el slot apagado es un borrador que el
  // visitante no ve, y cobrar por ella seria cobrar por lo no renderizado.
  const position = (media as { position?: unknown }).position;
  if (position === "none") return null;
  return url;
}
