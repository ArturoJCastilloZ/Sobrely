"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateServiceRequestStatus } from "@/lib/admin/actions";

export interface AdminServiceRequest {
  id: string;
  serviceCode: string;
  serviceName: string;
  status: string;
  email: string | null;
  contactNote: string | null;
  createdAt: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "contacted", label: "Contactado" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

function fmtDate(v: string): string {
  return new Date(v).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Tabla admin de solicitudes de servicio, con cambio de estado inline. */
export function ServiceRequestsTable({
  requests,
}: {
  requests: AdminServiceRequest[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Solicitudes de servicio</CardTitle>
        <CardDescription>
          Mueve el estado conforme atiendes cada solicitud.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin solicitudes.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 font-medium">Fecha</th>
                  <th className="p-3 font-medium">Servicio</th>
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Nota</th>
                  <th className="p-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <ServiceRow key={r.id} request={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceRow({ request }: { request: AdminServiceRequest }) {
  const [status, setStatus] = useState(request.status);
  const [pending, start] = useTransition();

  function change(next: string) {
    const prev = status;
    setStatus(next); // optimista
    start(async () => {
      const res = await updateServiceRequestStatus(request.id, next);
      if (!res.ok) {
        setStatus(prev);
        toast.error(res.error ?? "No se pudo actualizar.");
        return;
      }
      toast.success("Estado actualizado.");
    });
  }

  return (
    <tr className="border-b last:border-b-0 align-top">
      <td className="p-3 whitespace-nowrap">{fmtDate(request.createdAt)}</td>
      <td className="p-3">{request.serviceName}</td>
      <td className="p-3">{request.email ?? "—"}</td>
      <td className="p-3 max-w-[220px]">
        <span className="line-clamp-2 text-muted-foreground">
          {request.contactNote || "—"}
        </span>
      </td>
      <td className="p-3">
        <select
          value={status}
          disabled={pending}
          onChange={(e) => change(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-sm disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}
