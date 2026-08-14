"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createInvitation } from "@/lib/invitations/actions";

export function NewInvitationButton() {
  const [pending, startTransition] = useTransition();

  function create(mode: "open" | "guest_list") {
    startTransition(async () => {
      try {
        await createInvitation(mode);
      } catch {
        toast.error("No se pudo crear la invitación.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button disabled={pending} />}>
        {pending ? "Creando…" : "+ Nueva invitación"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem
          onClick={() => create("open")}
          className="flex flex-col items-start gap-0.5"
        >
          <span className="font-medium">Confirmación abierta</span>
          <span className="text-xs text-muted-foreground">
            Un formulario público: cualquiera con el enlace confirma.
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => create("guest_list")}
          className="flex flex-col items-start gap-0.5"
        >
          <span className="font-medium">Lista de invitados</span>
          <span className="text-xs text-muted-foreground">
            Invitados nominales, cada uno con su enlace y cupo. Agrega el RSVP
            automáticamente.
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
