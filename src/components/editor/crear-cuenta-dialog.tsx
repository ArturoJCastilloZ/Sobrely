"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertirConCorreo, vincularGoogle } from "@/lib/auth/invitado";
import { enlaceConDestino } from "@/lib/auth/ruta-interna";
import { cn } from "@/lib/utils";

/**
 * Se abre cuando un invitado intenta publicar. Es el único momento en que se le pide
 * cuenta: su invitación ya está diseñada y se conserva, porque la cuenta se crea sobre la
 * misma sesión (mismo `user_id`).
 */
export function CrearCuentaDialog({
  open,
  onOpenChange,
  destino,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ruta interna a la que volver tras crear la cuenta. */
  destino: string;
}) {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  function enviarCorreo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await convertirConCorreo(correo, destino);
      if ("error" in r) setError(r.error);
      else setEnviado(true);
    });
  }

  function conGoogle() {
    setError(null);
    startTransition(async () => {
      const r = await vincularGoogle(destino);
      if ("error" in r) setError(r.error);
      else window.location.assign(r.url);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crea tu cuenta para publicar</DialogTitle>
          <DialogDescription>
            Tu invitación se queda tal como la diseñaste. La cuenta sirve para publicarla y
            volver a editarla desde cualquier dispositivo.
          </DialogDescription>
        </DialogHeader>

        {enviado ? (
          <p role="status" className="text-sm">
            Enviamos un enlace a <strong>{correo}</strong>. Ábrelo para confirmar tu correo y
            volverás a tu invitación para publicarla.
          </p>
        ) : (
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={conGoogle}
            >
              Continuar con Google
            </Button>
            <form onSubmit={enviarCorreo} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="correo-cuenta">Correo</Label>
                <Input
                  id="correo-cuenta"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@ejemplo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "error-cuenta" : undefined}
                  required
                />
              </div>
              {error && (
                <p id="error-cuenta" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending || !correo}>
                {pending ? "Enviando…" : "Enviar enlace al correo"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                href={enlaceConDestino("/login", "redirectTo", destino)}
                className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
