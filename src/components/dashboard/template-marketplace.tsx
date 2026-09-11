"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Search, SearchX, X } from "lucide-react";
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
import { toggleFavorite } from "@/lib/templates/favorites-actions";
import { toast } from "sonner";

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
  favoritosIniciales,
  soloFavoritosInicial,
}: {
  plantillas: PlantillaMarketplace[];
  eventoInicial: string | null;
  consultaInicial: string;
  favoritosIniciales: string[];
  soloFavoritosInicial: boolean;
}) {
  const [evento, setEvento] = React.useState<string | null>(eventoInicial);
  const [consulta, setConsulta] = React.useState(consultaInicial);
  const [soloFavoritos, setSoloFavoritos] =
    React.useState(soloFavoritosInicial);
  /*
    Los favoritos viven en estado local para poder marcarlos de forma OPTIMISTA:
    la acción va al servidor y vuelve, y esperar el viaje para pintar el corazón
    hace que el botón se sienta roto. Si el servidor dice que no, se revierte y
    se avisa — nunca se deja la marca mintiendo.
  */
  const [favoritos, setFavoritos] = React.useState<Set<string>>(
    () => new Set(favoritosIniciales),
  );

  const alternarFavorito = (id: string) => {
    const estaba = favoritos.has(id);
    setFavoritos((prev) => {
      const s = new Set(prev);
      if (estaba) s.delete(id);
      else s.add(id);
      return s;
    });
    void toggleFavorite(id).then((r) => {
      if (r.ok) return;
      setFavoritos((prev) => {
        const s = new Set(prev);
        if (estaba) s.add(id);
        else s.delete(id);
        return s;
      });
      toast.error("No se pudo guardar el favorito.");
    });
  };

  /*
    El conteo se calcula sobre la lista COMPLETA, nunca sobre la ya filtrada:
    si se calculara sobre lo filtrado, pulsar «Boda» dejaría las demás
    pastillas en 0 y parecería que el catálogo se vació.
  */
  const conteo = React.useMemo(() => contarPorEvento(plantillas), [plantillas]);
  const visibles = React.useMemo(
    () =>
      filtrarPlantillas(plantillas, {
        evento,
        q: consulta,
        soloFavoritos,
        favoritos,
      }),
    [plantillas, evento, consulta, soloFavoritos, favoritos],
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
    if (soloFavoritos) params.set("favoritas", "1");
    else params.delete("favoritas");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, [evento, consulta, soloFavoritos]);

  const hayFiltro = evento !== null || consulta.trim() !== "" || soloFavoritos;
  const limpiar = () => {
    setEvento(null);
    setConsulta("");
    setSoloFavoritos(false);
  };

  /*
    Orden por CONTEO descendente y no alfabético.

    Medido a 375 px: las 12 pastillas en `flex-wrap` ocupaban 4 filas —168 px—
    antes del primer resultado. Con una sola fila desplazable, el orden decide
    qué se ve sin desplazar, y alfabéticamente lo primero era «Baby shower 12,
    Bautizo 1, Boda 13…»: una categoría de UNA plantilla ocupaba el segundo
    sitio. Por conteo, lo primero son las categorías con catálogo de verdad.

    Las de 1 plantilla (Bautizo, Graduación, Primera comunión) NO se pliegan
    bajo un «Más…»: con la fila desplazable ya no cuestan espacio vertical, y
    esconder categorías enteras del catálogo es una decisión de producto, no
    una de layout. Se quedan al final, que es donde su peso las pone.
    Desempate alfabético para que el orden sea estable entre cargas.
  */
  const tipos = [...conteo.keys()].sort((a, b) => {
    const porConteo = (conteo.get(b) ?? 0) - (conteo.get(a) ?? 0);
    return porConteo !== 0 ? porConteo : a.localeCompare(b, "es");
  });

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
      {/*
        MÓVIL: UNA fila desplazable en horizontal; a partir de `lg`, el
        `flex-wrap` de siempre. Medido a 375x812: envueltas ocupaban 4 filas
        —4×36 + 3×8 = 168 px— antes de que se viera la primera plantilla, sobre
        un catálogo de 65. En una fila son 44.

        El `-mx-4 px-4` sangra el carril hasta los bordes reales de la pantalla
        (el shell mete `px-4`), que es lo que delata que la fila CONTINÚA: un
        carril que termina justo en el margen se lee como una fila completa.
        `pb-1` deja sitio al anillo de foco, que `overflow-x` recortaría.
      */}
      <div className="-mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
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
          // `flex-nowrap` + `shrink-0` en móvil: sin esto las pastillas se
          // comprimirían dentro del carril en vez de desplazarse, y los
          // nombres largos («Primera comunión») se partirían.
          className="flex flex-nowrap gap-2 [&>*]:shrink-0 lg:flex-wrap"
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
          «Favoritas» NO va dentro del radiogroup: es un interruptor
          independiente que se combina con el tipo de evento, no una opción
          más del grupo. Por eso es `aria-pressed` y no `role="radio"`.
        */}
        <button
          type="button"
          aria-pressed={soloFavoritos}
          onClick={() => setSoloFavoritos((v) => !v)}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:h-9",
            soloFavoritos
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          <Heart
            aria-hidden="true"
            className={cn("size-3.5", soloFavoritos && "fill-current")}
          />
          Favoritas <Cuenta n={favoritos.size} />
        </button>
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
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:h-9"
          >
            <X aria-hidden="true" className="size-3.5" />
            Quitar filtros
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icon={soloFavoritos && favoritos.size === 0 ? <Heart /> : <SearchX />}
          title={
            soloFavoritos && favoritos.size === 0
              ? "Todavía no has guardado ninguna"
              : "Ninguna plantilla coincide"
          }
          description={
            soloFavoritos && favoritos.size === 0
              ? "Toca el corazón de una plantilla para tenerla a mano aquí."
              : "Prueba con otras palabras o quita el filtro de tipo de evento."
          }
          action={
            <Button variant="outline" onClick={limpiar}>
              Quitar filtros
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {/*
            DOS COLUMNAS ya desde 375 px, no desde `sm`.

            Medido: la miniatura es 3/4 (`PROPORCION_MINIATURA`), así que a una
            columna ocupa ~343 px de ancho → **457 px sólo de imagen**, y con la
            cabecera y el CTA sale ~600 px por tarjeta. En 812 de alto eso es UNA
            plantilla por pantalla para recorrer un catálogo de 65. A dos
            columnas la imagen baja a ~215 y caben 4.

            `gap-3` en móvil y `gap-4` desde `sm`: con dos columnas a 375 el hueco
            de 16 px se come ancho que la miniatura necesita.
          */}
          {visibles.map((tpl, i) => (
            <Card
              key={tpl.id}
              className="relative flex flex-col overflow-clip pt-0"
            >
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
                    // El tramo móvil pasa de `100vw` a `50vw`: con dos columnas, pedir
                    // el ancho entero de la pantalla descarga una imagen del doble
                    // de lo que se pinta.
                    sizes="(min-width: 1024px) 33vw, 50vw"
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
              {/*
                El corazón va FUERA del `<Link>` de la miniatura, no dentro:
                anidar un botón en un enlace es HTML inválido y el clic acabaría
                navegando a la plantilla en vez de marcarla. Se posiciona sobre
                la tarjeta, que ya es el contexto de apilamiento.

                `aria-pressed` + nombre explícito: un corazón sin texto no dice
                a un lector de pantalla ni qué plantilla es ni en qué estado
                está.
              */}
              <button
                type="button"
                aria-pressed={favoritos.has(tpl.id)}
                aria-label={
                  favoritos.has(tpl.id)
                    ? `Quitar ${tpl.name} de favoritas`
                    : `Guardar ${tpl.name} en favoritas`
                }
                onClick={() => alternarFavorito(tpl.id)}
                className="absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur transition-colors hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Heart
                  aria-hidden="true"
                  className={cn(
                    "size-4",
                    // El relleno es la señal, no el color: en tema oscuro un
                    // rojo sobre superficie translúcida pierde contraste, y el
                    // corazón lleno se distingue del vacío por FORMA.
                    favoritos.has(tpl.id) && "fill-current",
                  )}
                />
              </button>
              <CardHeader className="pt-4">
                {/*
                  A dos columnas la tarjeta mide ~170 px de ancho: el título y
                  la etiqueta en la MISMA línea se parten en dos o tres. En
                  móvil se apilan y la etiqueta baja; desde `sm` vuelve la fila.
                */}
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                  <CardTitle className="text-sm sm:text-base">
                    {tpl.name}
                  </CardTitle>
                  {tpl.event_type && (
                    <Badge variant="secondary">{tpl.event_type}</Badge>
                  )}
                </div>
                {/*
                  La descripción se oculta en móvil: a ~170 px de ancho son 4-5
                  renglones que empujan el CTA fuera de la tarjeta y anulan lo
                  que las dos columnas acaban de ganar. Sigue en el DOM para
                  lectores de pantalla y reaparece desde `sm`.
                */}
                <CardDescription className="sr-only sm:not-sr-only">
                  {tpl.description}
                </CardDescription>
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
        // 44 px en móvil (`h-11`) y 36 a partir de `lg`.
        //
        // El comentario anterior decía que «el padding vertical del contenedor
        // completa el área» hasta los 44 del canon. Era FALSO: el contenedor es
        // `flex flex-wrap items-center gap-2`, sin padding vertical, así que el
        // área real siempre fueron 36. Un comentario que promete una garantía
        // necesita evidencia igual que un veredicto.
        "inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:h-9",
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
