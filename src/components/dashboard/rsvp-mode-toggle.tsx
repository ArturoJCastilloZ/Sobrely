"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setRsvpMode } from "@/lib/guests/actions";
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

  function change(next: Mode) {
    if (next === current || pending) return;
    startTransition(async () => {
      const res = await setRsvpMode(invitationId, next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
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
        Elige cómo confirman tus invitados. La lista de invitados está en todos
        los planes; el número de invitados depende de tu plan.
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
          desc="Invitados nominales, cada uno con su enlace y cupo."
          onClick={() => change("guest_list")}
        />
      </div>
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
  desc,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md border p-3 text-left transition-colors disabled:opacity-60",
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
      </div>
      <p className="mt-1 pl-6 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
