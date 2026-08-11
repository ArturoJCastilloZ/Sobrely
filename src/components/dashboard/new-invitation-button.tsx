"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createInvitation } from "@/lib/invitations/actions";

export function NewInvitationButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await createInvitation();
          } catch {
            toast.error("No se pudo crear la invitación.");
          }
        })
      }
    >
      {pending ? "Creando…" : "+ Nueva invitación"}
    </Button>
  );
}
