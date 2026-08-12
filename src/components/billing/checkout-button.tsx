"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createPlanCheckout } from "@/lib/billing/actions";
import type { PlanCode } from "@/lib/billing/types";

/**
 * Botón que inicia el checkout de un plan por evento y redirige a Mercado Pago.
 * Reutilizable en el editor, `/pricing`, `/billing/checkout` y el dashboard.
 */
export function CheckoutButton({
  planCode,
  invitationId,
  children,
  className,
  variant = "default",
  disabled,
  publishOnPaid = false,
}: {
  planCode: PlanCode;
  invitationId: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
  /** Si el checkout salió del botón "Publicar": auto-publica al pagar. */
  publishOnPaid?: boolean;
}) {
  const [pending, start] = useTransition();

  function go() {
    start(async () => {
      const res = await createPlanCheckout(planCode, invitationId, {
        publishOnPaid,
      });
      if (!res.ok || !res.url) {
        toast.error(res.error ?? "No se pudo iniciar el pago.");
        return;
      }
      window.location.href = res.url;
    });
  }

  return (
    <Button
      onClick={go}
      disabled={disabled || pending}
      className={className}
      variant={variant}
    >
      {pending ? "Redirigiendo a Mercado Pago…" : children}
    </Button>
  );
}
