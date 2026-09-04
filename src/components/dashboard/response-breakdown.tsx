import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { shareOf, type EventFunnel } from "@/lib/dashboard/metrics";

/**
 * Distribución de respuestas: una sola barra apilada más una tarjeta por
 * estado.
 *
 * Sin gráfica de pastel y sin leyenda aparte — los puntos de color de las
 * tarjetas hacen de leyenda. Cada tarjeta dice el número, su porcentaje y la
 * CONSECUENCIA ("65 asistentes", "sin asistencia"), que es lo que el
 * organizador necesita para decidir.
 */

type Segment = {
  key: string;
  label: string;
  count: number;
  consequence: string;
  /** Clase de relleno para la barra. */
  bar: string;
  /** Clase de color para el punto de la tarjeta. */
  dot: string;
};

function segmentsFor(funnel: EventFunnel): Segment[] {
  const segments: Segment[] = [
    {
      key: "confirmed",
      label: "Confirmados",
      count: funnel.confirmed,
      consequence:
        funnel.attendees > 0 ? `${funnel.attendees} asistentes` : "sin asistentes aún",
      bar: "bg-emerald-500 dark:bg-emerald-400",
      dot: "bg-emerald-500 dark:bg-emerald-400",
    },
    {
      key: "declined",
      label: "Declinados",
      count: funnel.declined,
      consequence: "sin asistencia",
      bar: "bg-red-500 dark:bg-red-400",
      dot: "bg-red-500 dark:bg-red-400",
    },
  ];

  if (funnel.pending !== null) {
    segments.push({
      key: "pending",
      label: "Sin responder",
      count: funnel.pending,
      consequence: "aún no contestan",
      bar: "bg-amber-500 dark:bg-amber-400",
      dot: "bg-amber-500 dark:bg-amber-400",
    });
  }
  if (funnel.maybe !== null) {
    segments.push({
      key: "maybe",
      label: "Tal vez",
      count: funnel.maybe,
      consequence: "sin decidir",
      bar: "bg-amber-500 dark:bg-amber-400",
      dot: "bg-amber-500 dark:bg-amber-400",
    });
  }

  return segments;
}

export function ResponseBreakdown({ funnel }: { funnel: EventFunnel }) {
  const segments = segmentsFor(funnel);
  const base = funnel.registered ?? funnel.responded;

  const subtitle =
    funnel.mode === "guest_list"
      ? funnel.responseRate === null
        ? "Agrega invitados para ver el avance"
        : `${funnel.responded} de ${base} han respondido · Tasa ${Math.round(
            funnel.responseRate * 100,
          )}%`
      : `${funnel.responded} ${funnel.responded === 1 ? "respuesta" : "respuestas"} por el enlace público`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de respuestas</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={segments
            .map((s) => `${s.label}: ${s.count}`)
            .join(", ")}
        >
          {base > 0
            ? segments
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div
                    key={s.key}
                    className={s.bar}
                    style={{ width: `${(s.count / base) * 100}%` }}
                  />
                ))
            : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {segments.map((s) => (
            <div key={s.key} className="rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${s.dot}`}
                  aria-hidden="true"
                />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums leading-none">
                {s.count}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {base > 0 ? `${Math.round(shareOf(funnel, s.count))}% · ` : ""}
                {s.consequence}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
