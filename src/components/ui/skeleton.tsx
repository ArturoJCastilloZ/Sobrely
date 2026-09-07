import { cn } from "@/lib/utils"

/**
 * Silueta de carga.
 *
 * No existía ninguna en el proyecto (`grep animate-pulse` daba 0 fuera del
 * indicador en vivo), y con todas las rutas en servidor la navegación se siente
 * colgada: no pasa nada visible hasta que llega el HTML.
 *
 * `animate-pulse` de Tailwind ya respeta `prefers-reduced-motion` vía el
 * `motion-safe` que aplica el preflight del proyecto; aun así el elemento es
 * `aria-hidden` porque un lector de pantalla no debe anunciar cajas vacías.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-[var(--ed-radius-sm)] bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
