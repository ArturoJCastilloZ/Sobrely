import Image from "next/image";
import Link from "next/link";
import { PROPORCION_MINIATURA, REVISION_MINIATURAS } from "@/lib/invitations/template-preview";
import { cn } from "@/lib/utils";

export type PlantillaHero = {
  slug: string;
  name: string;
  event_type: string;
  preview_image_url: string;
};

/**
 * Tres plantillas REALES del catálogo, encimadas, a la derecha del titular. Es la imagen del
 * producto que la portada no tenía: quien llega ve de inmediato qué va a recibir. Cada tarjeta
 * lleva a la ficha de esa plantilla (ahí está «Usar esta plantilla», que abre el editor sin
 * pedir cuenta). Las tres llevan `priority`: están sobre el pliegue, y con carga perezosa las laterales se veían
 * en blanco un instante.
 *
 * Las miniaturas son archivos estáticos locales (`/previews/...`) con la misma revisión `?v=`
 * que la galería, para que el optimizador de Next no sirva versiones viejas.
 */
const POSICIONES = [
  "left-0 top-[12%] -rotate-6 z-0 w-[52%]",
  "left-[24%] top-0 z-10 w-[52%]",
  "left-[48%] top-[14%] rotate-6 z-0 w-[52%]",
] as const;

export function HeroPlantillas({ items }: { items: [PlantillaHero, PlantillaHero, PlantillaHero] }) {
  return (
    <div
      aria-label="Ejemplos de plantillas"
      className="relative mx-auto h-[19rem] w-[92%] max-w-[22rem] sm:h-[26rem] sm:max-w-md"
    >
      {items.map((p, i) => (
        <Link
          key={p.slug}
          href={`/plantillas/${p.slug}`}
          aria-label={`Ver la plantilla ${p.name}, ${p.event_type}`}
          style={{ aspectRatio: `${PROPORCION_MINIATURA[0]} / ${PROPORCION_MINIATURA[1]}` }}
          className={cn(
            "absolute overflow-hidden rounded-2xl border border-border bg-muted",
            "shadow-[0_18px_40px_-18px_rgb(17_24_39/0.45)]",
            "transition-transform duration-300 ease-out hover:-translate-y-1 motion-reduce:transition-none",
            "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            POSICIONES[i],
          )}
        >
          <Image
            src={`${p.preview_image_url}?v=${REVISION_MINIATURAS}`}
            alt=""
            fill
            sizes="(min-width: 640px) 230px, 45vw"
            priority
            className="object-cover"
          />
        </Link>
      ))}
    </div>
  );
}
