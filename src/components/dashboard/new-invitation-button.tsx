"use client";

import { unstable_rethrow } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeatureBadge } from "@/components/billing/feature-badge";
import { createInvitation } from "@/lib/invitations/actions";
import { PLAN_LISTA_DE_INVITADOS } from "@/lib/guests/premium";

export function NewInvitationButton() {
  const [pending, startTransition] = useTransition();

  function create(mode: "open" | "guest_list") {
    startTransition(async () => {
      try {
        await createInvitation(mode);
      } catch (e) {
        // Mismo defecto que use-template-button: createInvitation acaba en
        // redirect() y el NEXT_REDIRECT cae en este catch.
        unstable_rethrow(e);
        toast.error("No se pudo crear la invitación.");
      }
    });
  }

  return (
    <DropdownMenu>
      {/*
        `touch` (44 px) en móvil y `default` (32) a partir de `lg`: es el CTA
        principal del dashboard y `button.tsx` declara ese piso como obligatorio
        para los primarios. Sin `size`, caía en `default` = `h-8`.
      */}
      <DropdownMenuTrigger
        render={
          <Button
            disabled={pending}
            size="touch"
            className="lg:h-8 lg:gap-1.5 lg:px-2.5"
          />
        }
      >
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
          <span className="flex items-center gap-2 font-medium">
            Lista de invitados
            <FeatureBadge feature="guest_management" />
          </span>
          <span className="text-xs text-muted-foreground">
            Invitados nominales con su enlace y pase QR. La armas gratis;
            para publicarla necesitas el plan {PLAN_LISTA_DE_INVITADOS}.
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
