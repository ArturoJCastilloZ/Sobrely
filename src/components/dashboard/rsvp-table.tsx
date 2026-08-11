"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  MAX_GUEST_COUNT,
  type AttendanceStatus,
} from "@/lib/rsvp/constants";
import { deleteRsvp, updateRsvp } from "@/lib/rsvp/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type RsvpRow = {
  id: string;
  guest_name: string;
  guest_email: string | null;
  attendance_status: string;
  guest_count: number;
  message: string | null;
  created_at: string;
};

type Filter = "all" | AttendanceStatus;

function statusVariant(status: string) {
  if (status === "yes") return "default" as const;
  if (status === "no") return "destructive" as const;
  return "secondary" as const;
}

function toCsv(rows: RsvpRow[]): string {
  const header = [
    "Nombre",
    "Correo",
    "Asistencia",
    "Invitados",
    "Mensaje",
    "Fecha",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.guest_name,
      r.guest_email ?? "",
      ATTENDANCE_LABELS[r.attendance_status as AttendanceStatus] ??
        r.attendance_status,
      String(r.guest_count),
      r.message ?? "",
      new Date(r.created_at).toLocaleString("es-MX"),
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export function RsvpTable({
  initialRows,
  invitationSlug,
}: {
  initialRows: RsvpRow[];
  invitationSlug: string;
}) {
  const [rows, setRows] = useState<RsvpRow[]>(initialRows);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      filter === "all"
        ? rows
        : rows.filter((r) => r.attendance_status === filter),
    [rows, filter],
  );

  function exportCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rsvp-${invitationSlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteRsvp(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Respuesta eliminada.");
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Aún no hay respuestas. Comparte tu invitación para recibir
        confirmaciones.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            Todas ({rows.length})
          </FilterButton>
          {ATTENDANCE_STATUSES.map((s) => (
            <FilterButton
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
            >
              {ATTENDANCE_LABELS[s]} (
              {rows.filter((r) => r.attendance_status === s).length})
            </FilterButton>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">Nombre</th>
              <th className="p-2 font-medium">Correo</th>
              <th className="p-2 font-medium">Asistencia</th>
              <th className="p-2 font-medium">Invitados</th>
              <th className="p-2 font-medium">Mensaje</th>
              <th className="p-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) =>
              editingId === row.id ? (
                <EditRow
                  key={row.id}
                  row={row}
                  pending={pending}
                  onCancel={() => setEditingId(null)}
                  onSaved={(updated) => {
                    setRows((prev) =>
                      prev.map((r) => (r.id === updated.id ? updated : r)),
                    );
                    setEditingId(null);
                  }}
                />
              ) : (
                <tr key={row.id} className="border-t align-top">
                  <td className="p-2 font-medium">{row.guest_name}</td>
                  <td className="p-2 text-muted-foreground">
                    {row.guest_email || "—"}
                  </td>
                  <td className="p-2">
                    <Badge variant={statusVariant(row.attendance_status)}>
                      {ATTENDANCE_LABELS[
                        row.attendance_status as AttendanceStatus
                      ] ?? row.attendance_status}
                    </Badge>
                  </td>
                  <td className="p-2 tabular-nums">{row.guest_count}</td>
                  <td className="p-2 max-w-[220px] text-muted-foreground">
                    {row.message || "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setEditingId(row.id)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => handleDelete(row.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant={active ? "default" : "outline"} size="xs" onClick={onClick}>
      {children}
    </Button>
  );
}

function EditRow({
  row,
  pending,
  onCancel,
  onSaved,
}: {
  row: RsvpRow;
  pending: boolean;
  onCancel: () => void;
  onSaved: (updated: RsvpRow) => void;
}) {
  const [name, setName] = useState(row.guest_name);
  const [email, setEmail] = useState(row.guest_email ?? "");
  const [status, setStatus] = useState<AttendanceStatus>(
    (ATTENDANCE_STATUSES as readonly string[]).includes(row.attendance_status)
      ? (row.attendance_status as AttendanceStatus)
      : "maybe",
  );
  const [count, setCount] = useState(row.guest_count);
  const [message, setMessage] = useState(row.message ?? "");
  const [saving, startSaving] = useTransition();

  function save() {
    startSaving(async () => {
      const res = await updateRsvp({
        id: row.id,
        guestName: name,
        guestEmail: email,
        attendanceStatus: status,
        guestCount: count,
        message,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onSaved({
        ...row,
        guest_name: name.trim(),
        guest_email: email.trim() || null,
        attendance_status: status,
        guest_count: count,
        message: message.trim() || null,
      });
      toast.success("Respuesta actualizada.");
    });
  }

  return (
    <tr className="border-t bg-muted/30 align-top">
      <td className="p-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="p-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </td>
      <td className="p-2">
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as AttendanceStatus)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: string) =>
                ATTENDANCE_LABELS[v as AttendanceStatus] ?? v
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ATTENDANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {ATTENDANCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2">
        <Input
          type="number"
          min={1}
          max={MAX_GUEST_COUNT}
          value={count}
          onChange={(e) =>
            setCount(Math.max(1, Math.min(MAX_GUEST_COUNT, Number(e.target.value) || 1)))
          }
        />
      </td>
      <td className="p-2">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} />
      </td>
      <td className="p-2">
        <div className="flex gap-1">
          <Button size="xs" disabled={saving || pending} onClick={save}>
            {saving ? "…" : "Guardar"}
          </Button>
          <Button size="xs" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </td>
    </tr>
  );
}
