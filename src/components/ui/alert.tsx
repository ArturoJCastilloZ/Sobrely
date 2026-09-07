import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Aviso en línea.
 *
 * Cubre el hueco que hoy tapa `toast.error`: un toast se desvanece, así que
 * sirve para acusar una acción, no para explicar un estado que sigue vigente
 * (un plan agotado, una invitación despublicada, un error de un campo).
 *
 * Los colores salen de los tokens semánticos, no de colores crudos de Tailwind:
 * cada par se verifica contra AA en `semantic-colors.test.ts`.
 */
const alertVariants = cva(
  "relative flex w-full gap-3 rounded-[var(--ed-radius-md)] border p-3.5 text-[length:var(--ed-text-sm)]/(--ed-leading-sm) tracking-(--ed-tracking-sm) [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground [&>svg]:text-muted-foreground",
        info: "border-transparent bg-info-surface text-foreground [&>svg]:text-info",
        success: "border-transparent bg-success-surface text-foreground [&>svg]:text-success",
        warning: "border-transparent bg-warning-surface text-foreground [&>svg]:text-warning",
        destructive: "border-transparent bg-destructive/10 text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      // `status` y no `alert`: `alert` interrumpe al lector de pantalla, y eso
      // solo se justifica cuando algo urgente acaba de pasar. Quien lo necesite
      // puede pasar role="alert".
      role="status"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-(--ed-weight-semibold)", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
