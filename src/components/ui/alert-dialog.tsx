"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"
import { Button, type buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

/**
 * Confirmación destructiva.
 *
 * Reemplaza a `window.confirm()`, que se usaba en dos borrados reales
 * (eliminar invitado, eliminar firma). El `confirm()` nativo no tiene estilo,
 * en algunos navegadores aparece en inglés, y no se puede explicar la
 * consecuencia — justo en el momento en que el usuario está a punto de
 * destruir un dato. La FUNCIÓN no cambia; cambia el diálogo.
 *
 * A diferencia de `Dialog`, este NO se cierra con clic fuera ni con Escape por
 * accidente: una confirmación destructiva se responde, no se esquiva.
 */
function AlertDialog(props: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger(props: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Popup>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity duration-(--ed-base) ease-(--ed-ease-out) data-closed:opacity-0 data-open:opacity-100"
      />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-[var(--ed-radius-lg)] bg-popover p-6 text-popover-foreground shadow-(--ed-shadow-modal) transition-all duration-(--ed-base) ease-(--ed-ease-emphasis) outline-none data-closed:scale-[0.98] data-closed:opacity-0 data-open:scale-100 data-open:opacity-100",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-1.5", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "text-[length:var(--ed-text-lg)]/(--ed-leading-lg) font-(--ed-weight-semibold) tracking-(--ed-tracking-lg)",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "text-[length:var(--ed-text-sm)]/(--ed-leading-sm) tracking-(--ed-tracking-sm) text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

/** Cancelar. Es la acción SEGURA, así que va primero en el orden de foco. */
function AlertDialogCancel({
  className,
  children = "Cancelar",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Close>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      render={<Button variant="outline" size="touch" />}
      className={className}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Close>
  )
}

/** Confirmar. Tamaño táctil obligatorio: es un control destructivo. */
function AlertDialogAction({
  className,
  variant = "destructive",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Close> &
  Pick<VariantProps<typeof buttonVariants>, "variant">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-action"
      render={<Button variant={variant} size="touch" />}
      className={className}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
}
