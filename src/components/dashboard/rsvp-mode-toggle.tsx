"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FeatureBadge } from "@/components/billing/feature-badge";
import { buttonVariants } from "@/components/ui/button";
import { setRsvpMode } from "@/lib/guests/actions";
import { PLAN_LISTA_DE_INVITADOS } from "@/lib/guests/premium";
import { cn } from "@/lib/utils";

type Mode = "open" | "guest_list";

export function RsvpModeToggle({
  invitationId,
  mode,
  /** Si true (default), refresca la ruta al cambiar (dashboard). En el editor
   * se usa false para no pisar el estado local sin guardar. */
  refresh = true,
  onChange,
}: {
  invitationId: string;
  mode: Mode;
  refresh?: boolean;
  onChange?: (mode: Mode) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<Mode>(mode);
  // Checkout que desbloquea la lista cuando el servidor la rechazó por plan.
  const [mejorarHref, setMejorarHref] = useState<string | null>(null);

  function change(next: Mode) {
    if (next === current || pending) return;
    startTransition(async () => {
      const res = await setRsvpMode(invitationId, next);
      if (!res.ok) {
        // Rechazo por PLAN (solo con la invitación publicada sin Premium; el
        // borrador la arma gratis): es una mejora posible. Se explica en
        // línea con su camino de compra en vez de un toast que se va.
        if (res.mejorarHref) {
          setMejorarHref(res.mejorarHref);
          return;
        }
        toast.error(res.error);
        return;
      }
      setMejorarHref(null);
      setCurrent(next);
      onChange?.(next);
      toast.success(
        next === "guest_list"
          ? "Modo lista de invitados activado."
          : "Modo confirmación abierta activado.",
      );
      if (refresh) router.refresh();
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium">Modo de confirmación</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Elige cómo confirman tus invitados. La lista de invitados, con link
        único y pase QR para cada uno, puedes armarla gratis; para publicar con
        lista de invitados necesitas el plan {PLAN_LISTA_DE_INVITADOS}.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Option
          active={current === "open"}
          disabled={pending}
          title="Confirmación abierta"
          desc="Un formulario público: cualquiera con el enlace confirma."
          onClick={() => change("open")}
        />
        <Option
          active={current === "guest_list"}
          disabled={pending}
          title="Lista de invitados"
          badge={<FeatureBadge feature="guest_management" />}
          desc="Invitados nominales, cada uno con su enlace, cupo y pase QR."
          onClick={() => change("guest_list")}
        />
      </div>
      {mejorarHref && (
        <div
          role="status"
          className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs"
        >
          <p className="font-medium">
            La lista de invitados es del plan {PLAN_LISTA_DE_INVITADOS}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Esta invitación ya está publicada. Mejora su plan para dar a cada
            invitado su enlace y su pase QR, y registrar su ingreso en la
            entrada.
          </p>
          <Link
            href={mejorarHref}
            className={cn(buttonVariants({ size: "sm" }), "mt-2")}
          >
            Mejorar a {PLAN_LISTA_DE_INVITADOS}
          </Link>
        </div>
      )}
      {current === "guest_list" && !refresh && (
        <p className="mt-3 text-xs text-muted-foreground">
          Agrega y edita tus invitados en la pestaña{" "}
          <span className="font-medium">Invitados</span>.
        </p>
      )}
    </div>
  );
}

function Option({
  active,
  disabled,
  title,
  badge,
  desc,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  title: string;
  badge?: ReactNode;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Se queda como <button> nativo A PROPOSITO: es una TARJETA
        // seleccionable de dos lineas, no un boton de accion, y forzarla dentro
        // de `Button` seria pelearse con su layout. Lo que si hereda ahora es
        // el anillo de foco, que era el motivo real por el que un <button>
        // crudo se sentia roto: era navegable por teclado SIN indicador.
        "rounded-[var(--ed-radius-md)] border p-3 text-left transition-colors duration-(--ed-fast) disabled:opacity-60",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:bg-muted",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full border",
            active ? "border-primary" : "border-muted-foreground/40",
          )}
        >
          {active && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm font-medium">{title}</span>
        {badge}
      </div>
      <p className="mt-1 pl-6 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
