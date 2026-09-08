/**
 * Lógica del MARKETPLACE de plantillas (Fase 4): filtro por tipo de evento y
 * búsqueda. Vive aquí, separada del componente, porque la suite de este repo
 * es `environment: node` y sólo recoge `*.test.ts`: una función pura se puede
 * defender de verdad, un `.tsx` con DOM no se probaría en absoluto.
 *
 * NO hay filtro por ESTILO, y no es un olvido. Medido contra producción sobre
 * las 50 filas activas: las 13 artes de fondo que asigna la `0030` están cada
 * una dentro de UN SOLO tipo de evento (Boda 3, XV 4, Baby shower 2,
 * Cumpleaños 2, Corporativo 2; cero solapamiento). O sea que el arte es una
 * sub-partición del tipo de evento, no una dimensión independiente: como
 * faceta paralela, «Cumpleaños + Botánica» daría 0 resultados siempre. Y no
 * hay ninguna otra señal transversal en `theme_config` — `themePack` sólo
 * está en 30 de 50, `font` y `spacing` en 15. El estilo se reabre en la Fase 7,
 * cuando el Theme System añada packs y exista un dato que cruce eventos.
 */

export type PlantillaMarketplace = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  event_type: string | null;
  preview_image_url: string | null;
};

export type FiltroMarketplace = {
  /** `event_type` exacto tal como viene de la BD, o `null` = todos. */
  evento?: string | null;
  /** Texto libre sobre nombre + descripción. */
  q?: string | null;
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

  return lista.filter((tpl) => {
    if (evento && tpl.event_type !== evento) return false;
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
