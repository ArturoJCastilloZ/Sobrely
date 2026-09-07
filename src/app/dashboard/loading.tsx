import { Skeleton } from "@/components/ui/skeleton";

/**
 * Silueta del panel.
 *
 * Con todas las rutas en servidor, navegar se sentía colgado: no pasaba nada
 * visible hasta que llegaba el HTML. Había UN solo `loading.tsx` en todo el
 * proyecto y su contenido era el texto "Cargando editor…".
 *
 * La silueta imita la forma REAL de la pantalla —encabezado, botón, rejilla de
 * tres tarjetas— porque un esqueleto que no coincide con lo que llega produce
 * un salto de layout, que se siente peor que no poner nada.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-11 w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border p-6">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
