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
import { RsvpQuestionFields } from "@/components/public/rsvp-question-fields";
import type { RsvpAnswers } from "@/lib/modules/rsvp-answers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  const [answers, setAnswers] = useState<RsvpAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [closed, setClosed] = useState(false);
  const [pending, startTransition] = useTransition();

  const deadlineLabel = formatDate(config.deadline);

  // Scale form labels/inputs up on wider containers so the RSVP reads well on
  // desktop (kept small on mobile via the container-query breakpoints).
  const labelCls = "@2xl/inv:text-base @4xl/inv:text-lg";
  // Give fields a surface + border from the invitation palette so they stand
  // out against the RSVP band (the default Input is transparent with a faint
  // app-token border that vanishes on a tinted background).
  const fieldSurface =
    "bg-[var(--inv-card)] dark:bg-[var(--inv-card)] border-[color-mix(in_srgb,var(--inv-text)_30%,transparent)]";
  const inputCls = `@4xl/inv:h-11 @4xl/inv:text-base ${fieldSurface}`;

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
        answers,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <section className="flex flex-col items-center gap-4 bg-[color-mix(in_srgb,var(--inv-text)_7%,transparent)] px-6 py-10 @2xl/inv:gap-6 @2xl/inv:py-16">
      <div className="text-center">
        <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
          {config.title || "Confirma tu asistencia"}
        </h3>
        {config.description && (
          <p className="mt-1 text-sm opacity-70 @2xl/inv:text-base @4xl/inv:text-lg">
            {config.description}
          </p>
        )}
        {deadlineLabel && (
          <p className="mt-1 text-xs opacity-60 @2xl/inv:text-sm">
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
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-3 @2xl/inv:max-w-md @2xl/inv:space-y-4 @4xl/inv:max-w-lg"
        >
          <div className="space-y-1.5">
            <Label htmlFor="guestName" className={labelCls}>
              Nombre *
            </Label>
            <Input
              id="guestName"
              name="guestName"
              required
              maxLength={120}
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guestEmail" className={labelCls}>
              Correo (opcional)
            </Label>
            <Input
              id="guestEmail"
              name="guestEmail"
              type="email"
              placeholder="tu@correo.com"
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelCls}>¿Asistirás? *</Label>
            <div className="grid grid-cols-3 gap-2">
              {ATTENDANCE_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={
                    status === s
                      ? { backgroundColor: "var(--inv-primary)" }
                      : undefined
                  }
                  className={cn(
                    "flex h-9 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors @4xl/inv:h-11 @4xl/inv:text-base",
                    status === s
                      ? "border-transparent text-white"
                      : "border-[color-mix(in_srgb,var(--inv-text)_30%,transparent)] hover:bg-[var(--inv-card)]",
                  )}
                >
                  {ATTENDANCE_SHORT[s]}
                </button>
              ))}
            </div>
          </div>

          {config.allowGuestCount && status !== "no" && (
            <div className="space-y-1.5">
              <Label htmlFor="guestCount" className={labelCls}>
                Número de invitados
              </Label>
              <Input
                id="guestCount"
                name="guestCount"
                type="number"
                min={1}
                max={MAX_GUEST_COUNT}
                value={count}
                className={inputCls}
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

          {/* Preguntas del anfitrión, antes del mensaje libre. */}
          <RsvpQuestionFields
            questions={config.questions ?? []}
            values={answers}
            onChange={setAnswers}
            labelClassName={labelCls}
            inputClassName={inputCls}
          />

          <div className="space-y-1.5">
            <Label htmlFor="message" className={labelCls}>
              Mensaje (opcional)
            </Label>
            <Textarea
              id="message"
              name="message"
              maxLength={500}
              className={`@4xl/inv:text-base ${fieldSurface}`}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive @4xl/inv:text-base">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{ backgroundColor: "var(--inv-primary)" }}
            className="flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 @4xl/inv:h-12 @4xl/inv:text-base"
          >
            {pending ? "Enviando…" : "Confirmar"}
          </button>
        </form>
      )}
    </section>
  );
}
