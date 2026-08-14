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
  listGuests,
  type GuestListRow,
} from "@/lib/guests/actions";
import { MAX_GUEST_ALLOTMENT } from "@/lib/guests/schemas";
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
}: {
  invitationId: string;
  siteUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [allotment, setAllotment] = useState(1);
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
      const res = await addGuest({ invitationId, name, maxGuests: allotment });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setName("");
      setAllotment(1);
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
    startTransition(async () => {
      const res = await editGuest({ id: g.id, name: newName, maxGuests });
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

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(guestLink(token));
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar. Copia el enlace manualmente.");
    }
  }

  const checkedInCount = guests.filter((g) => g.checked_in_at).length;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={`Invitados · ${totalAllotted} lugares`} value={guests.length} />
        <Stat label="Confirmados" value={confirmedGuests.length} />
        <Stat label="Personas confirmadas" value={confirmedPeople} />
        <Stat label="Ingresaron" value={checkedInCount} />
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="g-name">Nombre del invitado</Label>
            <Input
              id="g-name"
              value={name}
              placeholder="p. ej. Mara González"
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-28">
            <Label htmlFor="g-allot">Lugares</Label>
            <Input
              id="g-allot"
              type="number"
              min={1}
              max={MAX_GUEST_ALLOTMENT}
              value={allotment}
              onChange={(e) =>
                setAllotment(
                  Math.max(
                    1,
                    Math.min(MAX_GUEST_ALLOTMENT, Number(e.target.value) || 1),
                  ),
                )
              }
            />
          </div>
          <Button onClick={handleAdd} disabled={pending}>
            Agregar
          </Button>
        </div>
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
            <li
              key={g.id}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{g.name}</span>
                  <Badge variant={statusVariant(g.status)}>
                    {STATUS_LABEL[g.status]}
                  </Badge>
                  {g.checked_in_at && <Badge variant="outline">Ingresó</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {g.status === "confirmed"
                    ? `Confirmó ${g.confirmed_count ?? 0} de ${g.max_guests}`
                    : `${g.max_guests} ${g.max_guests === 1 ? "lugar" : "lugares"}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={g.checked_in_at ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => toggleCheckIn(g)}
                  disabled={pending}
                >
                  {g.checked_in_at ? "Deshacer ingreso" : "Marcar ingreso"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyLink(g.access_token)}
                >
                  Copiar enlace
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(g)}
                  disabled={pending}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(g)}
                  disabled={pending}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
