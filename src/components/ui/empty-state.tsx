import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Estado vacío.
 *
 * El patrón más repetido de la app y el más barato de mejorar: había ONCE
 * estados vacíos y los once eran un párrafo gris dentro de una caja punteada.
 * Cero icono, cero jerarquía, y —lo peor— **la acción quedaba fuera del
 * contenedor**: en el dashboard el texto decía "crea la primera" mientras el
 * botón estaba arriba a la derecha, sin relación visual.
 *
 * El estado vacío es la primera pantalla que ve todo usuario nuevo. Once veces
 * "aquí no hay nada" en gris es la definición operativa de "se siente MVP".
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** La acción va DENTRO del contenedor. Ese es el punto del componente. */
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--ed-radius-lg)] border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-5"
        >
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[length:var(--ed-text-md)]/(--ed-leading-md) font-(--ed-weight-semibold) tracking-(--ed-tracking-md)">
          {title}
        </p>
        {description && (
          <p className="mx-auto max-w-prose text-[length:var(--ed-text-sm)]/(--ed-leading-sm) tracking-(--ed-tracking-sm) text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}

export { EmptyState }
