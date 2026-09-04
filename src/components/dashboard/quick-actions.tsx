import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  QrCode,
  Share2,
  UserPlus,
  Wand2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { nextAction, type EventFunnel } from "@/lib/dashboard/metrics";

/**
 * Acciones rápidas arriba del tablero.
 *
 * Van ANTES de las cifras a propósito: el panel debe decir qué hacer, no solo
 * qué pasó. Solo se ofrecen acciones que hoy existen de verdad — el aviso
 * automático por WhatsApp todavía no está construido, así que el empujón baja
 * a la lista de invitados de esta misma página para copiar el enlace a mano.
 *
 * Ojo: el editor NO lee un tab por query string (su pestaña es estado local),
 * así que enlazar `?tab=…` no llevaría a ningún lado.
 */

function Action({
  href,
  icon: Icon,
  title,
  hint,
}: {
  href: string;
  icon: typeof UserPlus;
  title: string;
  hint: string;
}) {
  return (
    <Card className="p-0 transition-colors hover:border-foreground/20">
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {hint}
          </span>
        </span>
      </Link>
    </Card>
  );
}

export function QuickActions({
  funnel,
  invitationId,
  publicUrl,
}: {
  funnel: EventFunnel;
  invitationId: string;
  publicUrl: string | null;
}) {
  const isGuestList = funnel.mode === "guest_list";
  const nudge = nextAction(funnel);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {isGuestList ? (
          <Action
            href="#invitados"
            icon={UserPlus}
            title="Agregar invitados"
            hint="Uno por uno o varios a la vez"
          />
        ) : (
          <Action
            href={`/editor/${invitationId}`}
            icon={Wand2}
            title="Editar invitación"
            hint="Bloques, colores y temática"
          />
        )}

        {publicUrl ? (
          <Action
            href={publicUrl}
            icon={Share2}
            title="Ver invitación publicada"
            hint="El enlace que comparten tus invitados"
          />
        ) : (
          <Action
            href={`/editor/${invitationId}`}
            icon={Share2}
            title="Publicar invitación"
            hint="Todavía no está publicada"
          />
        )}

        {isGuestList ? (
          <Action
            href={`/dashboard/invitations/${invitationId}/checkin`}
            icon={QrCode}
            title="Escanear en la puerta"
            hint="Control de acceso el día del evento"
          />
        ) : (
          <Action
            href={`/editor/${invitationId}`}
            icon={Wand2}
            title="Personalizar diseño"
            hint="Temática, tipografías y animaciones"
          />
        )}
      </div>

      {nudge ? (
        <div
          className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm ${
            nudge.tone === "ok"
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-200"
          }`}
        >
          {nudge.tone === "ok" ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <Bell className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1">{nudge.label}</span>
          {nudge.tone === "wait" && isGuestList ? (
            <Link
              href="#invitados"
              className="shrink-0 font-medium underline underline-offset-2"
            >
              Ver lista
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
