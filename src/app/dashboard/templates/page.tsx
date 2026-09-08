import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// La proporción se importa del MISMO sitio del que la lee el script de
// captura: si el hueco reservado aquí y la imagen capturada se separan,
// `object-cover` recorta el diseño sin que falle nada.
import {
  PROPORCION_MINIATURA,
  REVISION_MINIATURAS,
} from "@/lib/invitations/template-preview";
import { UseTemplateButton } from "@/components/dashboard/use-template-button";

export const metadata: Metadata = { title: "Plantillas" };

type Template = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  event_type: string | null;
  preview_image_url: string | null;
};

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    // `preview_image_url` llevaba desde la `0001` sin pedirse aqui: la columna
    // existia, las miniaturas no se mostraban, y la galeria de un producto de
    // diseño no enseñaba ni un diseño.
    .select("id, slug, name, description, event_type, preview_image_url")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const list = (templates ?? []) as Template[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas</h1>
          <p className="text-muted-foreground">
            Elige un diseño para empezar más rápido.
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        /*
          El estado vacio decia «Ejecuta la migración de seed de plantillas» —
          una instruccion de desarrollo mostrada a un cliente que paga. Ahora
          dice lo que el cliente puede HACER, y le deja una salida.
        */
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Todavía no hay plantillas para mostrar</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Puedes empezar con una invitación en blanco y elegir la temática
            desde el editor.
          </p>
          {/*
            `buttonVariants` sobre el Link, y no `<Button asChild>`: el Button
            de este proyecto no implementa `asChild`, asi que envolverlo
            habria compilado en apariencia y roto el enlace.
          */}
          <Link href="/dashboard" className={cn(buttonVariants(), "mt-4")}>
            Crear invitación en blanco
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((tpl, i) => (
            <Card key={tpl.id} className="flex flex-col overflow-clip pt-0">
              {/*
                Miniatura a sangre: `pt-0` en la tarjeta y `overflow-clip` para
                que la imagen llegue al borde redondeado. `overflow-clip` y no
                `hidden` por lo mismo que en el editor — no crea contenedor de
                scroll.
              */}
              {tpl.preview_image_url && (
                <Link
                  href={`/plantilla/${tpl.slug}`}
                  target="_blank"
                  style={{ aspectRatio: `${PROPORCION_MINIATURA[0]} / ${PROPORCION_MINIATURA[1]}` }}
                  className="relative block w-full bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Image
                    // `?v=` con la revision de la tanda. La cache del
                    // optimizador de Next se indexa por URL y las miniaturas
                    // se regeneran EN SU SITIO, asi que sin esto sirve las
                    // viejas hasta 4h — medido, con `X-Nextjs-Cache: HIT` de
                    // una entrada anterior a la regeneracion. La query esta
                    // declarada en `images.localPatterns` del next.config.
                    src={`${tpl.preview_image_url}?v=${REVISION_MINIATURAS}`}
                    // El nombre YA esta como titulo justo debajo, asi que un
                    // alt que lo repita solo hace que un lector de pantalla lo
                    // lea dos veces. El enlace es lo que necesita nombre.
                    alt=""
                    fill
                    // Tres columnas en lg, dos en sm, una en movil: se le dice
                    // a `next/image` para que no sirva la imagen de ancho
                    // completo en una rejilla de tres.
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    // Las tres primeras son las candidatas a LCP: la rejilla
                    // es de tres columnas en escritorio, asi que estan sobre
                    // el pliegue. `next/image` avisaba en consola —«detected
                    // as the Largest Contentful Paint, add loading=eager»—
                    // porque por defecto van en `lazy`, y eso retrasa la
                    // primera pintura util del catalogo. El resto se quedan
                    // perezosas: son 50 imagenes y cargarlas todas de golpe
                    // seria peor que el problema.
                    priority={i < 3}
                    className="object-cover object-top"
                  />
                  <span className="sr-only">Ver {tpl.name} en grande</span>
                </Link>
              )}
              <CardHeader className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  {tpl.event_type && (
                    <Badge variant="secondary">{tpl.event_type}</Badge>
                  )}
                </div>
                <CardDescription>{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <UseTemplateButton templateId={tpl.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
