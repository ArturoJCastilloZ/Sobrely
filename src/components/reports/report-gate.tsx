"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FunnelKpis } from "@/components/dashboard/funnel-kpis";
import { openReport } from "@/lib/reports/actions";
import { PIN_LENGTH } from "@/lib/reports/constants";
import type { SharedReport } from "@/lib/reports/report";

/**
 * La puerta del reporte: pide el PIN y, si acierta, muestra las cifras.
 *
 * El reporte NO se guarda en `localStorage` ni en una cookie. Quien recarga
 * vuelve a teclear su PIN. Es una molestia pequeña a cambio de que la liga
 * abierta en un celular prestado no quede abierta para siempre.
 */
export function ReportGate({ token }: { token: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [report, setReport] = useState<SharedReport | null>(null);
  /** Bloqueada: se apaga el formulario, porque insistir no sirve de nada. */
  const [bloqueado, setBloqueado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError(null);

    const res = await openReport(token, pin);
    setEnviando(false);

    if (res.ok) {
      setReport(res.report);
      return;
    }

    switch (res.reason) {
      case "invalid_pin_format":
        setError(`El PIN son ${PIN_LENGTH} dígitos.`);
        break;
      case "not_found":
        setError("Esta liga ya no existe o fue desactivada.");
        break;
      case "locked":
        setBloqueado(true);
        setError(
          `Demasiados intentos. Vuelve a intentar en ${res.minutesLeft} ${
            res.minutesLeft === 1 ? "minuto" : "minutos"
          }.`,
        );
        break;
      case "bad_pin":
        setError(
          res.attemptsLeft === 1
            ? "PIN incorrecto. Te queda 1 intento."
            : `PIN incorrecto. Te quedan ${res.attemptsLeft} intentos.`,
        );
        break;
    }
    setPin("");
  }

  if (report) return <ReportView report={report} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardContent className="px-6 py-2">
          <h1 className="text-xl font-semibold">Reporte del evento</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quien te compartió esta liga te dio también un PIN de {PIN_LENGTH}{" "}
            dígitos. Tecléalo para ver las cifras.
          </p>

          <form onSubmit={enviar} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                name="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                // `inputMode` y no `type="number"`: el numérico recorta los
                // ceros a la izquierda y trae flechitas de incremento, que en
                // un PIN no significan nada.
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={PIN_LENGTH + 2}
                placeholder="000000"
                disabled={bloqueado || enviando}
                className="text-center text-2xl tracking-[0.4em] tabular-nums"
                aria-describedby={error ? "pin-error" : undefined}
                aria-invalid={error ? true : undefined}
                autoFocus
              />
            </div>

            {error && (
              <p
                id="pin-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={bloqueado || enviando || pin.length === 0}
            >
              {enviando ? "Comprobando…" : "Ver el reporte"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

/** Fecha del evento en largo, o `null` si no se capturó. */
function fechaLarga(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ReportView({ report }: { report: SharedReport }) {
  const { event, funnel } = report;
  const fecha = fechaLarga(event.eventDate);
  const generado = new Date(report.generatedAt).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="border-b pb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Reporte del evento
          {event.eventType ? ` · ${event.eventType}` : ""}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{event.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[fecha, event.hostName].filter(Boolean).join(" · ")}
        </p>
      </header>

      {/* El número del banquete va primero y solo. Es a lo que vino quien abre
          esta liga: cuántos platos servir. */}
      <section className="py-8">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Asistentes confirmados
        </div>
        <div className="mt-2 text-6xl font-semibold tabular-nums leading-none">
          {funnel.attendees}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Personas, contando acompañantes — de {funnel.confirmed}{" "}
          {funnel.confirmed === 1 ? "confirmación" : "confirmaciones"}.
        </p>
      </section>

      {/* `third_party`: quien abre esta liga no es el anfitrión — no es "tu"
          lista. */}
      <FunnelKpis funnel={funnel} voice="third_party" />

      <footer className="mt-10 border-t pt-5 text-xs text-muted-foreground">
        <p>Cifras al {generado}. Recarga la página para actualizarlas.</p>
        <p className="mt-1">
          Este reporte muestra totales. No incluye la lista de invitados ni sus
          respuestas.
        </p>
      </footer>
    </main>
  );
}
