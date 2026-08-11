"use client";

import type { EditorInvitation } from "@/lib/invitations/editor-types";
import { liveSlugify } from "@/lib/invitations/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function SettingsPanel({
  invitation,
  onChange,
}: {
  invitation: EditorInvitation;
  onChange: (patch: Partial<EditorInvitation>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título de la invitación</Label>
        <Input
          value={invitation.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Slug (URL)</Label>
        <Input
          value={invitation.slug}
          onChange={(e) => onChange({ slug: liveSlugify(e.target.value) })}
        />
        <p className="text-xs text-muted-foreground">
          Se usará en la URL pública. Solo minúsculas, números y guiones.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Tipo de evento</Label>
        <Input
          placeholder="Boda, XV años, cumpleaños…"
          value={invitation.event_type}
          onChange={(e) => onChange({ event_type: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Fecha del evento</Label>
        <Input
          type="datetime-local"
          value={isoToLocalInput(invitation.event_date)}
          onChange={(e) =>
            onChange({ event_date: localInputToIso(e.target.value) })
          }
        />
      </div>
    </div>
  );
}
