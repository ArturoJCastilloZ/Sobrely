/**
 * Lógica del MARKETPLACE de plantillas (Fase 4, ampliada en T14): filtros por
 * tipo de evento, estilo y precio, y búsqueda. Vive aquí, separada del
 * componente, porque la suite de este repo es `environment: node` y sólo recoge
 * `*.test.ts`: una función pura se puede defender de verdad, un `.tsx` con DOM
 * no se probaría en absoluto.
 *
 * SOBRE EL ESTILO (la Fase 4 decidió NO tener este filtro, y por qué cambió).
 * Medido entonces contra las 50 plantillas activas: las 13 artes de fondo de la
 * `0030` están cada una dentro de UN SOLO tipo de evento (cero solapamiento) y
 * `themePack` solo estaba en 30 de 50, así que un filtro hecho con esos datos
 * daba «Cumpleaños + Botánica = 0 resultados» siempre. La nota decía que el
 * estilo se reabría cuando existiera un dato que cruzara eventos. Ese dato es
 * `estilos.ts`: un etiquetado propio por slug, con cinco estilos que aparecen
 * cada uno en varios tipos de evento (una prueba lo exige).
 *
 * Aun así hay combinaciones sin resultados (p. ej. «Baby shower + Moderno» tiene
 * una sola). Por eso los conteos de cada grupo se calculan con los OTROS filtros
 * activos (`contarFacetas`): una pastilla en 0 se ve y se deshabilita en vez de
 * llevar a una rejilla vacía.
 */

import { ESTILOS, type EstiloClave } from "@/lib/templates/estilos";

/**
 * Lo que cuesta PUBLICAR la plantilla tal como viene (ver
 * `precioParaPublicarPlantilla`). Solo lo rellena la galería pública: el
 * dashboard no lo pide y la tarjeta no pinta nada si falta.
 */
export type PrecioMarketplace = {
  precio: number;
  /** Precio regular tachado cuando la oferta de lanzamiento aplica. */
  precioRegular: number | null;
};

export type PlantillaMarketplace = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  event_type: string | null;
  preview_image_url: string | null;
  precio?: PrecioMarketplace | null;
  /** Estilo del catálogo (`estilos.ts`); `null` si aún no se etiquetó. */
  estilo?: EstiloClave | null;
};

export type FiltroMarketplace = {
  /** `event_type` exacto tal como viene de la BD, o `null` = todos. */
  evento?: string | null;
  /** Estilo del catálogo, o `null` = todos. */
  estilo?: EstiloClave | null;
  /**
   * Precio máximo para publicar (inclusive), o `null` = cualquiera. Una
   * plantilla sin precio calculado (el dashboard no lo pide) no pasa este filtro.
   */
  precioMax?: number | null;
  /** Texto libre sobre nombre + descripción. */
  q?: string | null;
  /** Cuando es `true`, deja sólo las que están en `favoritos`. */
  soloFavoritos?: boolean;
  /** Ids de plantilla marcadas por el usuario de la sesión. */
  favoritos?: ReadonlySet<string>;
};

/**
 * Minúsculas y SIN acentos.
 *
 * La normalización de acentos no es un adorno en un catálogo en español: los
 * cinco tipos de evento incluyen «Cumpleaños» y «XV años», y el usuario que
 * teclea «cumpleanos» o «anos» —sin acento y sin eñe, que es como se escribe
 * cuando se tiene prisa— no encontraría NADA. `NFD` separa la letra de su
 * diacrítico y el rango `\u0300-\u036f` borra el diacrítico suelto, así que
 * «ñ» → «n» y «ñ» deja de ser un carácter distinto de «n».
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Aplica evento y búsqueda. Conserva el orden de entrada (la página ya pide
 * `order by name`), porque reordenar aquí escondería un cambio de criterio
 * lejos de donde se decidió.
 */
export function filtrarPlantillas(
  lista: readonly PlantillaMarketplace[],
  filtro: FiltroMarketplace = {},
): PlantillaMarketplace[] {
  const evento = filtro.evento ?? null;
  const consulta = normalizar(filtro.q ?? "");
  // Se parte en términos para que «boda jardin» encuentre una plantilla cuyo
  // nombre lleva «Boda» y cuya descripción lleva «jardín»: buscar la cadena
  // entera fallaría porque las dos palabras nunca están juntas en un campo.
  const terminos = consulta ? consulta.split(/\s+/) : [];

  /*
    Un `soloFavoritos` activo SIN conjunto de favoritos devuelve lista vacía, y
    es lo correcto: significa «no tengo ninguno», no «enséñamelas todas».
    Tratarlo como filtro inactivo mostraría las 50 con el filtro encendido.
  */
  const favoritos = filtro.favoritos ?? new Set<string>();

  return lista.filter((tpl) => {
    if (filtro.soloFavoritos && !favoritos.has(tpl.id)) return false;
    if (evento && tpl.event_type !== evento) return false;
    if (filtro.estilo && tpl.estilo !== filtro.estilo) return false;
    if (
      filtro.precioMax != null &&
      (tpl.precio == null || tpl.precio.precio > filtro.precioMax)
    ) {
      return false;
    }
    if (terminos.length === 0) return true;
    const heno = normalizar(`${tpl.name} ${tpl.description ?? ""}`);
    return terminos.every((t) => heno.includes(t));
  });
}

