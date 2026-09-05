"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markGuestReminded, type GuestListRow } from "@/lib/guests/actions";
import { whatsappReminderUrl } from "@/lib/guests/whatsapp";
import {
  countByReason,
  emptyReminderMessage,
  planReminders,
  REMINDER_COOLDOWN_HOURS,
} from "@/lib/guests/reminders";

/**
 * Perseguir a los que no han contestado, en una sola pasada.
 *
 * Vive aparte de la fila del invitado a propósito. Recordar es una actividad
 * POR TANDA —"hoy le escribo a los que faltan"—, no algo que se haga invitado
 * por invitado mientras se administra la lista. Y en lo práctico: la fila ya
 * carga seis acciones y meter una séptima repetiría la regresión de layout que
 * costó dos arreglos.
 */
export function ReminderPanel({
  guests,
  eventTitle,
  hostName,
  siteUrl,
  onChanged,
}: {
  guests: readonly GuestListRow[];
  eventTitle: string;
  hostName?: string | null;
  siteUrl: string;
  onChanged: () => Promise<void> | void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();

  const plan = planReminders(guests);
  const n = countByReason(plan);
  const hay = plan.listos.length;

  /**
   * Abre el chat y sella el recordatorio.
   *
   * El `window.open` va PRIMERO y síncrono, misma razón que en la invitación:
   * después de un `await`, Safari e iOS lo tratan como popup no pedido y lo
   * bloquean.
   */
  function recordar(g: GuestListRow) {
    const url = whatsappReminderUrl({
      phone: g.phone,
      guestName: g.name,
      eventTitle,
      link: `${siteUrl}/g/${g.access_token}`,
      hostName,
    });
    if (!url) {
      toast.error("Agrega el teléfono del invitado para escribirle.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");

    startTransition(async () => {
      const res = await markGuestReminded(g.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await onChanged();
    });
  }

  function deshacer(g: GuestListRow) {
    startTransition(async () => {
      const res = await markGuestReminded(g.id, true);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Recordatorio deshecho.");
      await onChanged();
    });
  }

  return (
    <Card>
      <CardContent className="px-5 py-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Recordar a los que faltan</h3>
          {hay > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              {hay} por recordar
            </span>
          )}
        </div>

        {hay === 0 ? (
          // El caso vacío no es uno solo: puede significar "ya todos
          // respondieron", "falta enviar invitaciones", "faltan teléfonos" o
          // "espera un poco". Cada uno lleva a una acción distinta.
          <p className="mt-1.5 text-xs text-muted-foreground">
            {emptyReminderMessage(plan)}
          </p>
        ) : (
          <>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Ya recibieron su invitación y no han contestado. Se abre tu
              WhatsApp con el mensaje listo — sale de tu número, como cualquier
              otro mensaje tuyo.
            </p>

            {!abierto && (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setAbierto(true)}
              >
                Ver los {hay} que faltan
              </Button>
            )}

            {abierto && (
              <ul className="mt-4 space-y-1.5">
                {plan.listos.map((g) => (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {g.reminder_count > 0
                          ? `ya se le recordó ${g.reminder_count} ${
                              g.reminder_count === 1 ? "vez" : "veces"
                            }`
                          : "sin recordatorios"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {g.reminder_count > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deshacer(g)}
                          disabled={pending}
                          title="Si abriste el chat pero no enviaste nada"
                        >
                          Deshacer
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => recordar(g)}
                        disabled={pending}
                      >
                        Recordar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Lo omitido se DICE, no se esconde: cada motivo tiene un arreglo
            distinto y el organizador es quien puede aplicarlo. */}
        {(n.sin_invitacion > 0 ||
          n.sin_telefono > 0 ||
          n.recordado_reciente > 0) && (
          <p className="mt-3 text-xs text-muted-foreground">
            {[
              n.sin_invitacion > 0 &&
                `${n.sin_invitacion} sin invitación enviada`,
              n.sin_telefono > 0 && `${n.sin_telefono} sin WhatsApp`,
              n.recordado_reciente > 0 &&
                `${n.recordado_reciente} con recordatorio de hace menos de ${REMINDER_COOLDOWN_HOURS} h`,
            ]
              .filter(Boolean)
              .join(" · ")}
            {" — no entran en esta tanda."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
