/**
 * A quién hay que recordarle, y a quién NO — lógica pura.
 *
 * El recordatorio parece trivial ("mándale a los que no han contestado") y no
 * lo es: hay cuatro razones distintas por las que alguien sigue sin responder,
 * y tres de ellas NO se arreglan con un recordatorio.
 *
 *  * **Nunca se le envió la invitación.** Recordarle sería absurdo: no ha
 *    recibido nada. Lo que necesita es la invitación, no un empujón. El panel
 *    ya hace esta distinción en su `nextAction`; aquí se sostiene igual.
 *  * **No tiene teléfono usable.** No hay por dónde escribirle. Se dice, en vez
 *    de esconderlo: el organizador puede capturarle el número.
 *  * **Ya se le recordó hace un rato.** Insistir el mismo día molesta y quema
 *    la buena voluntad del invitado, que es un recurso del anfitrión.
 *  * **Ya respondió.** Confirmó o declinó; no se le vuelve a escribir.
 *
 * Que esto viva aparte y sin React es a propósito: es la regla de negocio del
 * recordatorio, y se prueba sin navegador ni base.
 */
import { isReachableByWhatsApp } from "./whatsapp";

/**
 * Cuánto esperar antes de volver a recordarle a la misma persona.
 *
 * 24 h no sale de una medición, es un juicio: es el intervalo por debajo del
 * cual un segundo mensaje se lee como insistencia y no como cortesía. Se
 * declara aquí, con nombre, para poder discutirlo y cambiarlo en un solo lugar.
 */
export const REMINDER_COOLDOWN_HOURS = 24;

/** Lo que el recordatorio necesita de un invitado. Nada más. */
export interface RemindableGuest {
  id: string;
  name: string;
  status: "pending" | "confirmed" | "declined";
  phone: string | null;
  /** `null` = todavía no se le manda la invitación. */
  invited_at: string | null;
  /** Último recordatorio enviado. `null` = ninguno. */
  reminded_at: string | null;
}

/** Por qué un invitado no entra en la tanda de recordatorios. */
export type SkipReason =
  | "ya_respondio"
  | "sin_invitacion"
  | "sin_telefono"
  | "recordado_reciente";

/**
 * Genérico en `T` a propósito: el módulo declara el MÍNIMO que necesita para
 * decidir (`RemindableGuest`) pero devuelve las filas tal como se las dieron,
 * con todos sus campos. Si devolviera el tipo estrecho, quien lo llama tendría
 * que volver a buscar cada invitado en su lista para pintar el nombre o armar
 * su enlace — y ahí es donde se cuela el bug de emparejar mal.
 */
export interface ReminderPlan<T extends RemindableGuest = RemindableGuest> {
  /** A estos sí se les puede escribir ahora mismo. */
  listos: T[];
  /** Los demás, con el motivo. Se exponen para poder DECIRLO en la UI. */
  omitidos: { guest: T; reason: SkipReason }[];
}

/** Horas transcurridas desde un ISO. `Infinity` si nunca ocurrió. */
function horasDesde(iso: string | null, now: Date): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (now.getTime() - t) / 3_600_000;
}

/**
 * Reparte la lista entre quién recibe recordatorio y quién no.
 *
 * El orden de los motivos importa y no es arbitrario: se evalúa del hecho más
 * definitivo al más temporal. Quien ya respondió no necesita teléfono ni
 * espera; quien nunca recibió la invitación no está "pendiente de recordar"
 * aunque tenga teléfono. Reportar el primer motivo real evita decirle al
 * organizador "no tiene teléfono" sobre alguien que además ya confirmó.
 */
export function planReminders<T extends RemindableGuest>(
  guests: readonly T[],
  now: Date = new Date(),
): ReminderPlan<T> {
  const listos: T[] = [];
  const omitidos: { guest: T; reason: SkipReason }[] = [];

  for (const g of guests) {
    if (g.status !== "pending") {
      omitidos.push({ guest: g, reason: "ya_respondio" });
      continue;
    }
    if (!g.invited_at) {
      omitidos.push({ guest: g, reason: "sin_invitacion" });
      continue;
    }
    if (!isReachableByWhatsApp(g.phone)) {
      omitidos.push({ guest: g, reason: "sin_telefono" });
      continue;
    }
    if (horasDesde(g.reminded_at, now) < REMINDER_COOLDOWN_HOURS) {
      omitidos.push({ guest: g, reason: "recordado_reciente" });
      continue;
    }
    listos.push(g);
  }

  return { listos, omitidos };
}

/** Cuántos hay por cada motivo de omisión. Para resumir sin recorrer en la UI. */
export function countByReason(
  plan: ReminderPlan<RemindableGuest>,
): Record<SkipReason, number> {
  const base: Record<SkipReason, number> = {
    ya_respondio: 0,
    sin_invitacion: 0,
    sin_telefono: 0,
    recordado_reciente: 0,
  };
  for (const o of plan.omitidos) base[o.reason] += 1;
  return base;
}

/**
 * Qué decirle al organizador cuando NO hay nadie a quien recordar.
 *
 * El caso vacío tiene cuatro significados opuestos y un "no hay nadie" seco los
 * confunde todos. Si a nadie se le ha enviado la invitación, el consejo es
 * ENVIAR. Si a todos se les recordó hoy, es ESPERAR. Si nadie tiene teléfono,
 * es CAPTURAR números. Y si ya todos respondieron, no hay nada que hacer y hay
 * que decirlo como buena noticia.
 */
export function emptyReminderMessage(
  plan: ReminderPlan<RemindableGuest>,
): string {
  const n = countByReason(plan);
  const totalOmitidos = plan.omitidos.length;

  if (totalOmitidos === 0) return "Todavía no hay invitados en la lista.";
  if (n.ya_respondio === totalOmitidos) {
    return "Ya todos respondieron. No hay a quién recordarle.";
  }
  if (n.sin_invitacion > 0 && n.sin_invitacion >= n.sin_telefono) {
    return n.sin_invitacion === 1
      ? "Falta 1 invitado a quien todavía no le envías su invitación. Mándasela antes de recordarle."
      : `Faltan ${n.sin_invitacion} invitados a quienes todavía no les envías su invitación. Mándasela antes de recordarles.`;
  }
  if (n.sin_telefono > 0) {
    return n.sin_telefono === 1
      ? "1 invitado sin responder no tiene WhatsApp capturado. Agrégale su número para poder recordarle."
      : `${n.sin_telefono} invitados sin responder no tienen WhatsApp capturado. Agrégales su número para poder recordarles.`;
  }
  if (n.recordado_reciente > 0) {
    return `Ya les recordaste hace menos de ${REMINDER_COOLDOWN_HOURS} horas. Dales un poco de tiempo antes de volver a escribirles.`;
  }
  return "No hay a quién recordarle por ahora.";
}
