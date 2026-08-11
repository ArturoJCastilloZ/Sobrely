"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { grantAdmin, revokeAdmin } from "@/lib/admin/actions";

export interface AdminEntry {
  userId: string;
  email: string | null;
  grantedAt: string;
}

/**
 * Gestión de administradores (Fase 8.7). Solo un admin puede otorgar/revocar.
 * El primer admin se siembra por SQL (bootstrap); aquí no hay auto-asignación.
 */
export function AdminManager({
  admins,
  currentUserId,
}: {
  admins: AdminEntry[];
  currentUserId: string;
}) {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();

  function grant() {
    start(async () => {
      const res = await grantAdmin(email);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo otorgar admin.");
        return;
      }
      setEmail("");
      toast.success("Admin otorgado.");
    });
  }

  function revoke(userId: string) {
    start(async () => {
      const res = await revokeAdmin(userId);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo revocar admin.");
        return;
      }
      toast.success("Admin revocado.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Administradores</CardTitle>
        <CardDescription>
          Otorga acceso admin por email. No puedes revocar tu propio acceso.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
          />
          <Button
            onClick={grant}
            disabled={pending || !email.trim()}
            size="sm"
          >
            Otorgar
          </Button>
        </div>

        <ul className="flex flex-col divide-y rounded-lg ring-1 ring-foreground/10">
          {admins.map((a) => (
            <li
              key={a.userId}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{a.email ?? a.userId}</p>
                <p className="text-xs text-muted-foreground">
                  Desde{" "}
                  {new Date(a.grantedAt).toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              {a.userId === currentUserId ? (
                <span className="text-xs text-muted-foreground">Tú</span>
              ) : (
                <Button
                  onClick={() => revoke(a.userId)}
                  disabled={pending}
                  variant="outline"
                  size="sm"
                >
                  Revocar
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
