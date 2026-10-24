"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CrearCuentaDialog } from "@/components/editor/crear-cuenta-dialog";

/**
 * Aviso permanente (no bloquea nada) para quien edita sin cuenta: sus invitaciones viven
 * en este navegador hasta que cree una. Crear la cuenta no mueve ni copia nada.
 */
export function BannerInvitado() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2 text-sm lg:px-6">
      <p>Estás editando sin cuenta. Crea una para publicar y no perder tus invitaciones.</p>
      <Button size="sm" onClick={() => setAbierto(true)}>
        Crear mi cuenta
      </Button>
      <CrearCuentaDialog open={abierto} onOpenChange={setAbierto} destino="/dashboard" />
    </div>
  );
}
