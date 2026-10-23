import { diasRestantes, textoDeDias } from "@/lib/previews/vigencia";

/**
 * Textos y reglas del botón «Copiar liga de vista previa». Puro y sin `node:`,
 * para que el componente de cliente lo importe y una prueba lo demuestre.
 */

export const AVISO_CAMBIOS_SIN_GUARDAR =
  "Guarda los cambios para que la vista previa los incluya.";

/**
 * ¿Se puede crear una liga ahora?
 *
 * Con cambios sin guardar NO: la vista previa muestra lo GUARDADO. Copiar una
 * liga que no refleja lo que la persona ve en el editor sería mostrarle a su
 * pareja una versión vieja sin que nadie se lo diga, que es peor que no poder
 * copiar. Mientras se crea una, tampoco: un doble clic crearía dos ligas.
 */
export function estadoDelBoton(e: { dirty: boolean; pendiente: boolean }): {
  deshabilitado: boolean;
  /** Explicación visible cuando la causa es que hay algo por hacer (guardar). */
  motivo: string | null;
} {
  if (e.dirty) return { deshabilitado: true, motivo: AVISO_CAMBIOS_SIN_GUARDAR };
  if (e.pendiente) return { deshabilitado: true, motivo: null };
  return { deshabilitado: false, motivo: null };
}

export function mensajeDeLigaCopiada(
  expiresAt: string,
  ahora: Date = new Date(),
): string {
  return `Liga copiada. Vence en ${textoDeDias(diasRestantes(expiresAt, ahora))}.`;
}

export function mensajeDeRevocadas(n: number): string {
  if (n <= 0) return "No había ligas vigentes que revocar.";
  if (n === 1) return "Se revocó 1 liga.";
  return `Se revocaron ${n} ligas.`;
}
