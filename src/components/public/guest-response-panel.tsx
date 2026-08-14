"use client";

import { useState, useTransition } from "react";
import type { RsvpConfig } from "@/lib/modules/types";
import type { GuestForInvitation } from "@/lib/invitations/public-types";
import { respondAsGuest } from "@/lib/guests/actions";
import { Textarea } from "@/components/ui/textarea";
import { GuestPass } from "@/components/public/guest-pass";
import { AddToCalendar } from "@/components/public/add-to-calendar";

type GuestStatus = GuestForInvitation["status"];

export function GuestResponsePanel({
  guest,
  token,
  config,
  event,
}: {
  guest: GuestForInvitation;
  token: string;
  config: RsvpConfig;
  /** Datos del evento para "Añadir a calendario" (.ics). */
  event: { title: string; dateIso: string; location?: string };
}) {
  const [status, setStatus] = useState<GuestStatus>(guest.status);
  const [message, setMessage] = useState(guest.message ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldSurface =
    "bg-[var(--inv-card)] dark:bg-[var(--inv-card)] border-[color-mix(in_srgb,var(--inv-text)_35%,transparent)]";

  function respond(confirmedCount: number) {
    setError(null);
    startTransition(async () => {
      const res = await respondAsGuest({ token, confirmedCount, message });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStatus(confirmedCount > 0 ? "confirmed" : "declined");
    });
  }

  const allotmentLabel =
    guest.max_guests === 1 ? "1 lugar" : `${guest.max_guests} lugares`;
  const peopleLabel =
    guest.max_guests === 1 ? "1 invitado" : `${guest.max_guests} invitados`;

  return (
    <section className="flex flex-col items-center gap-6 bg-[color-mix(in_srgb,var(--inv-text)_7%,transparent)] px-6 py-14 @2xl/inv:gap-8 @2xl/inv:py-20">
      <div className="text-center">
        <h3 className="text-2xl font-semibold @2xl/inv:text-3xl @4xl/inv:text-4xl @5xl/inv:text-5xl">
          {config.title || "Confirma tu asistencia"}
        </h3>
        <p className="mt-3 text-xl @2xl/inv:text-2xl @4xl/inv:text-3xl">
          Hola, <span className="font-semibold">{guest.name}</span>
        </p>
        <p className="mt-1 text-base opacity-80 @2xl/inv:text-lg @4xl/inv:text-xl">
          Tienes {allotmentLabel} reservados
        </p>
      </div>

      {status === "confirmed" ? (
        <div className="flex w-full max-w-md flex-col items-center gap-5 @4xl/inv:max-w-lg">
          <div className="w-full rounded-xl border border-emerald-600/40 bg-emerald-500/10 p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white @4xl/inv:h-12 @4xl/inv:w-12">
              ✓
            </div>
            <p
              className="mt-3 text-xl font-bold @4xl/inv:text-2xl"
              style={{ color: "var(--inv-text)" }}
            >
              ¡Gracias por confirmar!
            </p>
            <p
              className="mt-1 text-base font-medium @4xl/inv:text-lg"
              style={{ color: "var(--inv-text)" }}
            >
              {peopleLabel} · {guest.name}
            </p>
          </div>
          <GuestPass token={token} name={guest.name} people={guest.max_guests} />
          <AddToCalendar
            uid={`guest-${token}`}
            title={event.title}
            location={event.location}
            description={config.title || "Confirma tu asistencia"}
            startIso={event.dateIso}
          />
        </div>
      ) : status === "declined" ? (
        <div className="w-full max-w-md rounded-xl bg-[var(--inv-card)] p-6 text-center @4xl/inv:max-w-lg">
          <p className="text-lg @4xl/inv:text-xl">
            Registramos que no podrás asistir.
          </p>
          <p className="mt-1 text-base opacity-70 @4xl/inv:text-lg">
            ¡Te vamos a extrañar, {guest.name}!
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-5 @2xl/inv:max-w-lg @4xl/inv:max-w-xl">
          <div className="space-y-2">
            <label
              htmlFor="guest-message"
              className="block text-base font-medium @4xl/inv:text-lg"
            >
              Mensaje para los anfitriones (opcional)
            </label>
            <Textarea
              id="guest-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
              className={`text-base @4xl/inv:text-lg ${fieldSurface}`}
            />
          </div>

          {error && (
            <p role="alert" className="text-base text-destructive @4xl/inv:text-lg">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() => respond(guest.max_guests)}
            style={{ backgroundColor: "var(--inv-primary)" }}
            className="flex h-14 w-full items-center justify-center rounded-lg px-4 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 @4xl/inv:h-16 @4xl/inv:text-xl"
          >
            {pending ? "Enviando…" : `Confirmar asistencia (${peopleLabel})`}
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => respond(0)}
            className="w-full text-center text-base underline opacity-75 hover:opacity-100 disabled:opacity-50 @4xl/inv:text-lg"
          >
            No podré asistir
          </button>
        </div>
      )}
    </section>
  );
}
