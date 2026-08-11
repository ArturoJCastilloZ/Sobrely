"use client";

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
          } catch {
            toast.error("No se pudo usar la plantilla.");
          }
        })
      }
    >
      {pending ? "Creando…" : "Usar esta plantilla"}
    </Button>
  );
}
