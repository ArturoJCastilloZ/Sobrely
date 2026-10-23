"use client";

import { useEffect, useState, useTransition } from "react";
import type { RsvpConfig, TextStyle } from "@/lib/modules/types";
import { FONT_STACKS } from "@/lib/theme/theme";
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

/** Los mismos overrides del lienzo, aplicados a la invitación publicada. */
function rsvpTextStyle(style: TextStyle | undefined): React.CSSProperties {
  if (!style) return {};
  return {
    ...(style.font ? { fontFamily: FONT_STACKS[style.font] } : {}),
    ...(style.color ? { color: style.color } : {}),
    ...(style.size ? { fontSize: `${style.size}rem` } : {}),
    ...(style.weight ? { fontWeight: style.weight } : {}),
    ...(style.letterSpacing !== undefined ? { letterSpacing: `${style.letterSpacing}em` } : {}),
    ...(style.lineHeight ? { lineHeight: style.lineHeight } : {}),
    ...(style.transform ? { textTransform: style.transform } : {}),
    ...(style.align ? { alignSelf: "stretch", textAlign: style.align } : {}),
  };
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
  const formVariant = config.variant ?? "classic";
  const formClass = {
    classic: "",
    card: "rounded-2xl bg-[var(--inv-card)] p-4 shadow-sm @2xl/inv:p-6",
    minimal: "border-y border-[color:var(--inv-primary)] py-4 @2xl/inv:py-6",
    editorial: "border-l-4 border-[color:var(--inv-primary)] bg-[color-mix(in_srgb,var(--inv-primary)_6%,transparent)] p-4 @2xl/inv:p-6",
  }[formVariant];
  const fieldVariantClass = formVariant === "minimal"
    ? "rounded-none border-x-0 border-t-0 bg-transparent"
    : "";
  const configuredFieldClass = {
    soft: "",
    outline: "border-2 border-[color:var(--inv-primary)] bg-transparent",
    underline: "rounded-none border-x-0 border-t-0 border-b-2 border-[color:var(--inv-primary)] bg-transparent px-0",
  }[config.fieldStyle ?? "soft"];
  const actionPresentation = config.buttonTone === "auto" || !config.buttonTone
    ? formVariant === "minimal" ? "minimal" : "solid"
    : config.buttonTone;
  const actionToneClass = {
    solid: "",
    minimal: "border-b-2 bg-transparent text-[var(--inv-primary)]",
    outline: "border-2 bg-transparent text-[var(--inv-primary)]",
    soft: "bg-[color-mix(in_srgb,var(--inv-primary)_14%,white)] text-[var(--inv-primary)]",
  }[actionPresentation];
  const actionShapeClass = {
    rounded: "rounded-md",
    pill: "rounded-full",
    square: "rounded-none",
  }[config.buttonStyle ?? "rounded"];
  const actionStyle = actionPresentation === "solid"
    ? {
        backgroundColor: "var(--inv-cta)",
        color: "var(--inv-cta-fg)",
        border: "1px solid var(--inv-cta-border)",
      }
    : actionPresentation === "soft"
      ? { color: "var(--inv-primary)" }
      : actionPresentation === "minimal"
        ? {
        color: "var(--inv-primary)",
        borderBottomColor: "var(--inv-primary)",
      }
        : {
          color: "var(--inv-primary)",
          borderColor: "var(--inv-primary)",
        };
  const formSpacing = {
    compact: "space-y-2 @2xl/inv:space-y-3",
    comfortable: "space-y-3 @2xl/inv:space-y-4",
    airy: "space-y-5 @2xl/inv:space-y-7",
  }[config.density ?? "comfortable"];
  const attendanceClass = {
    cards: "rounded-md border",
    pills: "rounded-full border",
    underline: "rounded-none border-x-0 border-t-0 border-b-2",
  }[config.attendanceStyle ?? "cards"];

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
      <div className="flex w-full flex-col items-center gap-1 text-center">
        <h3
          className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl"
          style={rsvpTextStyle(config.textStyles?.["0"])}
        >
          {config.title || "Confirma tu asistencia"}
        </h3>
        {config.description && (
          <p
            className="text-sm opacity-70 @2xl/inv:text-base @4xl/inv:text-lg"
            style={rsvpTextStyle(config.textStyles?.["1"])}
          >
            {config.description}
          </p>
        )}
        {deadlineLabel && (
          <p
            className="mt-1 text-xs opacity-60 @2xl/inv:text-sm"
            style={rsvpTextStyle(config.textStyles?.["2"])}
          >
            Fecha límite: {deadlineLabel}
          </p>
        )}
      </div>

      {done ? (
        <div style={{
          color: "var(--inv-success)",
          backgroundColor: "color-mix(in srgb, var(--inv-success) 10%, transparent)",
        }}
        className="w-full max-w-sm rounded-lg p-4 text-center text-sm">
          ¡Gracias! Tu confirmación quedó registrada.
        </div>
      ) : closed ? (
        <div className="w-full max-w-sm rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          Las confirmaciones están cerradas.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={cn("w-full max-w-sm @2xl/inv:max-w-md @4xl/inv:max-w-lg", formSpacing, formClass)}
          style={rsvpTextStyle(config.textStyles?.["3"])}
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
              className={`${inputCls} ${fieldVariantClass} ${configuredFieldClass}`}
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
              className={`${inputCls} ${fieldVariantClass} ${configuredFieldClass}`}
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
                      ? {
                          backgroundColor: "var(--inv-cta)",
                          color: "var(--inv-cta-fg)",
                          borderColor: "var(--inv-cta-border)",
                        }
                      : undefined
                  }
                  className={cn(
                    "flex h-11 items-center justify-center px-2 text-sm font-medium transition-colors @4xl/inv:text-base",
                    attendanceClass,
                    status === s
                      ? ""
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
                className={`${inputCls} ${fieldVariantClass} ${configuredFieldClass}`}
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
            inputClassName={`${inputCls} ${fieldVariantClass} ${configuredFieldClass}`}
          />

          <div className="space-y-1.5">
            <Label htmlFor="message" className={labelCls}>
              Mensaje (opcional)
            </Label>
            <Textarea
              id="message"
              name="message"
              maxLength={500}
              className={`@4xl/inv:text-base ${fieldSurface} ${fieldVariantClass} ${configuredFieldClass}`}
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
            style={actionStyle}
            className={cn("flex h-11 w-full items-center justify-center px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 @4xl/inv:h-12 @4xl/inv:text-base", actionToneClass, actionShapeClass)}
          >
            {pending ? "Enviando…" : config.buttonLabel || "Confirmar"}
          </button>
        </form>
      )}
    </section>
  );
}