/**
 * Cuenta por tipo de evento para poder rotular las pastillas («Boda · 10»).
 * El conteo se calcula sobre la lista COMPLETA a propósito: si se calculara
 * sobre lo ya filtrado, elegir «Boda» pondría todas las demás pastillas a 0 y
 * el usuario no sabría a dónde puede ir.
 */
export function contarPorEvento(
  lista: readonly PlantillaMarketplace[],
): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const tpl of lista) {
    if (!tpl.event_type) continue;
    cuenta.set(tpl.event_type, (cuenta.get(tpl.event_type) ?? 0) + 1);
  }
  return cuenta;
}

/**
 * Topes de precio que se ofrecen como pastillas: los precios que de verdad hay
 * en el catálogo, de menor a mayor, SIN el más alto (con ese tope se verían
 * todas, que ya es «Cualquier precio»). Salen de los datos y no de números
 * escritos a mano: al terminar la campaña de lanzamiento los precios cambian y
 * las pastillas se ajustan solas.
 */
export function topesDePrecio(lista: readonly PlantillaMarketplace[]): number[] {
  const precios = [
    ...new Set(
      lista.flatMap((t) => (t.precio ? [t.precio.precio] : [])),
    ),
  ].sort((a, b) => a - b);
  return precios.slice(0, -1);
}

export type Facetas = {
  evento: Map<string, number>;
  estilo: Map<EstiloClave, number>;
  /** Por tope de precio: cuántas plantillas cuestan ese tope o menos. */
  precio: Map<number, number>;
};

/**
 * Conteos de cada grupo de filtros calculados con los OTROS filtros activos y
 * sin el del propio grupo. Así elegir «Boda» no pone en 0 al resto de los tipos
 * de evento (el grupo de evento ignora su propia elección), pero sí muestra que
 * «Divertido» no tiene bodas si el estilo y el evento se cruzan en vacío.
 */
export function contarFacetas(
  lista: readonly PlantillaMarketplace[],
  filtro: FiltroMarketplace,
  topes: readonly number[],
): Facetas {
  const sinEvento = filtrarPlantillas(lista, { ...filtro, evento: null });
  const sinEstilo = filtrarPlantillas(lista, { ...filtro, estilo: null });
  const sinPrecio = filtrarPlantillas(lista, { ...filtro, precioMax: null });

  const evento = new Map<string, number>();
  for (const t of sinEvento) {
    if (t.event_type) evento.set(t.event_type, (evento.get(t.event_type) ?? 0) + 1);
  }
  const estilo = new Map<EstiloClave, number>();
  for (const t of sinEstilo) {
    if (t.estilo) estilo.set(t.estilo, (estilo.get(t.estilo) ?? 0) + 1);
  }
  const precio = new Map<number, number>();
  for (const tope of topes) {
    precio.set(tope, sinPrecio.filter((t) => t.precio != null && t.precio.precio <= tope).length);
  }
  return { evento, estilo, precio };
}

/** `?estilo=` de la URL → un estilo válido, o `null` (nunca un valor inventado). */
export function estiloDeLaUrl(valor: string | undefined | null): EstiloClave | null {
  return ESTILOS.find((e) => e.clave === valor)?.clave ?? null;
}

/**
 * `?precio=` de la URL → un tope que de verdad existe en el catálogo, o `null`.
 * Un número cualquiera dejaría la rejilla vacía sin ninguna pastilla activa.
 */
export function precioDeLaUrl(
  valor: string | undefined | null,
  topes: readonly number[],
): number | null {
  if (!valor || !/^\d+$/.test(valor)) return null;
  const n = Number(valor);
  return topes.includes(n) ? n : null;
}

/**
 * Vista de venta de una plantilla: la invitación completa más el precio y el
 * botón de usarla. Es una ruta NUEVA (`/plantillas/<slug>`) y no `/plantilla/`
 * a propósito: esa es la superficie de captura de miniaturas y de cinco
 * scripts de medición, y un botón de compra ahí se quemaría en las imágenes.
 */
export function hrefVistaPlantilla(slug: string): string {
  return `/plantillas/${encodeURIComponent(slug)}`;
}

/**
 * A dónde se vuelve tras registrarse o iniciar sesión viniendo de «Usar esta
 * plantilla»: la vista de venta CON `?usar=1`, la señal de que la persona ya
 * eligió y solo faltaba la cuenta. La vista decide si crea la invitación sola
 * (ver `esInicioReciente`): el parámetro por sí solo no basta para crear nada.
 */
export function rutaUsarPlantilla(slug: string): string {
  return `${hrefVistaPlantilla(slug)}?usar=1`;
}

/**
 * Destino del botón «Usar esta plantilla» para quien NO tiene sesión: el
 * registro, llevando a dónde volver. El registro (correo, Google) y el inicio
 * de sesión conservan ese `next` hasta el final; ver `lib/auth/ruta-interna`.
 */
export function hrefUsarPlantillaSinSesion(slug: string): string {
  return `/register?next=${encodeURIComponent(rutaUsarPlantilla(slug))}`;
}
