"use client";

import { useRef } from "react";

import {
  limitarDesplazamiento,
  type Desplazamiento,
} from "@/lib/modules/types";

/**
 * Arrastre de los textos en la vista previa.
 *
 * UNA capa para los doce módulos. Encuentra los bloques por `data-bloque`, que
 * la portada emite por NOMBRE (`title`/`subtitle`/`cta`) y `Section` por ÍNDICE
 * (`0`,`1`,…), y devuelve el patch que corresponda a cada forma. No conoce
 * ningún módulo en concreto: si mañana otro emite bloques, los arrastra sin
 * tocar este archivo.
 *
 * Mecánica reusada de `sticker-editor-layer`: `setPointerCapture` más
 * fracciones contra el rect. Cero librerías nuevas — la misma decisión que la
 * PoC de canvas dejó por escrito.
 *
 * Por qué no hay pila de deshacer aquí: ya existe. `updateConfig` funde por
 * `config:<id>:textOffsets` dentro de una ventana de 700 ms, así que un
 * arrastre entero es UN paso de ⌘Z. Comprobado en `claveDeFusion`.
 */
export function MovimientoLibreLayer({
  onOffset,
}: {
  /**
   * `bloque` llega tal cual del DOM: un nombre para la portada, un índice en
   * texto para las secciones. Quien recibe decide cómo guardarlo.
   */
  onOffset: (moduloId: string, bloque: string, d: Desplazamiento) => void;
}) {
  const arrastre = useRef<{
    moduloId: string;
    bloque: string;
    seccion: DOMRect;
    // Centro natural del bloque (sin el desplazamiento actual), en fracciones
    // del ANCHO de la sección — la unidad de `cqw`, los dos ejes.
    centro: { x: number; y: number };
    medio: { ancho: number; alto: number };
    extension: { ancho: number; alto: number };
    inicio: { x: number; y: number };
    base: Desplazamiento;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    const destino = (e.target as HTMLElement).closest("[data-bloque]");
    if (!(destino instanceof HTMLElement)) return;
    const contenedor = destino.closest("[data-modulo]");
    const seccion = destino.closest("section");
    if (!(contenedor instanceof HTMLElement) || !(seccion instanceof HTMLElement)) {
      return;
    }

    const rs = seccion.getBoundingClientRect();
    if (rs.width <= 0) return;
    const rb = destino.getBoundingClientRect();

    // El transform actual se descuenta para obtener el centro NATURAL: sin
    // esto, cada arrastre partiría de una base equivocada y el bloque saltaría.
    const previo = leerTranslateEnCqw(destino, rs.width);

    arrastre.current = {
      moduloId: contenedor.dataset.modulo ?? "",
      bloque: destino.dataset.bloque ?? "",
      seccion: rs,
      centro: {
        x: (rb.left + rb.width / 2 - rs.left) / rs.width - previo.dx,
        y: (rb.top + rb.height / 2 - rs.top) / rs.width - previo.dy,
      },
      medio: {
        ancho: rb.width / 2 / rs.width,
        alto: rb.height / 2 / rs.width,
      },
      // El eje vertical NO llega a 1: la sección mide `alto/ancho` en unidades
      // de ancho, que es la unidad de `cqw`.
      extension: { ancho: 1, alto: rs.height / rs.width },
      inicio: { x: e.clientX, y: e.clientY },
      base: previo,
    };

    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent) {
    const a = arrastre.current;
    if (!a) return;
    const bruto: Desplazamiento = {
      dx: a.base.dx + (e.clientX - a.inicio.x) / a.seccion.width,
      dy: a.base.dy + (e.clientY - a.inicio.y) / a.seccion.width,
    };
    onOffset(
      a.moduloId,
      a.bloque,
      limitarDesplazamiento(bruto, a.centro, a.medio, a.extension),
    );
  }

  function onPointerUp() {
    arrastre.current = null;
  }

  return (
    <div
      // `absolute inset-0` sobre la vista previa. `touch-none` evita que el
      // navegador se lleve el gesto como scroll a media colocación.
      className="absolute inset-0 z-20 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}

/**
 * Lee el `translate(...cqw, ...cqw)` que ya tiene el bloque, en fracciones.
 *
 * Se lee del estilo INLINE y no del computado a propósito: el navegador
 * devuelve el computado como matriz en píxeles, y volver de ahí a fracciones
 * exige deshacer la escala del zoom del editor. El inline es exactamente lo que
 * el render escribió.
 */
function leerTranslateEnCqw(el: HTMLElement, _ancho: number): Desplazamiento {
  const t = el.style.transform;
  const m = /translate\((-?[\d.]+)cqw,\s*(-?[\d.]+)cqw\)/.exec(t);
  if (!m) return { dx: 0, dy: 0 };
  return { dx: Number(m[1]) / 100, dy: Number(m[2]) / 100 };
}
