/**
 * Métricas del panel del evento — lógica pura, sin Supabase ni React.
 *
 * El panel sirve DOS modos de RSVP con fuentes distintas, y la diferencia no es
 * cosmética:
 *
 *  * `guest_list` — el organizador arma la lista (`invitation_guests`), así que
 *    existe un DENOMINADOR: se sabe a cuántos se invitó y cuántos faltan. El
 *    embudo completo tiene sentido.
 *  * `open` — enlace público (`rsvp_responses`): cualquiera responde y no hay
 *    lista previa. NO hay denominador, así que la "tasa de respuesta" no existe.
 *    Se devuelve `null` en esos campos en vez de inventar un porcentaje sobre
 *    una base que no significa nada.
 *
 * Los porcentajes por estado van sobre el total de la lista (igual que el
 * `Avance`), no sobre los que ya respondieron: así los tres suman el 100 % del
 * evento y el hueco que falta se ve.
 */

export type RsvpMode = "guest_list" | "open";

export type GuestStatus = "pending" | "confirmed" | "declined";

/** Fila de `invitation_guests` — solo lo que consumen las métricas. */
export interface GuestRow {
  name: string;
  status: GuestStatus;
  max_guests: number;
  confirmed_count: number | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fila de `rsvp_responses` — solo lo que consumen las métricas. */
export interface ResponseRow {
  guest_name: string;
  /** `yes` | `no` | `maybe` */
  attendance_status: string;
  guest_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventFunnel {
  mode: RsvpMode;
  /** Contactos en la lista. `null` en modo abierto: no hay lista previa. */
  registered: number | null;
  /** Cuántos ya dieron una respuesta. */
  responded: number;
  /** `responded / registered` en 0..1. `null` sin denominador. */
  responseRate: number | null;
  confirmed: number;
  declined: number;
  /** Aún sin responder. `null` en modo abierto. */
  pending: number | null;
  /** "Tal vez" — solo existe en modo abierto. */
  maybe: number | null;
  /** PERSONAS que asistirán, contando acompañantes. El número del banquete. */
  attendees: number;
  /** Lugares apartados en la lista. `null` en modo abierto. */
  allotted: number | null;
  /** Ya ingresaron por la puerta. `null` en modo abierto. */
  checkedIn: number | null;
}

/** Embudo del modo lista de invitados. */
export function funnelFromGuests(guests: readonly GuestRow[]): EventFunnel {
  const registered = guests.length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const declined = guests.filter((g) => g.status === "declined").length;
  const pending = guests.filter((g) => g.status === "pending").length;
  const responded = confirmed + declined;

  return {
    mode: "guest_list",
    registered,
    responded,
    // Sin nadie en la lista no hay tasa que reportar (evita 0/0 = NaN).
    responseRate: registered > 0 ? responded / registered : null,
    confirmed,
    declined,
    pending,
    maybe: null,
    attendees: guests
      .filter((g) => g.status === "confirmed")
      .reduce((sum, g) => sum + (g.confirmed_count ?? 0), 0),
    allotted: guests.reduce((sum, g) => sum + g.max_guests, 0),
    checkedIn: guests.filter((g) => g.checked_in_at).length,
  };
}

/** Embudo del modo abierto. Sin lista previa: no hay tasa ni pendientes. */
export function funnelFromResponses(
  responses: readonly ResponseRow[],
): EventFunnel {
  const confirmed = responses.filter(
    (r) => r.attendance_status === "yes",
  ).length;
  const declined = responses.filter((r) => r.attendance_status === "no").length;
  const maybe = responses.filter(
    (r) => r.attendance_status === "maybe",
  ).length;

  return {
    mode: "open",
    registered: null,
    // En abierto, cada fila ES una respuesta.
    responded: responses.length,
    responseRate: null,
    confirmed,
    declined,
    pending: null,
    maybe,
    attendees: responses
      .filter((r) => r.attendance_status === "yes")
      .reduce((sum, r) => sum + (r.guest_count ?? 0), 0),
    allotted: null,
    checkedIn: null,
  };
}

/**
 * Base sobre la que se calculan los porcentajes por estado: la lista completa
 * cuando existe, y el total de respuestas cuando no.
 */
export function shareBase(funnel: EventFunnel): number {
  return funnel.registered ?? funnel.responded;
}

/** Porcentaje 0..100 de `count` sobre la base del embudo. 0 si no hay base. */
export function shareOf(funnel: EventFunnel, count: number): number {
  const base = shareBase(funnel);
  return base > 0 ? (count / base) * 100 : 0;
}

export interface SeriesPoint {
  /** Día en `YYYY-MM-DD` (UTC). */
  day: string;
  /** Confirmaciones ACUMULADAS hasta ese día. */
  confirmed: number;
  /** Rechazos ACUMULADOS hasta ese día. */
  declined: number;
}

export interface DatedOutcome {
  /** ISO del momento en que respondió. */
  at: string;
  kind: "confirmed" | "declined";
}

/** Día UTC de un ISO, en `YYYY-MM-DD`. */
function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Serie ACUMULADA de los últimos `days` días, un punto por día e incluyendo
 * los días sin movimiento (para que la línea no invente pendientes).
 *
 * Lo ocurrido ANTES de la ventana no se pierde: entra como el valor inicial,
 * así el primer punto ya arranca en el acumulado real y no en cero.
 */
export function buildSeries(
  outcomes: readonly DatedOutcome[],
  days: number,
  now: Date = new Date(),
): SeriesPoint[] {
  const dayMs = 86_400_000;
  const endDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startMs = endDay.getTime() - (days - 1) * dayMs;

  const perDay = new Map<string, { confirmed: number; declined: number }>();
  let baseConfirmed = 0;
  let baseDeclined = 0;

  for (const o of outcomes) {
    const t = new Date(o.at).getTime();
    if (Number.isNaN(t)) continue;
    if (t > endDay.getTime() + dayMs - 1) continue; // futuro: se ignora
    if (t < startMs) {
      // Anterior a la ventana → acumulado de arranque.
      if (o.kind === "confirmed") baseConfirmed++;
      else baseDeclined++;
      continue;
    }
    const key = dayKey(o.at);
    const slot = perDay.get(key) ?? { confirmed: 0, declined: 0 };
    if (o.kind === "confirmed") slot.confirmed++;
    else slot.declined++;
    perDay.set(key, slot);
  }

  const points: SeriesPoint[] = [];
  let runningConfirmed = baseConfirmed;
  let runningDeclined = baseDeclined;

  for (let i = 0; i < days; i++) {
    const day = new Date(startMs + i * dayMs).toISOString().slice(0, 10);
    const slot = perDay.get(day);
    runningConfirmed += slot?.confirmed ?? 0;
    runningDeclined += slot?.declined ?? 0;
    points.push({
      day,
      confirmed: runningConfirmed,
      declined: runningDeclined,
    });
  }

  return points;
}

export interface ActivityItem {
  name: string;
  kind: "confirmed" | "declined" | "maybe";
  /** ISO de la respuesta. */
  at: string;
  /** Personas que trae, cuando se sabe. */
  people: number | null;
  /**
   * Respondió y luego cambió de opinión. Heurística: `updated_at` posterior a
   * `created_at`. No dice DE QUÉ estado venía — para eso hace falta historial;
   * mientras no exista, esto marca el cambio sin afirmar el anterior.
   */
  changed: boolean;
  checkedIn: boolean;
}

/** Umbral para no marcar "cambió" por el jitter del trigger de `updated_at`. */
const CHANGE_THRESHOLD_MS = 2000;

function didChange(createdAt: string, updatedAt: string): boolean {
  const a = new Date(createdAt).getTime();
  const b = new Date(updatedAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b - a > CHANGE_THRESHOLD_MS;
}

/** Actividad reciente del modo lista, de la respuesta más nueva a la más vieja. */
export function activityFromGuests(
  guests: readonly GuestRow[],
  limit = 8,
): ActivityItem[] {
  return guests
    .filter((g) => g.status !== "pending")
    .map<ActivityItem>((g) => ({
      name: g.name,
      kind: g.status === "confirmed" ? "confirmed" : "declined",
      at: g.updated_at,
      people: g.status === "confirmed" ? (g.confirmed_count ?? 0) : null,
      changed: didChange(g.created_at, g.updated_at),
      checkedIn: !!g.checked_in_at,
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** Actividad reciente del modo abierto. */
export function activityFromResponses(
  responses: readonly ResponseRow[],
  limit = 8,
): ActivityItem[] {
  const kindOf = (s: string): ActivityItem["kind"] =>
    s === "yes" ? "confirmed" : s === "no" ? "declined" : "maybe";

  return responses
    .map<ActivityItem>((r) => ({
      name: r.guest_name,
      kind: kindOf(r.attendance_status),
      at: r.updated_at || r.created_at,
      people: r.attendance_status === "yes" ? (r.guest_count ?? 0) : null,
      changed: didChange(r.created_at, r.updated_at || r.created_at),
      checkedIn: false,
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** Serie del modo lista: la fecha de respuesta es `updated_at`. */
export function outcomesFromGuests(
  guests: readonly GuestRow[],
): DatedOutcome[] {
  return guests
    .filter((g) => g.status !== "pending")
    .map((g) => ({
      at: g.updated_at,
      kind: g.status === "confirmed" ? ("confirmed" as const) : ("declined" as const),
    }));
}

/** Serie del modo abierto: "tal vez" no entra, no es confirmación ni rechazo. */
export function outcomesFromResponses(
  responses: readonly ResponseRow[],
): DatedOutcome[] {
  return responses
    .filter((r) => r.attendance_status === "yes" || r.attendance_status === "no")
    .map((r) => ({
      at: r.created_at,
      kind:
        r.attendance_status === "yes"
          ? ("confirmed" as const)
          : ("declined" as const),
    }));
}

/**
 * El empujón: la única acción que importa según el estado del evento. Es lo que
 * convierte el panel en herramienta en vez de reporte.
 */
export function nextAction(
  funnel: EventFunnel,
): { label: string; tone: "wait" | "ok" } | null {
  if (funnel.mode === "open") {
    if (funnel.responded === 0) {
      return { label: "Comparte el enlace para recibir la primera confirmación", tone: "wait" };
    }
    return null;
  }
  if ((funnel.registered ?? 0) === 0) {
    return { label: "Agrega a tus invitados para empezar", tone: "wait" };
  }
  const pending = funnel.pending ?? 0;
  if (pending === 0) {
    return { label: "Ya respondieron todos tus invitados", tone: "ok" };
  }
  if (pending === 1) {
    return { label: "Recuérdale al invitado que falta", tone: "wait" };
  }
  return { label: `Recuérdales a los ${pending} que faltan`, tone: "wait" };
}
