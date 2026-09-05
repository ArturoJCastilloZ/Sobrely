/**
 * Qué ve quien abre un reporte compartido — y sobre todo, qué NO ve.
 *
 * La liga se le da al banquete, al salón o a los novios. Ninguno de ellos
 * necesita la lista de invitados: necesitan el NÚMERO. Así que este módulo
 * existe para que el recorte sea explícito y probable, en vez de depender de
 * que quien escriba la página se acuerde de no pintar los nombres.
 *
 * La regla: aquí solo entran agregados. Si algún día alguien quiere sumar los
 * nombres al reporte, tiene que cambiar este tipo a propósito — y ahí es donde
 * se decide, no en un `.tsx`.
 */
import type { EventFunnel } from "@/lib/dashboard/metrics";

/** Lo que el reporte publica del evento. Deliberadamente escueto. */
export interface ReportEvent {
  title: string;
  /** `Boda`, `XV años`… Sirve de contexto y no identifica a nadie. */
  eventType: string | null;
  /** ISO de la fecha del evento, o `null` si no se capturó. */
  eventDate: string | null;
  /** Nombre público del anfitrión: quien recibe la liga ya sabe de quién es. */
  hostName: string | null;
}

/** El reporte completo tal como viaja al navegador de quien tiene el PIN. */
export interface SharedReport {
  event: ReportEvent;
  funnel: EventFunnel;
  /** Cuándo se calcularon las cifras. Un reporte sin hora engaña. */
  generatedAt: string;
}

/**
 * Fila de `invitations` que necesita el reporte. Se declara aparte y estrecha
 * para que un `select("*")` no arrastre `theme_config`, `user_id` y demás al
 * payload público por descuido.
 */
export interface ReportInvitationRow {
  title: string | null;
  event_type: string | null;
  event_date: string | null;
}

/**
 * Arma el reporte. Es puro: recibe el embudo YA calculado por
 * `funnelFromGuests` / `funnelFromResponses`, no lo recalcula.
 *
 * Que reuse el mismo embudo del panel del anfitrión no es pereza, es la razón
 * de ser: si el reporte compartido calculara sus propios números, tarde o
 * temprano diría algo distinto de lo que ve el dueño en su panel, y ese es
 * justo el bug que nadie descubre hasta que el banquete cobra de más.
 */
export function buildSharedReport(
  invitation: ReportInvitationRow,
  funnel: EventFunnel,
  hostName: string | null,
  now: Date = new Date(),
): SharedReport {
  return {
    event: {
      title: invitation.title?.trim() || "Evento",
      eventType: invitation.event_type?.trim() || null,
      eventDate: invitation.event_date ?? null,
      hostName: hostName?.trim() || null,
    },
    funnel,
    generatedAt: now.toISOString(),
  };
}

/**
 * El número que de verdad importa para contratar: PERSONAS que asistirán.
 *
 * Se expone como función y no como texto en la página porque es la cifra que
 * alguien va a usar para pagar comida, y conviene que tenga una sola
 * definición: confirmados, contando acompañantes.
 */
export function headlineAttendees(report: SharedReport): number {
  return report.funnel.attendees;
}

/**
 * Motivos por los que una liga no abre. Se enumeran para que la página diga
 * algo distinto en cada caso sin inventar texto suelto.
 *
 * `not_found` unifica «el token no existe» con «el token fue revocado», y eso
 * es deliberado: distinguirlos le confirmaría a quien prueba tokens al azar
 * cuáles llegaron a existir. En cambio «PIN incorrecto» SÍ se distingue, porque
 * para ese punto ya se demostró tener el token — y quien tecleó mal su PIN
 * necesita saber que el problema es el PIN, no la liga.
 */
export type ReportDenial =
  | { reason: "not_found" }
  | { reason: "locked"; minutesLeft: number }
  | { reason: "bad_pin"; attemptsLeft: number }
  | { reason: "invalid_pin_format" };
