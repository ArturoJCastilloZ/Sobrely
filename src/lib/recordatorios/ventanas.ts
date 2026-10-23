/**
 * Cuándo toca un recordatorio. PURO: sin base de datos, sin reloj propio.
 *
 * Tres tipos, de más a menos urgente:
 *   - `evento_7d`    el evento es en los próximos 7 días y sigue sin publicar.
 *   - `borrador_3d`  lleva entre 3 y 7 días sin tocarse.
 *   - `borrador_24h` lleva entre 24 h y 3 días sin tocarse.
 *
 * Las ventanas están ACOTADAS por arriba a propósito. Sin tope, el primer envío
 * tras activar el cron le escribiría a todo borrador abandonado desde hace meses:
 * un correo de «¿sigues con tu invitación?» a alguien que se fue hace 90 días es
 * justo el correo que la gente marca como spam. Un borrador más viejo que 7 días
 * (y sin evento cercano) simplemente ya no recibe nada.
 */
export type TipoRecordatorio = "borrador_24h" | "borrador_3d" | "evento_7d";

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

export const VENTANAS = {
  borrador24hDesde: 24 * HORA,
  borrador3dDesde: 72 * HORA,
  /** Pasado esto, un borrador sin evento cercano ya no recibe recordatorios. */
  borradorHasta: 7 * DIA,
  eventoDentroDe: 7 * DIA,
} as const;

/** Orden de prioridad cuando una persona tiene varios candidatos en la misma corrida. */
export const PRIORIDAD: readonly TipoRecordatorio[] = [
  "evento_7d",
  "borrador_3d",
  "borrador_24h",
];

function ms(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const t = new Date(valor).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * ¿Qué recordatorio toca para este borrador, si alguno?
 *
 * - Un evento YA PASADO anula todo: la invitación dejó de tener sentido.
 * - Con el evento dentro de 7 días, SOLO cuenta `evento_7d`: ese correo habla de
 *   la fecha, que es lo urgente, y no se le suma uno de «llevas días sin
 *   entrar» sobre la misma invitación.
 * - Una fecha ilegible cuenta como «sin fecha»; una `updatedAt` ilegible o en el
 *   futuro (reloj desfasado) no da recordatorio: ante la duda, silencio.
 * - Lo ya enviado nunca se repite.
 */
export function tipoDeRecordatorio(e: {
  ahora: Date;
  actualizadoEn: string;
  fechaEvento: string | null;
  yaEnviados: ReadonlySet<TipoRecordatorio>;
}): TipoRecordatorio | null {
  const ahora = e.ahora.getTime();
  const evento = ms(e.fechaEvento);

  if (evento !== null && evento <= ahora) return null;

  if (evento !== null && evento - ahora <= VENTANAS.eventoDentroDe) {
    return e.yaEnviados.has("evento_7d") ? null : "evento_7d";
  }

  const actualizado = ms(e.actualizadoEn);
  if (actualizado === null) return null;
  const inactivo = ahora - actualizado;
  if (inactivo < VENTANAS.borrador24hDesde) return null;
  if (inactivo >= VENTANAS.borradorHasta) return null;

  const tipo: TipoRecordatorio =
    inactivo >= VENTANAS.borrador3dDesde ? "borrador_3d" : "borrador_24h";
  return e.yaEnviados.has(tipo) ? null : tipo;
}

/** Días enteros (hacia arriba) hasta el evento; null si no hay fecha futura. */
export function diasParaElEvento(fechaEvento: string | null, ahora: Date): number | null {
  const evento = ms(fechaEvento);
  if (evento === null || evento <= ahora.getTime()) return null;
  return Math.ceil((evento - ahora.getTime()) / DIA);
}
