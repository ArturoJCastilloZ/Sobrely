/**
 * Generador de archivos .ics (iCalendar) — 100% local, sin llamadas externas.
 * Sirve para "Añadir a calendario" (Apple, Google, Outlook leen .ics).
 */

export type IcsEvent = {
  /** Identificador único y estable del evento (p. ej. el token del invitado). */
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  /** Marca de generación; por defecto = start (para salida determinista/testeable). */
  stamp?: Date;
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Formatea una fecha a UTC en el formato iCal `YYYYMMDDTHHMMSSZ`. */
export function toIcsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Escapa los caracteres especiales de iCal en un valor de texto. */
export function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Construye el contenido de un archivo .ics con un solo VEVENT. */
export function buildIcs(ev: IcsEvent): string {
  const stamp = ev.stamp ?? ev.start;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sobrely//Invitaciones//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${toIcsUtc(stamp)}`,
    `DTSTART:${toIcsUtc(ev.start)}`,
    `DTEND:${toIcsUtc(ev.end)}`,
    `SUMMARY:${escapeIcsText(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  // iCal exige CRLF como separador de línea.
  return lines.join("\r\n");
}
