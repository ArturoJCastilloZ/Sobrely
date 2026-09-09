/**
 * Guías de alineación del arrastre libre de texto.
 *
 * Qué resuelve: con el movimiento libre, «centrado» dejó de ser el estado por
 * defecto y pasó a depender del pulso. Sin una señal, el usuario suelta el
 * título casi en medio y el desajuste sólo se ve en la invitación final, que es
 * el peor sitio para verlo.
 *
 * Decisión del dev: **guía sin imán**. La línea aparece cuando el bloque está
 * alineado, pero el bloque NUNCA se mueve solo. Por eso aquí no hay ninguna
 * función que corrija el desplazamiento: esto sólo OBSERVA. Si alguna vez se
 * quiere enganche, se añade aparte y se decide entonces — no se cuela ahora.
 *
 * Unidades: fracciones del ANCHO de contenido de la sección, en los dos ejes.
 * Es la unidad de `cqw` que usa el resto del movimiento libre, y por eso el eje
 * vertical llega a `alto/ancho` y no a 1 (ver `limitarDesplazamiento`).
 */

export type TipoGuia = "centro" | "bloque";

export type Guia = {
  /** `x` = línea VERTICAL (compara posiciones horizontales), `y` al revés. */
  eje: "x" | "y";
  /** Posición sobre ese eje, en fracciones del ancho de contenido. */
  pos: number;
  /** `centro` = el centro de la sección. `bloque` = otro texto. */
  tipo: TipoGuia;
};

export type Centro = { x: number; y: number };

/**
 * Tolerancia por defecto, en fracciones del ancho.
 *
 * 0.008 sobre una sección de 418 px de contenido son ~3.3 px: lo bastante
 * estrecho para que la guía signifique algo y lo bastante ancho para que se
 * pueda acertar arrastrando con el dedo. No se afina más sin medirlo.
 */
export const TOLERANCIA_GUIA = 0.008;

/**
 * Qué guías deben encenderse para el bloque que se está arrastrando.
 *
 * `otros` son los centros de los DEMÁS bloques de la misma sección; el que se
 * arrastra no se compara consigo mismo (quien llama lo excluye).
 *
 * Devuelve como mucho una guía por eje y posición: si el bloque está a la vez
 * en el centro de la sección y alineado con otro texto que también está
 * centrado, se dibuja UNA línea, y manda `centro` — que es la información más
 * útil de las dos.
 */
export function guiasActivas(
  centro: Centro,
  otros: Centro[],
  extension: { ancho: number; alto: number },
  tolerancia: number = TOLERANCIA_GUIA,
): Guia[] {
  if (!esFinito(centro.x) || !esFinito(centro.y)) return [];
  if (!(tolerancia > 0)) return [];

  const candidatas: Guia[] = [];

  // El centro de la sección, que es la referencia que el dev pidió: «saber si
  // estoy en medio».
  if (esFinito(extension.ancho) && extension.ancho > 0) {
    const medio = extension.ancho / 2;
    if (Math.abs(centro.x - medio) <= tolerancia) {
      candidatas.push({ eje: "x", pos: medio, tipo: "centro" });
    }
  }
  if (esFinito(extension.alto) && extension.alto > 0) {
    const medio = extension.alto / 2;
    if (Math.abs(centro.y - medio) <= tolerancia) {
      candidatas.push({ eje: "y", pos: medio, tipo: "centro" });
    }
  }

  // Alineación con los otros textos. Vale tanto para «los dos centrados» como
  // para «los dos a la izquierda», que con tres bloques sueltos es justo lo que
  // cuesta acertar a ojo.
  // Sin guarda de finitud sobre `otros` a propósito: un centro `NaN` o
  // `Infinity` ya falla la comparación (`Math.abs(x - NaN) <= t` es `false`),
  // así que la guarda sería código muerto. Lo comprobó una tanda de mutación:
  // quitarla no cambiaba ni una prueba. El bloque ARRASTRADO sí se valida
  // arriba, y esa guarda no es redundante — sin ella, un `y` roto seguía
  // encendiendo la guía del eje `x`.
  for (const o of otros) {
    if (Math.abs(centro.x - o.x) <= tolerancia) {
      candidatas.push({ eje: "x", pos: o.x, tipo: "bloque" });
    }
    if (Math.abs(centro.y - o.y) <= tolerancia) {
      candidatas.push({ eje: "y", pos: o.y, tipo: "bloque" });
    }
  }

  return dedup(candidatas, tolerancia);
}

/**
 * Una línea por eje y posición. Dos guías cuentan como la misma cuando caen
 * dentro de la tolerancia: dibujar dos líneas a dos píxeles se lee como un
 * trazo grueso y sucio, no como dos referencias.
 *
 * En un empate gana la PRIMERA, y por eso `guiasActivas` empuja las de `centro`
 * antes que las de `bloque`: cuando el bloque está en medio y además alineado
 * con otro texto, la línea que se dibuja dice «centro», que es la información
 * más útil. El orden es el mecanismo — se probó a desempatar con una condición
 * explícita y la mutación demostró que era una rama inalcanzable.
 */
function dedup(guias: Guia[], tolerancia: number): Guia[] {
  const out: Guia[] = [];
  for (const g of guias) {
    const ya = out.some(
      (x) => x.eje === g.eje && Math.abs(x.pos - g.pos) <= tolerancia,
    );
    if (!ya) out.push(g);
  }
  return out;
}

function esFinito(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n);
}
