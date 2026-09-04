import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityItem } from "@/lib/dashboard/metrics";

/** Iniciales para el avatar (una o dos, sin depender de apellidos). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "hace 3 días" — en español, sin arrastrar una librería de fechas. */
function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = now.getTime() - then;
  if (diffMs < 0) return "ahora";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;

  const months = Math.floor(days / 30);
  return months === 1 ? "hace un mes" : `hace ${months} meses`;
}

const VERB: Record<ActivityItem["kind"], string> = {
  confirmed: "Confirmó",
  declined: "No podrá asistir",
  maybe: "Respondió tal vez",
};

const DOT: Record<ActivityItem["kind"], string> = {
  confirmed: "bg-emerald-500 dark:bg-emerald-400",
  declined: "bg-red-500 dark:bg-red-400",
  maybe: "bg-amber-500 dark:bg-amber-400",
};

export function ActivityFeed({
  items,
  now,
}: {
  items: ActivityItem[];
  /** Se recibe del servidor para que el render sea determinista. */
  now: string;
}) {
  const nowDate = new Date(now);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>
        <CardDescription>Últimas confirmaciones y rechazos</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no hay respuestas. Aquí van a aparecer en cuanto alguien
            conteste.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li
                key={`${item.name}-${item.at}-${i}`}
                className="flex items-start gap-3"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground"
                  aria-hidden="true"
                >
                  {initials(item.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                    {item.changed ? (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        Cambio
                      </Badge>
                    ) : null}
                    {item.checkedIn ? (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                        Ingresó
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${DOT[item.kind]}`}
                      aria-hidden="true"
                    />
                    <span>
                      {VERB[item.kind]}
                      {item.people !== null && item.people > 0
                        ? ` · ${item.people} ${item.people === 1 ? "lugar" : "lugares"}`
                        : ""}
                      {" · "}
                      {relativeTime(item.at, nowDate)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
