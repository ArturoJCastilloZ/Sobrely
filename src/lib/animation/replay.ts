"use client";

import { useEffect, useState } from "react";

/**
 * Canal para pedir que el preview REPRODUZCA la animación de entrada.
 *
 * Por qué existe. La animación ya se re-reproduce sola al cambiar un ajuste
 * —medido: al cambiar la intensidad, el nodo `.anim` se REEMPLAZA y la
 * transición arranca—, pero es imposible verla:
 *
 *   | intensidad | recorrido real |
 *   |------------|----------------|
 *   | Sutil      | 8 px           |
 *   | Moderada   | 30 px          |
 *   | Llamativa  | 72 px          |
 *
 * Hay 9× de diferencia entre los extremos y aun así el dev reportó que las
 * tres se veían igual. Medido frame a frame, la razón: la reproducción DURA
 * ~300 ms (a los 275 ms la opacidad ya va en 0.92 de 1) y se dispara en el
 * mismo instante en que pulsas un botón que está en el panel OPUESTO al
 * lienzo. Se acaba antes de que muevas la vista. Encima la curva de opacidad
 * —la señal que más pesa— es IDÉNTICA en las tres intensidades, así que lo
 * único que distingue es el desplazamiento, y es lo que uno se pierde.
 *
 * Un ajuste que solo se puede evaluar por accidente no se puede ajustar. De
 * ahí un disparador explícito: se mira el lienzo y se pulsa Reproducir.
 *
 * Por qué un evento del DOM y no props. Los dos paneles que editan animación
 * (`theme-panel` y el de módulo dentro de `config-editors`) viven en ramas
 * profundas y distintas del árbol, lejos de `PreviewPane`. Hilar un callback
 * por las dos obligaría a tocar una cadena larga de componentes que no tienen
 * nada que ver con animación. El canal se declara aquí, con nombre propio, y
 * no en un `window.dispatchEvent` suelto en medio de un componente.
 */
const EVENTO_REPLAY = "sobrely:replay-animacion";

/** Pide al preview que vuelva a reproducir la animación de entrada. */
export function pedirReplayDeAnimacion(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_REPLAY));
}

/**
 * Contador que sube con cada petición de replay. Se mete en la clave de
 * remonte del preview: cambiarla es lo que hace que la animación arranque
 * desde su estado oculto otra vez.
 */
export function useReplayDeAnimacion(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const alPedir = () => setN((v) => v + 1);
    window.addEventListener(EVENTO_REPLAY, alPedir);
    return () => window.removeEventListener(EVENTO_REPLAY, alPedir);
  }, []);
  return n;
}
