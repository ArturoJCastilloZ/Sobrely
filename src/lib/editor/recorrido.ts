import type { Seleccion } from "@/lib/editor/seleccion";

/**
 * El RECORRIDO por teclado sobre los bloques del lienzo.
 *
 * Es la deuda que la Fase 2 dejo escrita: se podia seleccionar con el raton y
 * salir con `Esc`, pero no habia forma de ENTRAR sin puntero. Un usuario de
 * teclado llegaba al lienzo y no podia tocar nada.
 *
 * ── Por que es un roving tabindex y no 36 paradas de `Tab` ────────────
 *
 * Medido: doce modulos por ~3 bloques son ~36 nodos. Hacerlos a todos parada
 * de `Tab` obligaria a pulsar 36 veces para CRUZAR el lienzo y llegar al panel
 * de propiedades, que es justo lo que el patron de roving tabindex existe para
 * evitar. Aqui el lienzo es UNA parada: `Tab` entra y sale, las flechas
 * recorren, `Enter` edita, `Esc` sube un nivel (eso ya existia).
 *
 * ── Por que TOPE y no vuelta ──────────────────────────────────────────
 *
 * Al llegar al final NO se salta al principio. En un lienzo que mide varias
 * pantallas, envolver teletransporta el foco al otro extremo de la invitacion
 * sin que nada lo anuncie. Topar devuelve la MISMA seleccion, y como el
 * provider compara por valor (`mismaSeleccion`), una flecha de mas no repinta
 * nada. Es la misma decision que `subirUnNivel` cuando ya no se puede subir.
 */
export type Parada = { moduloId: string; bloque: string };

/** Indice de la seleccion dentro del recorrido, o `-1`. */
function indiceDe(lista: Parada[], sel: Seleccion): number {
  if (sel === null || sel.tipo !== "bloque") return -1;
  return lista.findIndex(
    (p) => p.moduloId === sel.moduloId && p.bloque === sel.bloque,
  );
}

/** La primera parada de un modulo, o `-1` si no tiene ninguna. */
function primeraDelModulo(lista: Parada[], moduloId: string): number {
  return lista.findIndex((p) => p.moduloId === moduloId);
}

const paradaComoSeleccion = (p: Parada): Seleccion => ({
  tipo: "bloque",
  moduloId: p.moduloId,
  bloque: p.bloque,
});

/**
 * La siguiente parada del recorrido, o la MISMA seleccion si no hay a donde ir.
 *
 * `lista` viene del DOM en orden de documento, no de la tabla de `bloques.ts`:
 * la secuencia renderizada es un PREFIJO de la tabla —los hijos condicionales
 * de cola desaparecen, `gifts` da 3 bloques con enlaces y 2 sin ellos— asi que
 * la tabla prometeria paradas que no existen en la pagina.
 */
export function siguienteParada(
  lista: Parada[],
  sel: Seleccion,
  paso: 1 | -1,
): Seleccion {
  if (lista.length === 0) return sel;

  const i = indiceDe(lista, sel);

  if (i === -1) {
    // Sin seleccion, o con una que ya no existe.
    if (sel !== null) {
      // Hay un modulo apuntado: se entra por su primera parada. Cubre los dos
      // casos de una vez —seleccion de MODULO, y seleccion de un bloque que el
      // render ya no emite— y en ambos lo correcto es aterrizar en ese modulo,
      // no al principio de la invitacion.
      const j = primeraDelModulo(lista, sel.moduloId);
      if (j !== -1) return paradaComoSeleccion(lista[j]);
    }
    return paradaComoSeleccion(lista[paso === 1 ? 0 : lista.length - 1]);
  }

  const destino = i + paso;
  if (destino < 0 || destino >= lista.length) return sel;
  return paradaComoSeleccion(lista[destino]);
}

/** El extremo del recorrido. Es lo que hacen `Inicio` y `Fin`. */
export function paradaExtrema(lista: Parada[], sel: Seleccion, cual: "primera" | "ultima"): Seleccion {
  if (lista.length === 0) return sel;
  return paradaComoSeleccion(lista[cual === "primera" ? 0 : lista.length - 1]);
}
