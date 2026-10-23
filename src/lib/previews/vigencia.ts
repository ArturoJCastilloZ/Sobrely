/**
 * Vigencia y estado de las ligas de vista previa: la parte PURA y segura para el
 * navegador.
 *
 * Vive aparte de `token.ts` por una razón concreta: `token.ts` importa
 * `node:crypto`, y un componente de cliente que quisiera la constante de 7 días
 * (o los días restantes de una liga) arrastraría `crypto` al paquete del
 * navegador. Aquí no hay nada de Node: lo importan tanto el servidor como el
 * cliente. `token.ts` lo re-exporta, así que ninguna importación existente cambia.
 */
export const VIGENCIA_DIAS = 7;
export const MAX_LIGAS_VIGENTES = 10;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function calcularVencimiento(ahora: Date = new Date()): Date {
  return new Date(ahora.getTime() + VIGENCIA_DIAS * MS_POR_DIA);
}

export type EstadoDeLiga = "vigente" | "vencida" | "revocada";

/**
 * Estado de una liga. La revocación manda sobre el vencimiento: una liga
 * revocada que además venció se reporta como revocada (es lo que el anfitrión
 * hizo). Un vencimiento ILEGIBLE cuenta como vencida: ante la duda, cerrada.
 */
export function estadoDeLiga(
  liga: { expires_at: string; revoked_at: string | null },
  ahora: Date = new Date(),
): EstadoDeLiga {
  if (liga.revoked_at) return "revocada";
  const vence = new Date(liga.expires_at).getTime();
  if (Number.isNaN(vence)) return "vencida";
  return vence > ahora.getTime() ? "vigente" : "vencida";
}

/** Días enteros que le quedan a una liga (0 si venció). Para el banner y los avisos. */
export function diasRestantes(expiresAt: string, ahora: Date = new Date()): number {
  const vence = new Date(expiresAt).getTime();
  if (Number.isNaN(vence)) return 0;
  return Math.max(0, Math.ceil((vence - ahora.getTime()) / MS_POR_DIA));
}

/** «1 día» / «7 días»: el plural correcto, sin que cada pantalla lo reescriba. */
export function textoDeDias(dias: number): string {
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}
