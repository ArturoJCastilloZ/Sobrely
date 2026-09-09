"use client";

import { useRef } from "react";

import {
  limitarDesplazamiento,
  paresSolapados,
  type Desplazamiento,
} from "@/lib/modules/types";
import { guiasActivas, type Guia } from "@/lib/modules/guias";

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
  onSolape,
}: {
  /**
   * `bloque` llega tal cual del DOM: un nombre para la portada, un índice en
   * texto para las secciones. Quien recibe decide cómo guardarlo.
   */
  onOffset?: (moduloId: string, bloque: string, d: Desplazamiento) => void;
  /** Sin ningún módulo con el interruptor encendido no se engancha nada. */
  activo: boolean;
  /**
   * Se avisa AL SOLTAR si dos textos de la sección quedaron pisándose.
   *
   * Al soltar y no durante el arrastre: mientras se mueve, el bloque pasa por
   * encima de los demás constantemente y un aviso parpadeando sería ruido. Lo
   * que importa es dónde se dejó.
   */
  onSolape?: (moduloId: string, hay: boolean) => void;
}) {
  const arrastre = useRef<{
    moduloId: string;
    bloque: string;
    ancho: number;
    escala: number;
    // Centro natural del bloque (sin el desplazamiento actual), en fracciones
    // del ANCHO de la sección — la unidad de `cqw`, los dos ejes.
    centro: { x: number; y: number };
    extension: { ancho: number; alto: number };
    inicio: { x: number; y: number };
    base: Desplazamiento;
    seccion: HTMLElement;
    padLeft: number;
    padTop: number;
    /** Centros de los DEMÁS bloques, en la misma unidad que `centro`. */
    otros: { x: number; y: number }[];
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
      // ⚠️ `cqw` NO resuelve contra la caja de BORDE, resuelve contra la de
      // CONTENIDO. La sección lleva `px-6`, así que usar el rect entero hacía
      // que el texto se quedara ATRÁS del cursor: medido, se arrastraban 90 px
      // y se movía 80 — el 88,5 %, que es exactamente 370/418, el contenido
      // partido por el borde.
      const cs = getComputedStyle(seccion);
      const ancho =
        seccion.clientWidth -
        parseFloat(cs.paddingLeft || "0") -
        parseFloat(cs.paddingRight || "0");
      if (ancho <= 0) return;
      // El alto de contenido, en la misma unidad, para la extensión vertical.
      const alto =
        seccion.clientHeight -
        parseFloat(cs.paddingTop || "0") -
        parseFloat(cs.paddingBottom || "0");
      // El rect puede venir ESCALADO por el zoom del lienzo, mientras
      // `clientWidth` viene en px CSS. El factor se necesita para convertir el
      // movimiento del cursor —que es de pantalla— a px CSS.
      const escala = rs.width > 0 ? seccion.clientWidth / rs.width : 1;
      const rb = destino.getBoundingClientRect();
      const padLeft = parseFloat(cs.paddingLeft || "0");
      const padTop = parseFloat(cs.paddingTop || "0");
      // El transform actual se descuenta para obtener el centro NATURAL: sin
      // esto, cada arrastre partiría de una base equivocada y el bloque
      // saltaría al agarrarlo por segunda vez.
      const previo = leerTranslateEnCqw(destino);

      arrastre.current = {
        moduloId: contenedor.dataset.modulo ?? "",
        bloque: destino.dataset.bloque ?? "",
        ancho,
        escala,
        centro: {
          // Todo en px CSS y contra el origen del CONTENIDO, que es lo que
          // `cqw` mide. `escala` deshace el zoom del lienzo.
          x:
            ((rb.left + rb.width / 2 - rs.left) * escala - padLeft) / ancho -
            previo.dx,
          y:
            ((rb.top + rb.height / 2 - rs.top) * escala - padTop) / ancho -
            previo.dy,
        },
        // El eje vertical NO llega a 1: la sección mide `alto/ancho` en
        // unidades de ancho, que es la unidad de `cqw`.
        extension: { ancho: 1, alto: alto / ancho },
        inicio: { x: e.clientX, y: e.clientY },
        base: previo,
        seccion,
        padLeft,
        padTop,
        // Los DEMÁS bloques de la sección, para poder alinear con ellos. Se
        // miden una vez al agarrar: durante el arrastre no se mueven, y
        // remedirlos por frame costaría un reflow cada vez.
        otros: [...seccion.querySelectorAll("[data-bloque]")]
          .filter((el) => el !== destino && el instanceof HTMLElement)
          .map((el) => {
            const r = (el as HTMLElement).getBoundingClientRect();
            return {
              x: ((r.left + r.width / 2 - rs.left) * escala - padLeft) / ancho,
              y: ((r.top + r.height / 2 - rs.top) * escala - padTop) / ancho,
            };
          }),
      };

      abrirLienzo();

      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      // Evita que el navegador seleccione el texto mientras se coloca. No pisa
      // nada más: la vista previa no tiene clic-para-seleccionar.
      e.preventDefault();
    },

    onPointerMove(e: React.PointerEvent) {
      const a = arrastre.current;
      if (!a) return;
      const bruto: Desplazamiento = {
        dx: a.base.dx + ((e.clientX - a.inicio.x) * a.escala) / a.ancho,
        dy: a.base.dy + ((e.clientY - a.inicio.y) * a.escala) / a.ancho,
      };
      const d = limitarDesplazamiento(bruto, a.centro, a.extension);
      onOffset(a.moduloId, a.bloque, d);

      // Guía SIN imán: se dibuja dónde está alineado, pero `d` ya se entregó
      // sin tocar. Decisión explícita del dev — que la línea avise y que el
      // pulso mande.
      pintar(
        guiasActivas(
          { x: a.centro.x + d.dx, y: a.centro.y + d.dy },
          a.otros,
          a.extension,
        ),
        a,
      );
    },

    onPointerUp() {
      const a = arrastre.current;
      cerrarLienzo();
      arrastre.current = null;
      if (a && onSolape) onSolape(a.moduloId, haySolape(a.seccion));
    },

    onPointerCancel() {
      cerrarLienzo();
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


/**
 * El lienzo de las guías vive FUERA del árbol de React, en `document.body`.
 *
 * Dos razones, las dos aprendidas aquí. Si se insertara dentro de la sección,
 * React lo borraría en el primer re-render del arrastre —que ocurre en cada
 * `onOffset`—. Y va con `pointer-events: none` porque este archivo ya pagó una
 * vez el precio de un overlay que se comía el puntero: es EXACTAMENTE el fallo
 * que documenta la cabecera, y la capa de stickers volvió a caer en él.
 */
function abrirLienzo() {
  cerrarLienzo();
  const el = document.createElement("div");
  el.dataset.guiasDeArrastre = "si";
  el.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:60";
  document.body.appendChild(el);
  lienzoGlobal = el;
}

function cerrarLienzo() {
  lienzoGlobal?.remove();
  lienzoGlobal = null;
}

let lienzoGlobal: HTMLDivElement | null = null;

/** Dibuja las líneas. Se repinta entero: son dos nodos, no vale optimizarlo. */
function pintar(
  guias: Guia[],
  a: {
    seccion: HTMLElement;
    ancho: number;
    escala: number;
    padLeft: number;
    padTop: number;
  },
) {
  const el = lienzoGlobal;
  if (!el) return;
  const rs = a.seccion.getBoundingClientRect();
  // De fracciones del ancho de CONTENIDO a píxeles de pantalla: se deshace la
  // escala del zoom del lienzo, igual que en el resto del arrastre.
  const aPantalla = (pos: number, pad: number) => (pad + pos * a.ancho) / a.escala;
  el.innerHTML = guias
    .map((g) => {
      const color = g.tipo === "centro" ? "#e11d48" : "#0ea5e9";
      if (g.eje === "x") {
        const x = rs.left + aPantalla(g.pos, a.padLeft);
        return `<div style="position:absolute;left:${x}px;top:${rs.top}px;height:${rs.height}px;width:1px;background:${color};opacity:.85"></div>`;
      }
      const y = rs.top + aPantalla(g.pos, a.padTop);
      return `<div style="position:absolute;top:${y}px;left:${rs.left}px;width:${rs.width}px;height:1px;background:${color};opacity:.85"></div>`;
    })
    .join("");
}

/**
 * ¿Quedaron dos textos pisándose en esta sección?
 *
 * Reusa `paresSolapados`, que estaba escrito y probado desde el arrastre y no
 * lo llamaba NADIE. Se mide en píxeles de pantalla: la unidad da igual mientras
 * sea la misma para todos, porque la comprobación es relativa.
 */
function haySolape(seccion: HTMLElement): boolean {
  const cajas = [...seccion.querySelectorAll("[data-bloque]")]
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.dataset.bloque || String(i),
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        w: r.width,
        h: r.height,
      };
    })
    // Un bloque sin caja (vacío u oculto) no puede pisar a nadie, y con w=0
    // la comprobación daría un falso positivo contra cualquiera que lo cruce.
    .filter((c) => c.w > 0 && c.h > 0);
  return paresSolapados(cajas).length > 0;
}
