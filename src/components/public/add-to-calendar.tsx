"use client";

import { buildIcs } from "@/lib/calendar/ics";

/**
 * Botón "Añadir a calendario": genera un .ics LOCAL y lo descarga. Compatible
 * con Apple Calendar, Google Calendar y Outlook. Cero llamadas externas.
 */
export function AddToCalendar({
  uid,
  title,
  description,
  location,
  startIso,
  durationHours = 3,
  className,
}: {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  /** Fecha del evento en ISO. Si es inválida o vacía, el botón no se muestra. */
  startIso: string;
  durationHours?: number;
  className?: string;
}) {
  const start = startIso ? new Date(startIso) : null;
  if (!start || Number.isNaN(start.getTime())) return null;

  function download() {
    const startDate = new Date(startIso);
    const end = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
    const ics = buildIcs({
      uid,
      title,
      description,
      location,
      start: startDate,
      end,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <button
      type="button"
      onClick={download}
      className={
        className ??
        "inline-flex h-11 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--inv-text)_35%,transparent)] px-5 text-base font-medium transition-opacity hover:opacity-80 @4xl/inv:h-12 @4xl/inv:text-lg"
      }
    >
      Añadir a calendario
    </button>
  );
}
