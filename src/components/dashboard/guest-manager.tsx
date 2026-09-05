"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  addGuest,
  addGuestsBulk,
  editGuest,
  deleteGuest,
  setGuestCheckIn,
  setGuestInvited,
  listGuests,
  type GuestListRow,
} from "@/lib/guests/actions";
import { MAX_GUEST_ALLOTMENT } from "@/lib/guests/schemas";
import { whatsappInviteUrl } from "@/lib/guests/whatsapp";
import { ReminderPanel } from "@/components/dashboard/reminder-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type GuestRow = GuestListRow;

const STATUS_LABEL: Record<GuestRow["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  declined: "No asiste",
};

function statusVariant(status: GuestRow["status"]) {
  if (status === "confirmed") return "default" as const;
  if (status === "declined") return "destructive" as const;
  return "secondary" as const;
}

export function GuestManager({
  invitationId,
  siteUrl,
  eventTitle,
  hostName,
}: {
  invitationId: string;
  siteUrl: string;
  eventTitle: string;
  hostName?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [allotment, setAllotment] = useState(1);
  const [phone, setPhone] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);

  const reload = useCallback(async () => {
    const rows = await listGuests(invitationId);
    setGuests(rows);
    setLoading(false);
  }, [invitationId]);

  useEffect(() => {
    // Carga inicial de la lista. reload() hace setState solo DESPUÉS del await
    // (no es síncrono en el cuerpo del efecto), así que no cascadea renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const totalAllotted = guests.reduce((s, g) => s + g.max_guests, 0);
  const confirmedGuests = guests.filter((g) => g.status === "confirmed");
  const confirmedPeople = confirmedGuests.reduce(
    (s, g) => s + (g.confirmed_count ?? 0),
    0,
  );

  function guestLink(token: string) {
    return `${siteUrl.replace(/\/$/, "")}/g/${token}`;
  }

  function handleAdd() {
    if (!name.trim()) {
      toast.error("Escribe el nombre del invitado.");
      return;
    }
    startTransition(async () => {
      const res = await addGuest({
        invitationId,
        name,
        maxGuests: allotment,
        phone: phone.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setName("");
      setAllotment(1);
      setPhone("");
      toast.success("Invitado agregado.");
      await reload();
    });
  }

  function handleBulk() {
    if (!bulk.trim()) {
      toast.error("Pega al menos un invitado.");
      return;
    }
    startTransition(async () => {
      const res = await addGuestsBulk({ invitationId, raw: bulk });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBulk("");
      setShowBulk(false);
      toast.success("Invitados agregados.");
      await reload();
    });
  }

  function handleEdit(g: GuestRow) {
    const newName = window.prompt("Nombre del invitado", g.name);
    if (newName === null) return;
    const raw = window.prompt(
      `Lugares (1–${MAX_GUEST_ALLOTMENT})`,
      String(g.max_guests),
    );
    if (raw === null) return;
    const maxGuests = Math.max(1, Math.min(MAX_GUEST_ALLOTMENT, Number(raw) || 1));
    const newPhone = window.prompt(
      "Teléfono para WhatsApp (opcional)",
      g.phone ?? "",
    );
    if (newPhone === null) return;
    startTransition(async () => {
      const res = await editGuest({
        id: g.id,
        name: newName,
        maxGuests,
        phone: newPhone.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Invitado actualizado.");
      await reload();
    });
  }

  function handleDelete(g: GuestRow) {
    if (!window.confirm(`¿Eliminar a ${g.name}? Su enlace dejará de funcionar.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteGuest(g.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Invitado eliminado.");
      await reload();
    });
  }

  function toggleCheckIn(g: GuestRow) {
    startTransition(async () => {
      const res = await setGuestCheckIn(g.id, !g.checked_in_at);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(g.checked_in_at ? "Ingreso revertido." : "Ingreso marcado.");
      await reload();
    });
  }

  /**
   * Abre WhatsApp con el mensaje listo y sella el envío.
   *
   * El `window.open` va PRIMERO y de forma síncrona: si se hiciera después de
   * un `await`, Safari e iOS lo tratarían como popup no pedido por el usuario
   * y lo bloquearían. El sellado va después, sin bloquear el chat.
   */
  function inviteByWhatsApp(g: GuestRow) {
    const url = whatsappInviteUrl({
      phone: g.phone,
      guestName: g.name,
      eventTitle,
      link: guestLink(g.access_token),
      hostName,
    });
    if (!url) {
      toast.error("Agrega el teléfono del invitado para escribirle.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");

    if (g.invited_at) return; // ya estaba marcada; no se mueve la fecha
    startTransition(async () => {
      const res = await setGuestInvited(g.id, true);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await reload();
    });
  }

  /** Marca o desmarca el envío a mano (para quien invitó por otro medio). */
  function toggleInvited(g: GuestRow) {
    startTransition(async () => {
      const res = await setGuestInvited(g.id, !g.invited_at);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(g.invited_at ? "Marcada como no enviada." : "Marcada como enviada.");
      await reload();
    });
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(guestLink(token));
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar. Copia el enlace manualmente.");
    }
  }

  const checkedInCount = guests.filter((g) => g.checked_in_at).length;
  const invitedCount = guests.filter((g) => g.invited_at).length;

  return (
    <div className="space-y-6">
      {/* Perseguir a los que faltan. Va ARRIBA de la lista porque es la acción
          del día cuando el evento ya se envió; administrar la lista viene
          antes en el tiempo, pero después en la frecuencia de uso. */}
      {!loading && guests.length > 0 && (
        <ReminderPanel
          guests={guests}
          eventTitle={eventTitle}
          hostName={hostName}
          siteUrl={siteUrl}
          onChanged={reload}
        />
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label={`Invitados · ${totalAllotted} lugares`} value={guests.length} />
        <Stat
          label={
            guests.length > 0
              ? `Enviadas · ${Math.round((invitedCount / guests.length) * 100)}%`
              : "Enviadas"
          }
          value={invitedCount}
        />
        <Stat label="Confirmados" value={confirmedGuests.length} />
        <Stat label="Personas confirmadas" value={confirmedPeople} />
        <Stat
          label="Ingresaron"
          value={checkedInCount}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          render={
            <Link href={`/dashboard/invitations/${invitationId}/checkin`} />
          }
          nativeButton={false}
        >
          Escanear en la puerta →
        </Button>
      </div>

      {/* Alta */}
      <div className="rounded-lg border p-4">
        <AddGuestFields
          name={name}
          allotment={allotment}
          phone={phone}
          busy={pending}
          onName={setName}
          onAllotment={setAllotment}
          onPhone={setPhone}
          onSubmit={handleAdd}
        />
        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className="mt-3 text-sm text-muted-foreground underline hover:text-foreground"
        >
          {showBulk ? "Ocultar alta masiva" : "Agregar varios a la vez"}
        </button>
        {showBulk && (
          <div className="mt-3 space-y-2">
            <Label htmlFor="g-bulk">
              Un invitado por línea. Formato: <code>Nombre, lugares</code> (los
              lugares son opcionales, por defecto 1).
            </Label>
            <Textarea
              id="g-bulk"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={5}
              placeholder={"Mara González, 2\nJuan Pérez\nFamilia López, 4"}
            />
            <Button onClick={handleBulk} disabled={pending} size="sm">
              Agregar lista
            </Button>
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          Cargando invitados…
        </p>
      ) : guests.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aún no tienes invitados. Agrégalos arriba y comparte su enlace único.
        </p>
      ) : (
        <ul className="space-y-2">
          {guests.map((g) => (
            <GuestRowItem
              key={g.id}
              guest={g}
              busy={pending}
              onInvite={() => inviteByWhatsApp(g)}
              onToggleInvited={() => toggleInvited(g)}
              onToggleCheckIn={() => toggleCheckIn(g)}
              onCopyLink={() => copyLink(g.access_token)}
              onEdit={() => handleEdit(g)}
              onDelete={() => handleDelete(g)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}



/**
 * Campos de alta de un invitado.
 *
 * Presentacional, como `GuestRowItem`, para poder montarlo aislado y medirlo.
 *
 * El nombre lleva `min-w` a propósito: es un `flex-1` compitiendo con dos
 * campos de ancho fijo y un botón, y `flex-1` sin mínimo se encoge hasta el
 * contenido cuando el panel es angosto — que es exactamente como quedó al
 * agregar el campo de WhatsApp: el input del nombre acabó más chico que el de
 * Lugares. Con el mínimo, cuando ya no cabe la fila ENVUELVE en vez de
 * aplastar el campo más importante.
 */
function AddGuestFields({
  name,
  allotment,
  phone,
  busy,
  onName,
  onAllotment,
  onPhone,
  onSubmit,
}: {
  name: string;
  allotment: number;
  phone: string;
  busy: boolean;
  onName: (v: string) => void;
  onAllotment: (v: number) => void;
  onPhone: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1 space-y-1.5">
        <Label htmlFor="g-name">Nombre del invitado</Label>
        <Input
          id="g-name"
          value={name}
          placeholder="p. ej. Mara González"
          onChange={(e) => onName(e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="w-24 shrink-0 space-y-1.5">
        <Label htmlFor="g-allot">Lugares</Label>
        <Input
          id="g-allot"
          type="number"
          min={1}
          max={MAX_GUEST_ALLOTMENT}
          value={allotment}
          onChange={(e) =>
            onAllotment(
              Math.max(
                1,
                Math.min(MAX_GUEST_ALLOTMENT, Number(e.target.value) || 1),
              ),
            )
          }
        />
      </div>
      <div className="min-w-[10rem] flex-1 space-y-1.5 sm:max-w-[11rem]">
        <Label htmlFor="g-phone">WhatsApp (opcional)</Label>
        <Input
          id="g-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          placeholder="55 1234 5678"
          onChange={(e) => onPhone(e.target.value)}
          maxLength={25}
        />
      </div>
      <Button onClick={onSubmit} disabled={busy} className="shrink-0">
        Agregar
      </Button>
    </div>
  );
}

/**
 * Una fila de la lista de invitados.
 *
 * Presentacional a propósito (recibe callbacks, no toca server actions): así
 * el layout se puede montar aislado y revisar a distintos anchos, que es donde
 * se rompió cuando la fila pasó de 4 acciones a 6.
 *
 * La estructura es de DOS renglones, no de dos columnas: con seis acciones no
 * hay ancho que alcance para poner la info y los botones lado a lado sin que
 * uno aplaste al otro. Las etiquetas se mantienen cortas por la misma razón.
 *
 * La jerarquía la da la VARIANTE del botón (una sola primaria, el resto
 * fantasma), no separadores verticales: con `flex-wrap` una rayita acaba
 * colgando al principio o al final de un renglón según el ancho.
 */
function GuestRowItem({
  guest: g,
  busy,
  onInvite,
  onToggleInvited,
  onToggleCheckIn,
  onCopyLink,
  onEdit,
  onDelete,
}: {
  guest: GuestRow;
  busy: boolean;
  onInvite: () => void;
  onToggleInvited: () => void;
  onToggleCheckIn: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const lugares = `${g.max_guests} ${g.max_guests === 1 ? "lugar" : "lugares"}`;

  return (
    <li className="rounded-lg border p-3">
      {/* Renglón 1 — quién es y cómo va */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{g.name}</span>
          <Badge variant={statusVariant(g.status)}>
            {STATUS_LABEL[g.status]}
          </Badge>
          {g.invited_at && <Badge variant="outline">Enviada</Badge>}
          {g.checked_in_at && <Badge variant="outline">Ingresó</Badge>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {g.status === "confirmed"
            ? `Confirmó ${g.confirmed_count ?? 0} de ${g.max_guests}`
            : lugares}
          {g.phone ? ` · ${g.phone}` : " · sin teléfono"}
        </p>
      </div>

      {/* Renglón 2 — la acción principal a la izquierda, el resto después */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button
          variant={g.invited_at ? "outline" : "default"}
          size="sm"
          onClick={onInvite}
          disabled={busy || !g.phone}
          title={
            g.phone
              ? "Abre WhatsApp con el mensaje listo"
              : "Agrega su teléfono para escribirle"
          }
        >
          {g.invited_at ? "Reenviar" : "Invitar"} por WhatsApp
        </Button>

        <Button variant="ghost" size="sm" onClick={onCopyLink}>
          Copiar enlace
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleInvited}
          disabled={busy}
          title="Para cuando invitaste por otro medio"
        >
          {g.invited_at ? "Sin enviar" : "Marcar enviada"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCheckIn}
          disabled={busy}
        >
          {g.checked_in_at ? "Deshacer ingreso" : "Marcar ingreso"}
        </Button>

        <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy}>
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          className="text-destructive hover:text-destructive"
        >
          Eliminar
        </Button>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border p-3 text-center ${className}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
