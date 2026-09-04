"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildSeries, type DatedOutcome } from "@/lib/dashboard/metrics";

/**
 * Evolución acumulada de confirmaciones y rechazos.
 *
 * SVG a mano a propósito: una librería de gráficas serían ~50 kB de JS para
 * dibujar dos polilíneas. La serie la calcula `buildSeries`, que está probada.
 */

const RANGES = [
  { key: "7d", label: "7d", days: 7 },
  { key: "1m", label: "1m", days: 30 },
  { key: "3m", label: "3m", days: 90 },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

/** Geometría del lienzo, en unidades del viewBox. */
const W = 320;
const H = 120;
const PAD = { top: 10, right: 6, bottom: 18, left: 26 };

function formatDay(day: string): string {
  // `day` viene como YYYY-MM-DD (UTC); se formatea en UTC para no correrse un día.
  return new Date(`${day}T12:00:00.000Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function ConfirmationsChart({
  outcomes,
  now,
}: {
  outcomes: DatedOutcome[];
  /** ISO del servidor: mantiene el render determinista en la hidratación. */
  now: string;
}) {
  const [range, setRange] = useState<RangeKey>("1m");
  const days = RANGES.find((r) => r.key === range)!.days;

  const series = useMemo(
    () => buildSeries(outcomes, days, new Date(now)),
    [outcomes, days, now],
  );

  const last = series[series.length - 1];
  const peak = Math.max(last?.confirmed ?? 0, last?.declined ?? 0);
  // Techo mínimo de 1 para no dividir entre cero en un evento sin respuestas.
  const ceiling = Math.max(peak, 1);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / ceiling) * innerH;

  const line = (pick: (p: (typeof series)[number]) => number) =>
    series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(pick(p))}`).join(" ");

  const confirmedLine = line((p) => p.confirmed);
  const declinedLine = line((p) => p.declined);
  const area = `${confirmedLine} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const hasAny = peak > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmaciones a lo largo del tiempo</CardTitle>
        <CardDescription>
          Evolución de confirmaciones y rechazos
        </CardDescription>
        <div
          className="col-start-2 row-span-2 row-start-1 flex gap-1 self-start rounded-md bg-muted p-0.5"
          role="group"
          aria-label="Rango de tiempo"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                range === r.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin respuestas todavía en este rango.
          </p>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Acumulado del rango: ${last.confirmed} confirmaciones y ${last.declined} rechazos.`}
            >
              {/* Rejilla: solo el techo y la base, rotuladas con valores reales. */}
              <line
                x1={PAD.left}
                y1={y(ceiling)}
                x2={W - PAD.right}
                y2={y(ceiling)}
                className="stroke-border"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <line
                x1={PAD.left}
                y1={y(0)}
                x2={W - PAD.right}
                y2={y(0)}
                className="stroke-border"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 5}
                y={y(ceiling) + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[8px] tabular-nums"
              >
                {ceiling}
              </text>
              <text
                x={PAD.left - 5}
                y={y(0) + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[8px] tabular-nums"
              >
                0
              </text>

              <path
                d={area}
                className="fill-emerald-500/12 dark:fill-emerald-400/15"
              />
              <path
                d={confirmedLine}
                fill="none"
                className="stroke-emerald-500 dark:stroke-emerald-400"
                strokeWidth="1.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {last.declined > 0 ? (
                <path
                  d={declinedLine}
                  fill="none"
                  className="stroke-red-500 dark:stroke-red-400"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}

              {/* Punto final destacado: el estado de hoy. */}
              <circle
                cx={x(series.length - 1)}
                cy={y(last.confirmed)}
                r="2.5"
                className="fill-emerald-500 dark:fill-emerald-400"
              />

              <text
                x={PAD.left}
                y={H - 5}
                className="fill-muted-foreground text-[8px]"
              >
                {formatDay(series[0].day)}
              </text>
              <text
                x={W - PAD.right}
                y={H - 5}
                textAnchor="end"
                className="fill-muted-foreground text-[8px]"
              >
                {formatDay(last.day)}
              </text>
            </svg>

            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
                  aria-hidden="true"
                />
                {last.confirmed} confirmaciones
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full bg-red-500 dark:bg-red-400"
                  aria-hidden="true"
                />
                {last.declined} rechazos
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
