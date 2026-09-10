/**
 * Cuánto esperar antes del próximo autoguardado.
 *
 * Vive FUERA del hook a propósito: la suite corre en `environment: "node"` y
 * sin `testing-library`, así que dentro del hook esta decisión no se podría
 * probar. Sacarla deja el hook reducido a cablear efectos y esta regla —que es
 * la que decide si el trabajo del usuario sobrevive— cubierta por pruebas.
 */
export function esperaDelAutoguardado({
  pendienteDesde,
  ahora,
  esperaMs,
  maxEsperaMs,
}: {
  /** Cuándo empezó el tramo de cambios pendientes actual (ms epoch). */
  pendienteDesde: number;
  ahora: number;
  /** Espera normal tras la última tecla. */
  esperaMs: number;
  /** Tope desde `pendienteDesde`: pasado esto se guarda aunque se siga escribiendo. */
  maxEsperaMs: number;
}): number {
  // Sin el tope, una espera que se reinicia con cada tecla puede no dispararse
  // NUNCA mientras alguien escribe sin pausas: el trabajo se queda en memoria.
  const restanteDelTope = pendienteDesde + maxEsperaMs - ahora;
  // Nunca negativo: un `setTimeout` con negativo dispara ya, pero devolver el
  // número crudo escondería que el tope se pasó hace rato.
  return Math.max(0, Math.min(esperaMs, restanteDelTope));
}
