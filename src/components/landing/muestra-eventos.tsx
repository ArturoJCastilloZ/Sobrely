import Image from "next/image";
import Link from "next/link";
import { PROPORCION_MINIATURA, REVISION_MINIATURAS } from "@/lib/invitations/template-preview";
import type { PlantillaHero } from "@/components/landing/hero-plantillas";
import { hrefGaleriaDelEvento } from "@/lib/templates/marketplace";

/**
 * «¿Qué vas a celebrar?» (T17): una plantilla real por tipo de evento, en una tira que se desliza.
 * Cada tarjeta lleva a la galería YA filtrada por ese evento (`/plantillas?evento=…`), un paso
 * menos que antes, cuando llevaba a la ficha de UNA plantilla y la galería arrancaba con las 65
 * sin filtrar. La imagen sigue siendo producto real y no un icono. Los chips de texto que van
 * debajo (en `page.tsx`) se conservan: enlazan a las páginas de cada evento y ayudan al SEO.
 *
 * El conteo sale del mismo catálogo que pinta la galería, no de un número escrito a mano.
 * Están debajo del pliegue, así que NO llevan `priority`: carga perezosa.
 */
export type PlantillaMuestra = PlantillaHero & { total: number };

export function MuestraEventos({ items }: { items: PlantillaMuestra[] }) {
  return (
    <ul
      aria-label="Tipos de evento"
      className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 sm:[justify-content:safe_center]"
    >
      {items.map((p) => (
        <li key={p.slug} className="w-40 shrink-0 snap-start">
          <Link
            href={hrefGaleriaDelEvento(p.event_type)}
            className="group block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span
              style={{ aspectRatio: `${PROPORCION_MINIATURA[0]} / ${PROPORCION_MINIATURA[1]}` }}
              className="relative block overflow-hidden rounded-xl border border-border bg-muted shadow-[0_14px_30px_-20px_rgb(17_24_39/0.5)] transition-transform duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transition-none"
            >
              <Image
                src={`${p.preview_image_url}?v=${REVISION_MINIATURAS}`}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
              />
            </span>
            <span className="mt-2 block text-sm font-semibold text-foreground">{p.event_type}</span>
            <span className="block text-sm text-muted-foreground">
              Ver {p.total} {p.total === 1 ? "plantilla" : "plantillas"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
