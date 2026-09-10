"use client";

import { createContext, useContext } from "react";

/**
 * ¿Ya se reveló el módulo que me contiene?
 *
 * Existe por un defecto MEDIDO (U-3) en una invitación publicada con el preset
 * `curtain-reveal`, con la pestaña visible y `requestAnimationFrame` vivo:
 *
 *   Un módulo que se oculta RECORTANDO su caja (`clip-path: inset(0 0 100%)`)
 *   deja el área de intersección de todo lo que lleva dentro en CERO — Chrome
 *   descuenta el recorte del ancestro al calcular la del descendiente. Así que
 *   un `IntersectionObserver` anidado no ve nada mientras la cortina está
 *   cerrada, a NINGÚN umbral: no es cuestión de bajarlo a 0, se probó y no
 *   movió la medición.
 *
 *   Y cuando la cortina por fin abre, un dedo que hizo scroll de verdad ya se
 *   llevó el grupo fuera de la pantalla, así que no vuelve a intersecar nunca.
 *   Medido con un fling continuo de ~3000 px/s: el módulo revelado y con
 *   `clip: inset(0px)`, y sus **6 de 6** filas de itinerario en `opacity: 0`.
 *   Un invitado hace scroll una vez y no ve el horario del evento.
 *
 * La salida es no depender de la intersección del descendiente: el módulo ya
 * sabe cuándo se reveló, y ese momento ES el momento en que su contenido pasa a
 * ser visible. Se publica por contexto en vez de enhebrarlo por los tres sitios
 * que montan grupos escalonados (itinerario, regalos, galería), que además
 * están a distinta profundidad.
 *
 * El defecto por omisión es `false`: sin proveedor —el catálogo de animaciones,
 * o un grupo que no vive dentro de un módulo animado— cada grupo sigue
 * decidiendo con su propio observador, igual que antes.
 */
export const RevealDelAncestro = createContext(false);

export function useRevealDelAncestro(): boolean {
  return useContext(RevealDelAncestro);
}
