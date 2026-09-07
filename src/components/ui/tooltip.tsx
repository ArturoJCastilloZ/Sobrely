"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

/**
 * Tooltip.
 *
 * Antes los botones de icono se apoyaban en el `title=` nativo, que tarda ~1 s,
 * no se puede estilar, no aparece con foco de teclado y en móvil no existe.
 *
 * OJO: un tooltip NO es una etiqueta accesible. Un botón de icono necesita
 * igualmente su `aria-label`; esto es ayuda visual, no sustituto.
 */
function TooltipProvider({ delay = 400, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        className="z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 max-w-64 rounded-[var(--ed-radius-sm)] bg-foreground px-2 py-1 text-[length:var(--ed-text-mini)]/(--ed-leading-mini) tracking-(--ed-tracking-mini) text-background shadow-(--ed-shadow-menu) transition-all duration-(--ed-fast) ease-(--ed-ease-out) data-closed:scale-95 data-closed:opacity-0 data-open:scale-100 data-open:opacity-100",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent }
