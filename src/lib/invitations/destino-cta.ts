/**
 * A dónde lleva la etiqueta de la portada («ACOMPÁÑANOS», «VER DETALLES»…).
 *
 * Era un `<span>` con aspecto de botón que no llevaba a ningún sitio (medido a 375 px: 89 × 20 px,
 * sin ningún elemento interactivo, en las 65 plantillas). Ahora es un enlace dentro de la misma
 * página, y el destino sale de lo que la etiqueta promete:
 *   - «Ver …» (ver detalles, ver todo, ver el video, ver agenda…) promete más contenido: baja a
 *     la sección que sigue a la portada.
 *   - Cualquier otra (Acompáñanos, Te espero, Confirmar, ¡Sí voy!, Regístrate, Entra…) invita a
 *     decir que sí: baja al formulario de confirmación.
 * Comprobado contra las 27 etiquetas distintas que traen hoy las 65 plantillas.
 */
export type DestinoDeCta = "confirmar" | "siguiente";

export function destinoDeCta(etiqueta: string): DestinoDeCta {
  return /^\s*ver\b/i.test(etiqueta) ? "siguiente" : "confirmar";
}

/** Ancla del formulario de confirmación y de la sección que sigue a la portada. */
export const ANCLA_CONFIRMAR = "inv-confirmar";
export const ANCLA_SIGUIENTE = "inv-siguiente";
