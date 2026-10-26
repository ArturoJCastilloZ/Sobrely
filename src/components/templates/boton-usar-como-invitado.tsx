"use client";

import { unstable_rethrow } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { empezarComoInvitado } from "@/lib/auth/invitado";
import { cn } from "@/lib/utils";

/**
 * «Usar esta plantilla» para quien aún no tiene sesión: abre el editor al momento, sin
 * pedir cuenta. La cuenta se pide al publicar. La acción termina en `redirect()`, que
 * llega aquí como NEXT_REDIRECT aunque la navegación sí ocurre (ver `UseTemplateButton`).
 */
export function BotonUsarComoInvitado({
  slug,
  className,
  datos,
  etiqueta = "Usar esta plantilla",
}: {
  slug: string;
  className?: string;
  /** Nombres y fecha de la vista rápida; el servidor los vuelve a limpiar. */
  datos?: unknown;
  etiqueta?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className={cn("w-full", className)}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const r = await empezarComoInvitado(slug, datos);
            if (r?.error) toast.error(r.error);
          } catch (e) {
            unstable_rethrow(e);
            toast.error("No pudimos abrir el editor. Inténtalo de nuevo.");
          }
        })
      }
    >
      {pending ? "Abriendo el editor…" : etiqueta}
    </Button>
  );
}
