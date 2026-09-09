"use client";

import { useRef } from "react";

import {
  limitarDesplazamiento,
  type Desplazamiento,
} from "@/lib/modules/types";

/**
 * Arrastre de los textos en la vista previa.
 *
 * ⚠️ ES UN HOOK, NO UNA CAPA, y eso es el arreglo de un fallo real: la primera
 * versión era un `<div absolute inset-0>` encima de la vista previa, como la
 * capa de stickers. **No funcionaba y el dev lo reportó.** Medido en el
 * navegador: con ese overlay, el puntero sobre el título lo recibe el OVERLAY,
 * así que `e.target.closest("[data-bloque]")` devuelve `null` y el arrastre no
 * empezaba nunca.
 *
 * La capa de stickers sí puede ser un overlay porque los stickers son sus
 * PROPIOS HIJOS; aquí los bloques son de otro árbol. Copié la forma sin copiar
 * la condición que la hacía válida.
 *
 * Los manejadores se ponen en el contenedor que ENVUELVE los módulos, así el
 * evento burbujea desde el texto y `e.target` es el bloque de verdad. Con eso
 * el modo de fallo desaparece por construcción: no hay nada tapando.
 *
 * Mecánica reusada de `sticker-editor-layer`: `setPointerCapture` más
 * fracciones contra el rect. Cero librerías nuevas.
 *
 * Por qué no hay pila de deshacer aquí: ya existe. `updateConfig` funde por
 * `config:<id>:textOffsets` dentro de 700 ms, así que un arrastre entero es UN
 * paso de ⌘Z. Comprobado en `claveDeFusion`.
 */
export function useMovimientoLibre({
  onOffset,
  activo,
}: {
  /**
   * `bloque` llega tal cual del DOM: un nombre para la portada, un índice en
   * texto para las secciones. Quien recibe decide cómo guardarlo.
   */
  onOffset?: (moduloId: string, bloque: string, d: Desplazamiento) => void;
  /** Sin ningún módulo con el interruptor encendido no se engancha nada. */
  activo: boolean;
}) {
  const arrastre = useRef<{
    moduloId: string;
    bloque: string;
    ancho: number;
    // Centro natural del bloque (sin el desplazamiento actual), en fracciones
    // del ANCHO de la sección — la unidad de `cqw`, los dos ejes.
    centro: { x: number; y: number };
    medio: { ancho: number; alto: number };
    extension: { ancho: number; alto: number };
    inicio: { x: number; y: number };
    base: Desplazamiento;
  } | null>(null);

  if (!activo || !onOffset) return {};

  return {
    onPointerDown(e: React.PointerEvent) {
      const destino = (e.target as HTMLElement).closest?.("[data-bloque]");
      if (!(destino instanceof HTMLElement)) return;
      const contenedor = destino.closest("[data-modulo]");
      const seccion = destino.closest("section");
      if (
        !(contenedor instanceof HTMLElement) ||
        !(seccion instanceof HTMLElement)
      ) {
        return;
      }

      const rs = seccion.getBoundingClientRect();
      if (rs.width <= 0) return;
      const rb = destino.getBoundingClientRect();
      // El transform actual se descuenta para obtener el centro NATURAL: sin
      // esto, cada arrastre partiría de una base equivocada y el bloque
      // saltaría al agarrarlo por segunda vez.
      const previo = leerTranslateEnCqw(destino);

      arrastre.current = {
        moduloId: contenedor.dataset.modulo ?? "",
        bloque: destino.dataset.bloque ?? "",
        ancho: rs.width,
        centro: {
          x: (rb.left + rb.width / 2 - rs.left) / rs.width - previo.dx,
          y: (rb.top + rb.height / 2 - rs.top) / rs.width - previo.dy,
        },
        medio: { ancho: rb.width / 2 / rs.width, alto: rb.height / 2 / rs.width },
        // El eje vertical NO llega a 1: la sección mide `alto/ancho` en
        // unidades de ancho, que es la unidad de `cqw`.
        extension: { ancho: 1, alto: rs.height / rs.width },
        inicio: { x: e.clientX, y: e.clientY },
        base: previo,
      };

      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      // Evita que el navegador seleccione el texto mientras se coloca. No pisa
      // nada más: la vista previa no tiene clic-para-seleccionar.
      e.preventDefault();
    },

    onPointerMove(e: React.PointerEvent) {
      const a = arrastre.current;
      if (!a) return;
      const bruto: Desplazamiento = {
        dx: a.base.dx + (e.clientX - a.inicio.x) / a.ancho,
        dy: a.base.dy + (e.clientY - a.inicio.y) / a.ancho,
      };
      onOffset(
        a.moduloId,
        a.bloque,
        limitarDesplazamiento(bruto, a.centro, a.medio, a.extension),
      );
    },

    onPointerUp() {
      arrastre.current = null;
    },

    onPointerCancel() {
      arrastre.current = null;
    },
  };
}

/**
 * Lee el `translate(...cqw, ...cqw)` que ya tiene el bloque, en fracciones.
 *
 * Del estilo INLINE y no del computado a propósito: el navegador devuelve el
 * computado como matriz en píxeles, y volver de ahí a fracciones exige deshacer
 * la escala del zoom del editor. El inline es exactamente lo que el render
 * escribió.
 */
function leerTranslateEnCqw(el: HTMLElement): Desplazamiento {
  const m = /translate\((-?[\d.]+)cqw,\s*(-?[\d.]+)cqw\)/.exec(el.style.transform);
  if (!m) return { dx: 0, dy: 0 };
  return { dx: Number(m[1]) / 100, dy: Number(m[2]) / 100 };
}
