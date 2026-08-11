"use client";

import { useEffect, useState, useTransition } from "react";
import type { RsvpConfig } from "@/lib/modules/types";
import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_SHORT,
  MAX_GUEST_COUNT,
  type AttendanceStatus,
} from "@/lib/rsvp/constants";
import { submitRsvp } from "@/lib/rsvp/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PublicRsvpForm({
  invitationId,
  config,
}: {
  invitationId: string;
  config: RsvpConfig;
}) {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [count, setCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [closed, setClosed] = useState(false);
  const [pending, startTransition] = useTransition();

  const deadlineLabel = formatDate(config.deadline);

  // Evaluate the deadline on the client only (deferred), so we don't call an
  // impure Date.now() during render nor risk an SSR/client hydration mismatch.
  useEffect(() => {
    if (!config.deadline) return;
    const target = new Date(config.deadline).getTime();
    if (Number.isNaN(target)) return;
    const id = requestAnimationFrame(() => setClosed(Date.now() > target));
    return () => cancelAnimationFrame(id);
  }, [config.deadline]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const guestName = String(data.get("guestName") ?? "").trim();
    const guestEmail = String(data.get("guestEmail") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!guestName) {
      setError("Escribe tu nombre.");
      return;
    }
    if (!status) {
      setError("Selecciona si asistirás.");
      return;
    }

    startTransition(async () => {
      const res = await submitRsvp({
        invitationId,
        guestName,
        guestEmail,
        attendanceStatus: status,
        guestCount: config.allowGuestCount ? count : 1,
        message,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <section className="flex flex-col items-center gap-4 bg-muted/40 px-6 py-10">
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {config.title || "Confirma tu asistencia"}
        </h3>
        {config.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {config.description}
          </p>
        )}
        {deadlineLabel && (
          <p className="mt-1 text-xs text-muted-foreground">
            Fecha límite: {deadlineLabel}
          </p>
        )}
      </div>

      {done ? (
        <div className="w-full max-w-sm rounded-lg bg-emerald-500/10 p-4 text-center text-sm text-emerald-700 dark:text-emerald-400">
          ¡Gracias! Tu confirmación quedó registrada.
        </div>
      ) : closed ? (
        <div className="w-full max-w-sm rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          Las confirmaciones están cerradas.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="guestName">Nombre *</Label>
            <Input id="guestName" name="guestName" required maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guestEmail">Correo (opcional)</Label>
            <Input
              id="guestEmail"
              name="guestEmail"
              type="email"
              placeholder="tu@correo.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>¿Asistirás? *</Label>
            <div className="grid grid-cols-3 gap-2">
              {ATTENDANCE_STATUSES.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={status === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(s)}
                >
                  {ATTENDANCE_SHORT[s]}
                </Button>
              ))}
            </div>
          </div>

          {config.allowGuestCount && status !== "no" && (
            <div className="space-y-1.5">
              <Label htmlFor="guestCount">Número de invitados</Label>
              <Input
                id="guestCount"
                name="guestCount"
                type="number"
                min={1}
                max={MAX_GUEST_COUNT}
                value={count}
                onChange={(e) =>
                  setCount(
                    Math.min(
                      MAX_GUEST_COUNT,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  )
                }
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="message">Mensaje (opcional)</Label>
            <Textarea id="message" name="message" maxLength={500} />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Enviando…" : "Confirmar"}
          </Button>
        </form>
      )}
    </section>
  );
}
