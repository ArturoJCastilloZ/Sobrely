import Image from "next/image";
import Link from "next/link";
import { PROPORCION_MINIATURA, REVISION_MINIATURAS } from "@/lib/invitations/template-preview";
import type { PlantillaHero } from "@/components/landing/hero-plantillas";

/**
 * Una plantilla real por tipo de evento, en una tira que se desliza. Reemplaza el «¿qué voy a
 * recibir?» que antes solo respondían los chips de texto (que se conservan debajo: enlazan a
 * las páginas de cada evento y ayudan al SEO). Cada tarjeta lleva a la ficha de la plantilla.
 *
 * Están debajo del pliegue, así que NO llevan `priority`: carga perezosa.
 */
export function MuestraEventos({ items }: { items: PlantillaHero[] }) {
  return (
    <ul
      aria-label="Una plantilla de ejemplo por tipo de evento"
      className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 sm:[justify-content:safe_center]"
    >
      {items.map((p) => (
        <li key={p.slug} className="w-40 shrink-0 snap-start">
          <Link
            href={`/plantillas/${p.slug}`}
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
            <span className="block text-sm text-muted-foreground">{p.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
