import Image from "next/image";
import Link from "next/link";
import {
  PROPORCION_MINIATURA,
  REVISION_MINIATURAS,
} from "@/lib/invitations/template-preview";
import { hrefVistaPlantilla } from "@/lib/templates/marketplace";
import { formatPrice } from "@/lib/billing/config";
import type { PlantillaLanding } from "@/lib/templates/plantillas-de-evento";

/**
 * Vitrina de plantillas reales en una landing por evento. Componente de
 * SERVIDOR: el HTML ya trae las imágenes y los enlaces a cada ficha, sin el JS
 * del catálogo (filtros, vista rápida). Las miniaturas son las mismas del
 * catálogo (misma URL con `?v=`, misma proporción) y el precio, el mismo que
 * calcula la galería pública.
 *
 * Carga: la vitrina va DEBAJO del hero, así que ninguna imagen es candidata a
 * LCP y todas quedan en `loading="lazy"` (el defecto de `next/image`). La caja
 * con `aspect-ratio` reserva el alto antes de que llegue la imagen: no mueve el
 * layout.
 */
export function PlantillasDeEvento({ plantillas }: { plantillas: PlantillaLanding[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {plantillas.map((tpl) => (
        <li key={tpl.id}>
          <Link
            href={hrefVistaPlantilla(tpl.slug)}
            className="group flex h-full flex-col overflow-clip rounded-xl border border-border bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span
              className="relative block w-full bg-muted"
              style={{
                aspectRatio: `${PROPORCION_MINIATURA[0]} / ${PROPORCION_MINIATURA[1]}`,
              }}
            >
              <Image
                src={`${tpl.preview_image_url}?v=${REVISION_MINIATURAS}`}
                alt={tpl.alt}
                fill
                // 2 columnas en móvil, 3 desde `sm`, 4 desde `lg` dentro de
                // `max-w-5xl` (1024 px): nunca más de ~250 px de ancho.
                sizes="(min-width: 1024px) 250px, (min-width: 640px) 33vw, 50vw"
                className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </span>
            <span className="flex flex-1 flex-col gap-1 p-3">
              <span className="text-sm font-medium">{tpl.name}</span>
              {tpl.precio && (
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatPrice(tpl.precio.precio)}
                  </span>
                  {tpl.precio.precioRegular !== null && (
                    <>
                      <span className="sr-only"> en oferta, antes </span>
                      <s className="ml-1.5 tabular-nums">
                        {formatPrice(tpl.precio.precioRegular)}
                      </s>
                    </>
                  )}{" "}
                  para publicar
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
