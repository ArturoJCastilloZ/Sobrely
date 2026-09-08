"use client";

import { unstable_rethrow } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createFromTemplate } from "@/lib/invitations/actions";

export function UseTemplateButton({ templateId }: { templateId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await createFromTemplate(templateId);
          } catch (e) {
            // La accion termina en redirect(), y en el App Router eso llega al
            // cliente como una excepcion NEXT_REDIRECT — medido: la navegacion
            // ocurre Y el catch se dispara. Un catch pelado pintaba el toast de
            // error sobre una plantilla que SI se habia usado.
            unstable_rethrow(e);
            toast.error("No se pudo usar la plantilla.");
          }
        })
      }
    >
      {pending ? "Creando…" : "Usar esta plantilla"}
    </Button>
  );
}
