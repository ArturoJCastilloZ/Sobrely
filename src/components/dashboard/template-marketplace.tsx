"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, SearchX, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PROPORCION_MINIATURA,
  REVISION_MINIATURAS,
} from "@/lib/invitations/template-preview";
import {
  contarPorEvento,
  filtrarPlantillas,
  type PlantillaMarketplace,
} from "@/lib/templates/marketplace";
import { UseTemplateButton } from "@/components/dashboard/use-template-button";

/**
 * El MARKETPLACE de plantillas (Fase 4): pastillas por tipo de evento y
 * búsqueda sobre nombre + descripción.
 *
 * Filtra EN CLIENTE y no contra la BD, como prescribe §12 del roadmap: son 50
 * filas, ya vienen todas en la carga del servidor, y así el filtro es
 * instantáneo y sin ida y vuelta. Cuando el catálogo crezca lo suficiente para
 * que 50 dejen de caber en una carga, esto pasa a `pg_trgm`.
 *
 * La lógica no vive aquí sino en `@/lib/templates/marketplace`, y no es un
 * capricho de estructura: la suite de este repo es `environment: node` y sólo
 * recoge `*.test.ts`, así que una función pura se puede probar de verdad
 * (verificada por mutación) mientras que un `.tsx` no se probaría en absoluto.
 *
 * NO hay filtro por estilo. El porqué —medido, no supuesto— está en la
 * cabecera de ese módulo.
 */
export function TemplateMarketplace({
  plantillas,
  eventoInicial,
  consultaInicial,
}: {
  plantillas: PlantillaMarketplace[];
  eventoInicial: string | null;
  consultaInicial: string;
}) {
  const [evento, setEvento] = React.useState<string | null>(eventoInicial);
  const [consulta, setConsulta] = React.useState(consultaInicial);

  /*
    El conteo se calcula sobre la lista COMPLETA, nunca sobre la ya filtrada:
    si se calculara sobre lo filtrado, pulsar «Boda» dejaría las demás
    pastillas en 0 y parecería que el catálogo se vació.
  */
  const conteo = React.useMemo(() => contarPorEvento(plantillas), [plantillas]);
  const visibles = React.useMemo(
    () => filtrarPlantillas(plantillas, { evento, q: consulta }),
    [plantillas, evento, consulta],
  );

  /*
    La URL se sincroniza con `history.replaceState` y NO con el router de Next.
    `router.replace` volvería a ejecutar el server component —otra consulta a
    la BD— para un filtro que ya está resuelto en memoria, y el input perdería
    el foco a media escritura. Aquí sólo se busca que el enlace sea
    compartible y que recargar conserve el filtro; de eso se encarga el
    servidor al leer los `searchParams` en la carga siguiente.
  */
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (evento) params.set("evento", evento);
    else params.delete("evento");
    if (consulta.trim()) params.set("q", consulta);
    else params.delete("q");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [evento, consulta]);

  const hayFiltro = evento !== null || consulta.trim() !== "";
  const limpiar = () => {
    setEvento(null);
    setConsulta("");
  };

  const tipos = [...conteo.keys()].sort((a, b) => a.localeCompare(b, "es"));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/*
          `role="search"` y no un `<form>`: no hay envío, el filtro es en vivo.
          Un form envolvería el input y Enter recargaría la página perdiendo el
          estado por nada.
        */}
        <div role="search" className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar por nombre o descripción"
            aria-label="Buscar plantillas"
            className="pl-8"
          />
          {consulta !== "" && (
            <button
              type="button"
              onClick={() => setConsulta("")}
              aria-label="Borrar la búsqueda"
              className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>

        {/*
          El recuento se anuncia con `aria-live`: para quien usa lector de
          pantalla, teclear en el buscador no produce ninguna señal de que la
          rejilla de abajo cambió.
        */}
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {visibles.length === plantillas.length
            ? `${plantillas.length} plantillas`
            : `${visibles.length} de ${plantillas.length} plantillas`}
        </p>
      </div>

      {/*
        Pastillas de evento como grupo de radio: es una elección ÚNICA, y
        anunciarlas como botones sueltos no diría que elegir una deselecciona
        la anterior.
      */}
      <div className="flex flex-wrap items-center gap-2">
        {/*
          El `radiogroup` envuelve SOLO las pastillas. «Quitar filtros» queda
          fuera a proposito: un grupo de radio que contiene un boton que no es
          radio se le anuncia mal a un lector de pantalla —lo cuenta como una
          opcion mas del grupo— y con las flechas del teclado se navegaria
          hasta el.
        */}
        <div
          role="radiogroup"
          aria-label="Filtrar por tipo de evento"
          className="flex flex-wrap gap-2"
        >
          <Pastilla activa={evento === null} onClick={() => setEvento(null)}>
            Todas <Cuenta n={plantillas.length} />
          </Pastilla>
          {tipos.map((tipo) => (
            <Pastilla
              key={tipo}
              activa={evento === tipo}
              onClick={() => setEvento(evento === tipo ? null : tipo)}
            >
              {tipo} <Cuenta n={conteo.get(tipo) ?? 0} />
            </Pastilla>
          ))}
        </div>
        {/*
          La salida sólo aparece cuando hay algo que quitar. Va aquí y no sólo
          en el estado vacío porque un filtro activo CON resultados también
          esconde parte del catálogo, y sin este botón la única forma de volver
          a verlo todo es adivinar que «Todas» además vacía el buscador — que
          no lo hace.
        */}
        {hayFiltro && (
          <button
            type="button"
            onClick={limpiar}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-3.5" />
            Quitar filtros
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Ninguna plantilla coincide"
          description="Prueba con otras palabras o quita el filtro de tipo de evento."
          action={
            <Button variant="outline" onClick={limpiar}>
              Quitar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((tpl, i) => (
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
                  style={{
                    aspectRatio: `${PROPORCION_MINIATURA[0]} / ${PROPORCION_MINIATURA[1]}`,
                  }}
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
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    /*
                      Las tres primeras candidatas a LCP. El indice es el de la
                      lista YA FILTRADA a proposito: tras filtrar, las tres de
                      arriba son otras, y dejar la prioridad en las tres
                      originales la pondria en tarjetas que ya no se ven.
                    */
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

function Pastilla({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className={cn(
        // Altura 36 y no menos: el canon de la Fase 0 fijo 44px de objetivo
        // tactil para los controles primarios, y estas pastillas se pulsan en
        // movil. El padding vertical del contenedor completa el area.
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        activa
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/*
  La cuenta se hereda el color del padre con opacidad en vez de llevar su
  propio token: sobre la pastilla activa el fondo es `--primary`, y un
  `text-muted-foreground` fijo ahi daria un contraste sin garantia — es
  exactamente la mitad-del-par equivocada que dejo el banner de conflicto a
  1.05 (§7).
*/
function Cuenta({ n }: { n: number }) {
  return <span className="tabular-nums opacity-60">{n}</span>;
}
