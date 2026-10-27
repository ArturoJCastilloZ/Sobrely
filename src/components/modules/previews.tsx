"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useEsEditor } from "@/lib/editor/contexto-modo";
import type {
  HeroVariant,
  SectionAlign,
  SectionBleed,
  SectionDivider,
  SectionFrame,
  MediaConfig,
  MediaShape,
  MediaFocal,
  CountdownConfig,
  DresscodeConfig,
  GalleryConfig,
  GiftsConfig,
  HeroConfig,
  HeroBloque,
  TextStyle,
  Desplazamiento,
  ItineraryConfig,
  MapConfig,
  MusicConfig,
  RsvpConfig,
  SignaturesConfig,
  VideoConfig,
  WelcomeConfig,
} from "@/lib/modules/types";
import { FONT_STACKS } from "@/lib/theme/theme";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextReveal } from "@/components/animation/text-reveal";
import { StaggerGroup } from "@/components/animation/stagger-group";
import { PhotoGallery } from "@/components/modules/photo-gallery";
import {
  DRESSCODE_LABELS,
  estiloDeDesplazamiento,
} from "@/lib/modules/types";

const PRIMARY = "var(--inv-primary, var(--primary))";
/**
 * El acento cuando se usa como TEXTO. Derivado por superficie en
 * `themeCssVars` para que alcance AA; `--inv-primary` queda para el color de
 * MARCA (filetes, bordes, rellenos), donde no hay texto que leer.
 *
 * La reserva es `--inv-primary` a propósito: si la variable derivada faltara
 * —una invitación renderizada por un camino que no pase por `themeCssVars`—
 * el texto se pinta como antes en vez de desaparecer.
 */
const ACENTO_TEXTO = "var(--inv-accent-text, var(--inv-primary, var(--primary)))";
const ACENTO_TARJETA = "var(--inv-accent-card, var(--inv-primary, var(--primary)))";
const TINT = "color-mix(in srgb, var(--inv-primary, #888) 7%, transparent)";

/**
 * Section wrapper applying the theme's spacing (and optional accent tint).
 *
 * The tint band spans the full width of the invitation; the content is centered
 * with a readable max-width so on desktop the invitation fills the screen
 * instead of looking like a mobile strip. Container-query variants (`@.../inv`)
 * only fire under the public `@container/inv` context, so the editor preview
 * (which has no such container) keeps its narrow mobile layout unchanged.
 */
/**
 * Clases de alineación (Fase 11 · P1).
 *
 * `center` es la cadena VACÍA a propósito, y es lo que hace que esto sea un
 * cambio de cero píxeles: con el valor por defecto `Section` no emite nada y
 * los 11 sitios de llamada conservan intacto el `className` que ya traían
 * —que no son todos iguales: `WelcomePreview` es un bloque, no un flex—.
 */
const ALIGN_CLASSES: Record<SectionAlign, string> = {
  start: "items-start text-left",
  center: "",
  end: "items-end text-right",
};

/**
 * Marco de papelería (Fase 11 · P5).
 *
 * `none` es la cadena vacía, igual que `ALIGN_CLASSES.center`: es lo que hace
 * que el defecto no emita nada y las 50 no se muevan.
 *
 * El color no va aquí sino en un `style`, porque tiene que salir del tema de la
 * INVITACIÓN (`--inv-primary`) y no de un gris fijo: un filete gris sobre una
 * paleta terracota se ve prestado.
 */
const FRAME_CLASSES: Record<SectionFrame, string> = {
  none: "",
  line: "border p-6 @2xl/inv:p-10",
  double: "border-4 border-double p-6 @2xl/inv:p-10",
  // Regla por dentro del bloque, separada del borde del contenedor: el recurso
  // clásico de la papelería impresa.
  inset: "outline outline-1 -outline-offset-8 p-8 @2xl/inv:p-12",
};

const BLEED_CLASSES: Record<SectionBleed, string> = {
  contained: "",
  full: "max-w-none px-0 @2xl/inv:max-w-none @2xl/inv:px-0",
};

const SHAPE_CLASSES: Record<MediaShape, string> = {
  rect: "rounded-lg",
  circle: "aspect-square rounded-full",
  // El arco de la papelería impresa (la referencia es Greenvelope): recto
  // abajo, semicírculo arriba. Con `border-radius` y no `clip-path` para que
  // no rompa el recorte de la imagen ni cueste una capa de composición.
  arch: "rounded-t-[50%] rounded-b-lg",
};

const FOCAL_CLASSES: Record<MediaFocal, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

/** La imagen del slot, sin la envoltura que decide dónde va. */
function MediaImg({
  media,
  className,
}: {
  media: MediaConfig;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.url}
      // Sin texto alternativo es DECORATIVA, y entonces se esconde del lector de
      // pantalla en vez de anunciarse con un alt inventado.
      alt={media.alt}
      aria-hidden={media.alt ? undefined : true}
      loading="lazy"
      className={cn(
        "h-full w-full object-cover",
        FOCAL_CLASSES[media.focal],
        className,
      )}
    />
  );
}

/**
 * Coloca la imagen alrededor del contenido (Fase 11 · P2).
 *
 * `left`/`right` apilan en móvil y reparten en escritorio: es el «editorial
 * partido» del research dentro del modelo modular, sin lienzo absoluto y con
 * responsive real — que es justo lo que Invitio cede.
 */
function ConMedia({
  media,
  children,
}: {
  media: MediaConfig;
  children: React.ReactNode;
}) {
  const marco = cn("overflow-hidden", SHAPE_CLASSES[media.shape]);

  if (media.position === "background") {
    return (
      <>
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <MediaImg media={media} className="rounded-none" />
          {media.overlay > 0 && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: "var(--inv-bg, #fff)",
                opacity: media.overlay,
              }}
            />
          )}
        </div>
        {children}
      </>
    );
  }

  const figura = (
    <div
      className={cn(marco, "relative w-full")}
      style={
        media.shape === "circle" ? undefined : { aspectRatio: media.ratio }
      }
    >
      <MediaImg media={media} className="rounded-none" />
      {media.overlay > 0 && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundColor: "var(--inv-bg, #fff)",
            opacity: media.overlay,
          }}
        />
      )}
    </div>
  );

  if (media.position === "top" || media.position === "bottom") {
    return (
      <>
        {media.position === "top" && figura}
        {children}
        {media.position === "bottom" && figura}
      </>
    );
  }

  // left / right — el eje horizontal que el renderer no tenía.
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 @2xl/inv:flex-row @2xl/inv:items-center @2xl/inv:gap-10",
        media.position === "right" && "@2xl/inv:flex-row-reverse",
      )}
    >
      <div className="w-full @2xl/inv:w-1/2">{figura}</div>
      <div className="flex w-full flex-col @2xl/inv:w-1/2">{children}</div>
    </div>
  );
}

function Section({
  children,
  tint = false,
  wide = false,
  align = "center",
  bleed = "contained",
  frame = "none",
  divider = "none",
  media,
  className,
  freeMove = false,
  textOffsets,
  textStyles = {},
}: {
  children: React.ReactNode;
  tint?: boolean;
  /** Media-heavy modules (gallery/video) use more of the desktop width. */
  wide?: boolean;
  align?: SectionAlign;
  bleed?: SectionBleed;
  frame?: SectionFrame;
  /** Separador al pie. `none` no emite NADA (ni un nodo). */
  divider?: SectionDivider;
  media?: MediaConfig;
  className?: string;
  /** Movimiento libre del texto (el mismo interruptor que la portada). */
  freeMove?: boolean;
  /**
   * Desplazamientos por ÍNDICE del bloque. Aquí no hay nombres: cada módulo
   * tiene un contenido distinto y `Section` es el único sitio que los ve todos,
   * y sólo los ve como hijos en orden. La contrapartida de anclar a la posición
   * es la prueba que fija el número de bloques de cada módulo.
   */
  textOffsets?: readonly Desplazamiento[];
  /** Overrides de tipografía por índice, persistidos en la configuración. */
  textStyles?: Record<string, TextStyle>;
}) {
  // Sin imagen, `contenido === children`: el árbol renderizado es LITERALMENTE
  // el de antes, sin una envoltura de más. Es lo que permite comprobar por md5
  // que las 50 no se mueven.
  const esEditor = useEsEditor();

  const conMedia = Boolean(media && media.position !== "none" && media.url);

  // Con el interruptor APAGADO no se envuelve nada: el arbol renderizado sigue
  // siendo literalmente el de antes. Es la misma disciplina que el comentario
  // de arriba sobre `media`, y es lo que permite afirmar que una invitacion
  // que no usa esto no se mueve ni un pixel.
  //
  // Con el interruptor apagado PERO dentro del editor si se marca cada hijo,
  // porque sin `data-bloque` no hay nada que seleccionar y las once secciones
  // que no son la portada quedarian muertas al clic (Fase 2).
  //
  // Y se marca CLONANDO el hijo, no envolviendolo: `cloneElement` solo anade un
  // ATRIBUTO, asi que no entra un nodo nuevo en el arbol y no se mueve ni un
  // pixel. Envolver en un `div` —como hace la rama de `freeMove`— si cambiaria
  // el layout de un contenedor `flex` o `space-y`.
  //
  // La pagina publica no provee `ModoEditorProvider`, asi que ahi `esEditor` es
  // `false` y el arbol renderizado sigue siendo LITERALMENTE el de antes. Es lo
  // que permite comprobar por md5 que las 18 no se mueven.
  const hayEstilosDeTexto = Object.values(textStyles).some(
    (style) => Object.keys(style).length > 0,
  );
  const estiloDelBloque = (indice: number): React.CSSProperties => {
    const style = textStyles[String(indice)];
    if (!style || Object.keys(style).length === 0) return {};
    return {
      ...(style.font ? { fontFamily: FONT_STACKS[style.font] } : {}),
      ...(style.color ? { color: style.color } : {}),
      ...(style.size ? { fontSize: `${style.size}rem` } : {}),
      ...(style.weight ? { fontWeight: style.weight } : {}),
      ...(style.letterSpacing !== undefined
        ? { letterSpacing: `${style.letterSpacing}em` }
        : {}),
      ...(style.lineHeight ? { lineHeight: style.lineHeight } : {}),
      ...(style.transform ? { textTransform: style.transform } : {}),
      ...(style.align
        ? {
            // Los hijos de Section viven en un flex con `items-center`: sin
            // estirar el bloque, un título mide solo su texto y alinear a la
            // izquierda/derecha no tiene ningún espacio visible donde actuar.
            alignSelf: "stretch",
            width: "100%",
            textAlign: style.align,
            justifyContent:
              style.align === "left"
                ? "flex-start"
                : style.align === "right"
                  ? "flex-end"
                  : "center",
          }
        : {}),
    };
  };

  const hijoConEstilo = (hijo: React.ReactNode, indice: number) =>
    React.isValidElement(hijo)
      ? (() => {
          const elemento = hijo as React.ReactElement<Record<string, unknown>>;
          return React.cloneElement(elemento, {
            style: {
              ...(elemento.props.style as React.CSSProperties | undefined),
              ...estiloDelBloque(indice),
            },
          });
        })()
      : hijo;

  const colocables = freeMove
    ? React.Children.toArray(children).map((hijo, i) => {
        const d = textOffsets?.[i];
        return (
          <div
            key={i}
            data-bloque={String(i)}
            style={estiloDeDesplazamiento(true, d)}
          >
            {hijoConEstilo(hijo, i)}
          </div>
        );
      })
    : esEditor || hayEstilosDeTexto
      ? React.Children.toArray(children).map((hijo, i) =>
          // Un hijo que no sea elemento (una cadena suelta) no admite atributo.
          // Se deja pasar SIN marcar en vez de envolverlo: envolverlo cambiaria
          // el layout, y el indice se conserva igual porque `toArray` no mueve
          // a los demas. Ese bloque simplemente no sera seleccionable.
          React.isValidElement(hijo)
            ? React.cloneElement(
                hijoConEstilo(hijo, i) as React.ReactElement<Record<string, unknown>>,
                { "data-bloque": String(i) },
              )
            : hijo,
        )
      : children;

  const cuerpo = conMedia ? (
    <ConMedia media={media!}>{colocables}</ConMedia>
  ) : (
    colocables
  );

  // El marco envuelve el CONTENIDO, no el contenedor de la seccion.
  //
  // Estaba al reves y se veia solo en movil: el contenedor es a sangre por
  // debajo del breakpoint, asi que el borde tocaba los dos lados de la pantalla
  // y la pieza dejaba de leerse como tarjeta. Medido sobre `xv-seda`: a 1200 px
  // el marco media 896 con 152 de margen a cada lado; a 375 px media 375 con
  // margen CERO.
  //
  // Envolviendo el contenido, el marco queda dentro del `px-6`/`px-10` del
  // contenedor y se separa de los bordes en CUALQUIER ancho, sin pelearse con
  // el `mx-auto` que centra la seccion — un `mx-4` habria BORRADO ese
  // `mx-auto`, porque tailwind-merge los pone en el mismo grupo.
  //
  // `w-full` porque casi todos los sitios de llamada son `flex items-center`, y
  // sin el el marco se encogeria al ancho de su contenido.
  const contenido =
    frame === "none" ? (
      cuerpo
    ) : (
      <div
        className={cn("w-full", FRAME_CLASSES[frame])}
        style={{
          borderColor:
            "color-mix(in srgb, var(--inv-primary, #888) 35%, transparent)",
          outlineColor:
            "color-mix(in srgb, var(--inv-primary, #888) 35%, transparent)",
        }}
      >
        {cuerpo}
      </div>
    );

  return (
    <section
      className="w-full"
      style={{
        ...(tint ? { backgroundColor: TINT } : {}),
        // `textOffsets` se expresa en cqw. Sin este contenedor, cqw busca un
        // ancestro (a menudo el lienzo completo) y el bloque recorre más que
        // el puntero. La portada ya lo declaraba; faltaba el camino modular.
        ...(freeMove ? { containerType: "inline-size" } : {}),
      }}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-xl px-6 [padding-block:var(--inv-space,2.5rem)] @2xl/inv:px-10 @4xl/inv:[padding-block:calc(var(--inv-space,2.5rem)*1.6)]",
          wide
            ? "@2xl/inv:max-w-5xl"
            : "@2xl/inv:max-w-2xl @4xl/inv:max-w-3xl @5xl/inv:max-w-4xl",
          className,
          // DESPUÉS del className del llamador, y no antes: `cn` resuelve con
          // tailwind-merge y gana la última, así que una alineación explícita
          // tiene que poder BORRAR el `items-center text-center` que el sitio
          // de llamada trae escrito. Con los defectos ambas son "" y el
          // resultado es, literalmente, el de antes.
          ALIGN_CLASSES[align],
          BLEED_CLASSES[bleed],
          // `relative` solo con fondo: es el bloque contenedor de la capa
          // absoluta. Condicional para no tocar el camino por defecto.
          conMedia && media!.position === "background" && "relative",
        )}
      >
        {/* Con `none` el hijo es EXACTAMENTE `contenido`, una sola posicion,
            igual que antes de existir este campo.
            
            No vale `{contenido}{cond ? <Separador/> : null}`: aunque el `null`
            no pinte nada, anade una POSICION al arbol de React y eso corre los
            `useId` de los `<Label>`/`<Input>`. `rsvp` es el unico modulo con
            formulario y su md5 se movia — medido, no supuesto: sin el cambio
            42dc3c75…, con el 'ef85e574…', y el HTML no traia separador alguno.
            Lo cazo la prueba de identidad. */}
        {divider === "none" ? (
          contenido
        ) : (
          <>
            {contenido}
            <Separador variante={divider} />
          </>
        )}
      </div>
    </section>
  );
}

/**
 * El separador al pie de una seccion.
 *
 * Hereda el color por `--inv-primary` con el MISMO `color-mix` al 35 % que el
 * marco. Un valor propio habria hecho que dos adornos de la misma seccion no
 * combinaran, y el color del marco ya esta afinado contra los 20 packs.
 *
 * `aria-hidden` porque no aporta contenido: quien navega con lector de pantalla
 * no gana nada oyendo «imagen» entre dos secciones.
 */
function Separador({ variante }: { variante: Exclude<SectionDivider, "none"> }) {
  const tinta = "color-mix(in srgb, var(--inv-primary, #888) 35%, transparent)";
  if (variante === "line") {
    return (
      <hr
        aria-hidden
        className="mx-auto mt-8 w-16 border-0 border-t @2xl/inv:mt-10"
        style={{ borderColor: tinta }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="mt-8 flex items-center justify-center gap-3 @2xl/inv:mt-10"
      style={{ color: tinta }}
    >
      <span className="h-px w-10 bg-current" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px w-10 bg-current" />
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---- Hero -----------------------------------------------------------------

/**
 * Clases de la portada por variante (Fase 11 · P3).
 *
 * `centered` es la cadena EXACTA que tenía el hero antes de esto — copiada, no
 * recompuesta— porque es el defecto de las 50 y cualquier reordenamiento de
 * clases es un cambio que habría que justificar.
 */
const HERO_SECTION_CLASSES: Record<HeroVariant, string> = {
  centered:
    "relative flex min-h-[260px] flex-col items-center justify-center gap-3 overflow-hidden px-6 py-12 text-center @2xl/inv:min-h-[460px] @2xl/inv:py-20 @4xl/inv:min-h-[70svh]",
  offset:
    "relative flex min-h-[260px] flex-col items-start justify-end gap-3 overflow-hidden px-6 py-12 text-left @2xl/inv:min-h-[460px] @2xl/inv:px-12 @2xl/inv:py-20 @4xl/inv:min-h-[70svh]",
  split:
    "relative flex flex-col items-center gap-6 overflow-hidden px-6 py-12 text-center @2xl/inv:min-h-[460px] @2xl/inv:flex-row @2xl/inv:items-center @2xl/inv:gap-10 @2xl/inv:px-12 @2xl/inv:py-16 @2xl/inv:text-left",
  editorial:
    "relative flex flex-col items-start gap-6 overflow-hidden px-6 py-12 text-left @2xl/inv:px-12 @2xl/inv:py-20",
  plain:
    "relative flex min-h-[260px] flex-col items-center justify-center gap-3 overflow-hidden px-6 py-16 text-center @2xl/inv:min-h-[420px] @2xl/inv:py-24",
};

const HERO_TEXTO_CLASSES: Record<HeroVariant, string> = {
  centered:
    "relative flex max-w-3xl flex-col items-center gap-3 @2xl/inv:gap-5",
  offset: "relative flex max-w-xl flex-col items-start gap-3 @2xl/inv:gap-5",
  split:
    "relative order-1 flex flex-col items-center gap-3 @2xl/inv:order-2 @2xl/inv:w-1/2 @2xl/inv:items-start @2xl/inv:gap-5",
  editorial:
    "relative order-1 flex max-w-3xl flex-col items-start gap-3 @2xl/inv:gap-5",
  plain: "relative flex max-w-2xl flex-col items-center gap-4 @2xl/inv:gap-6",
};

/** Atajo local: la función pura vive en `types.ts` para poder probarla. */
const desplazamientoStyle = (config: HeroConfig, bloque: HeroBloque) =>
  estiloDeDesplazamiento(config.freeMove, config.textOffsets[bloque]);

/** Convierte el override persistido en estilos del texto de portada. */
function estiloDeTexto(style: TextStyle, colorBase: string): React.CSSProperties {
  return {
    color: style.color ?? colorBase,
    ...(style.font ? { fontFamily: FONT_STACKS[style.font] } : {}),
    ...(style.size ? { fontSize: `${style.size}rem` } : {}),
    ...(style.weight ? { fontWeight: style.weight } : {}),
    ...(style.letterSpacing !== undefined
      ? { letterSpacing: `${style.letterSpacing}em` }
      : {}),
    ...(style.lineHeight ? { lineHeight: style.lineHeight } : {}),
    ...(style.transform ? { textTransform: style.transform } : {}),
    ...(style.align
      ? {
          alignSelf: "stretch",
          width: "100%",
          textAlign: style.align,
          justifyContent:
            style.align === "left"
              ? "flex-start"
              : style.align === "right"
                ? "flex-end"
                : "center",
        }
      : {}),
  };
}

function HeroPreviewBase({
  config,
  animate = false,
  ctaHref,
  infoEvento,
}: {
  config: HeroConfig;
  animate?: boolean;
  /** `#ancla` a la que lleva la etiqueta; sin él (editor, vista previa) sigue siendo un rótulo. */
  ctaHref?: string;
  /** «12 de junio de 2027 · Hacienda Los Laureles», derivada de la fecha y la ubicación. */
  infoEvento?: string;
}) {
  const title = config.title || "Nuestra celebración";

  // La foto es TELÓN sólo en dos variantes; en las otras es una figura
  // contenida, o no se pinta.
  const fotoDeFondo =
    config.variant === "centered" || config.variant === "offset";
  const fotoContenida =
    config.variant === "split" || config.variant === "editorial";
  const conFoto = Boolean(config.imageUrl);
  const sobreFoto = fotoDeFondo && conFoto;

  return (
    <section
      className={HERO_SECTION_CLASSES[config.variant]}
      // Con la foto a sangre no hay tinte; sin ella sí. En `plain` siempre lo
      // hay, aunque la invitación traiga imagen: la variante la ignora a
      // propósito.
      //
      // `containerType` sólo con el movimiento libre encendido: es lo que hace
      // que `cqw` de los bloques resuelva contra ESTA sección y no contra un
      // ancestro. MEDIDO en el navegador: no saca el contenido del flujo, así
      // que la altura de la portada no cambia y el diseño elegido se mantiene.
      // Se pone condicional para no crear un contexto de contención en las
      // invitaciones que no lo usan.
      style={{
        ...(sobreFoto ? {} : { backgroundColor: TINT }),
        ...(config.freeMove ? { containerType: "inline-size" } : {}),
      }}
    >
      {fotoDeFondo && conFoto && (
        <div
          className={cn("absolute inset-0", animate && "inv-kenburns")}
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,${config.overlay}),rgba(0,0,0,${config.overlay})), url(${config.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {fotoContenida && conFoto && (
        <div
          className={
            config.variant === "split"
              ? // `order-2` en móvil: el título va PRIMERO cuando la portada
                // apila. Sin esto la foto ocupa 560 px a 420 de ancho con
                // proporción 3/4 —exactamente el alto del recorte de la
                // miniatura— y la plantilla se anunciaba en el catálogo con una
                // foto y CERO texto. Medido, y visto en la hoja de contacto.
                "relative order-2 w-full overflow-hidden rounded-lg @2xl/inv:order-1 @2xl/inv:w-1/2"
              : "relative order-2 w-full max-w-md overflow-hidden rounded-lg"
          }
          style={{
            // `auto` = el valor de siempre por variante. Cualquier otro lo pone
            // la plantilla, para que la caja coincida con la fuente y no se
            // recorte a ciegas.
            aspectRatio:
              config.imageRatio !== "auto"
                ? config.imageRatio
                : config.variant === "split"
                  ? "3/4"
                  : "4/3",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.imageUrl}
            alt=""
            aria-hidden
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className={HERO_TEXTO_CLASSES[config.variant]}>
        <h2
          data-bloque="title"
          className="text-3xl font-bold tracking-tight @2xl/inv:text-5xl @4xl/inv:text-6xl @5xl/inv:text-7xl"
          style={{
            ...estiloDeTexto(config.textStyles.title, sobreFoto ? "#fff" : "inherit"),
            ...desplazamientoStyle(config, "title"),
          }}
        >
          {animate ? <TextReveal text={title} variant="text-rise" /> : title}
        </h2>
        {config.subtitle && (
          <p
            data-bloque="subtitle"
            className="text-base @2xl/inv:text-xl @4xl/inv:text-2xl @5xl/inv:text-3xl"
            style={{
              ...estiloDeTexto(
                config.textStyles.subtitle,
                sobreFoto ? "rgba(255,255,255,.9)" : "inherit",
              ),
              ...desplazamientoStyle(config, "subtitle"),
            }}
          >
            {config.subtitle}
          </p>
        )}
        {infoEvento && (
          <p
            data-bloque="info"
            className={cn(
              "text-sm font-medium @2xl/inv:text-lg @4xl/inv:text-xl",
              // La misma PLACA que lleva el epígrafe (ver abajo): sobre una sección plana es invisible y
              // solo se ve donde hay arte detrás, que es donde la fecha chocaba (medido: con nombres
              // largos la línea baja sobre el adorno en 9 plantillas). Sobre foto no se pone.
              !sobreFoto && "rounded-xl px-3 py-0.5",
            )}
            style={{
              color: sobreFoto ? "rgba(255,255,255,.95)" : "inherit",
              ...(sobreFoto ? {} : { backgroundColor: "var(--inv-bg)" }),
            }}
          >
            {infoEvento}
          </p>
        )}
        {config.ctaLabel && (
          <div
            data-bloque="cta"
            className="mt-3 flex items-center gap-3 @2xl/inv:mt-5 @2xl/inv:gap-4"
            style={{
              ...estiloDeTexto(
                config.textStyles.cta,
                sobreFoto ? "rgba(255,255,255,.92)" : ACENTO_TEXTO,
              ),
              ...desplazamientoStyle(config, "cta"),
            }}
          >
            <span
              aria-hidden
              className="h-px w-8 @2xl/inv:w-12 @4xl/inv:w-16"
              style={{ backgroundColor: "currentColor", opacity: 0.5 }}
            />
            {(() => {
              const Etiqueta = ctaHref ? "a" : "span";
              return (
            <Etiqueta
              {...(ctaHref ? { href: ctaHref } : {})}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-[0.3em] @2xl/inv:px-3 @2xl/inv:text-sm @4xl/inv:text-base",
                // Enlace: el área de toque crece a 44 px de alto sin cambiar el aspecto de la placa.
                ctaHref &&
                  "relative after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4",
              )}
              style={
                // La PLACA del epigrafe, y se auto-oculta.
                //
                // El epigrafe es texto de 12px con `tracking-[0.3em]` y cae
                // sobre el TELON, no sobre un color plano. Medido con
                // `scripts/verificar-contraste-en-vivo.mts` sobre los pixeles
                // de glifo: 128 casos bajo AA, TODOS este texto, y el peor en
                // 1.26 (`boda-elegante`).
                //
                // El velo NO lo arregla, y esta medido antes de descartarlo:
                // pedia una mediana de 0.85 —que borra el arte— y en 30
                // plantillas no llegaba ni al 95 %. La razon es que el velo
                // converge al color de fondo, que es justo contra el que ya se
                // derivo el acento: pelea la misma batalla desde el lado malo.
                //
                // La placa hace la superficie DETERMINISTA. Y como su color es
                // `--inv-bg`, sobre una seccion plana —que se pinta con ese
                // mismo color— es INVISIBLE: sale unicamente donde hay telon
                // detras, que es exactamente donde hacia falta.
                //
                // Sobre FOTO no se pone: ahi el texto es blanco sobre el
                // degradado del hero, que es otro mecanismo.
                sobreFoto ? undefined : { backgroundColor: "var(--inv-bg)" }
              }
            >
              {config.ctaLabel}
            </Etiqueta>
              );
            })()}
            <span
              aria-hidden
              className="h-px w-8 @2xl/inv:w-12 @4xl/inv:w-16"
              style={{ backgroundColor: "currentColor", opacity: 0.5 }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Welcome --------------------------------------------------------------

function WelcomePreviewBase({ config }: { config: WelcomeConfig }) {
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      className="text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Bienvenidos"}
      </h3>
      {config.message && (
        <p className="mx-auto mt-2 max-w-prose whitespace-pre-line text-sm opacity-80 @2xl/inv:text-base @4xl/inv:text-lg @5xl/inv:text-2xl">
          {config.message}
        </p>
      )}
    </Section>
  );
}

// ---- Countdown ------------------------------------------------------------

function CountdownPreviewBase({
  config,
  eventDate = "",
  editorHint = false,
}: {
  config: CountdownConfig;
  eventDate?: string;
  /**
   * Solo el EDITOR muestra los avisos dirigidos al anfitrión. En la página
   * pública —y en las miniaturas del catálogo, que se capturan contra ella—
   * un módulo sin datos no debe pedirle nada al invitado.
   */
  editorHint?: boolean;
}) {
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const raf = requestAnimationFrame(update);
    const t = setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  const targetStr = config.useEventDate ? eventDate : config.targetDate;
  const target = targetStr ? new Date(targetStr).getTime() : NaN;
  const valid = !Number.isNaN(target);
  const diff = valid ? Math.max(0, target - now) : 0;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const countdownVariant = config.variant;
  const countdownLabels = {
    short: ["días", "hrs", "min", "seg"],
    full: ["días", "horas", "minutos", "segundos"],
    initials: ["D", "H", "M", "S"],
  }[config.labelStyle ?? "short"];
  const countdownNumberWeight = {
    medium: "font-medium",
    bold: "font-bold",
    black: "font-black",
  }[config.numberWeight ?? "bold"];
  // El bloque «Cuenta atrás» se puede estilizar desde el inspector. Las cifras
  // tenían color/tamaño locales y lo ignoraban; se replica aquí el override
  // para que el feedback en el lienzo sea fiel. `numberFont` gana a propósito:
  // es el control específico de las cifras dentro de este mismo módulo.
  const countdownTextStyle = config.textStyles["1"] ?? {};
  const countdownLayout = {
    cards: "gap-2 @2xl/inv:gap-4",
    outline: "gap-2 @2xl/inv:gap-4",
    minimal: "gap-4 @2xl/inv:gap-7",
    circles: "gap-2 @2xl/inv:gap-4",
    poster: "gap-2 @2xl/inv:gap-4",
    timeline: "gap-0 divide-x divide-[color:var(--inv-primary)]",
    split: "grid w-full max-w-sm grid-cols-2 gap-2 @2xl/inv:max-w-md @2xl/inv:gap-4",
    pill: "gap-2 @2xl/inv:gap-4",
    ribbon: "gap-1 @2xl/inv:gap-2",
    stamp: "gap-2 @2xl/inv:gap-4",
  }[countdownVariant];
  const countdownCell = {
    // Esta cadena conserva LITERALMENTE el render de las plantillas actuales.
    cards: "flex min-w-[64px] flex-col items-center rounded-lg bg-[var(--inv-card)] px-3 py-2 shadow-sm @2xl/inv:min-w-[92px] @2xl/inv:px-5 @2xl/inv:py-3 @4xl/inv:min-w-[120px] @4xl/inv:px-7 @4xl/inv:py-4",
    outline: "flex min-w-[64px] flex-col items-center justify-center rounded-lg border-2 bg-transparent px-3 py-2 @2xl/inv:min-w-[92px] @2xl/inv:px-5 @2xl/inv:py-3",
    minimal: "flex min-w-12 flex-col items-center justify-center border-b-2 px-1 pb-1 @2xl/inv:min-w-20",
    circles: "flex size-16 flex-col items-center justify-center rounded-full border-2 bg-[var(--inv-card)] @2xl/inv:size-24 @4xl/inv:size-30",
    poster: "flex min-w-16 flex-col items-center justify-center rounded-md bg-[var(--inv-primary)] px-3 py-2 text-white shadow-md @2xl/inv:min-w-24 @2xl/inv:px-5 @2xl/inv:py-3",
    timeline: "flex min-w-14 flex-col items-center justify-center px-2 py-1.5 @2xl/inv:min-w-20 @2xl/inv:px-4",
    split: "flex min-w-0 flex-col items-center justify-center rounded-sm border bg-[var(--inv-card)] px-3 py-2 shadow-sm @2xl/inv:px-5 @2xl/inv:py-3",
    pill: "flex min-w-16 flex-col items-center justify-center rounded-full border-2 bg-[var(--inv-card)] px-3 py-2 @2xl/inv:min-w-24 @2xl/inv:px-5 @2xl/inv:py-3",
    ribbon: "flex min-w-14 flex-col items-center justify-center border-y-4 bg-[var(--inv-card)] px-2 py-2 @2xl/inv:min-w-20 @2xl/inv:px-4 @2xl/inv:py-3",
    stamp: "flex size-16 flex-col items-center justify-center rounded-full border-2 border-dashed bg-[var(--inv-card)] @2xl/inv:size-24 @4xl/inv:size-30",
  }[countdownVariant];

  const cell = (value: number, label: string) => (
    <div
      className={countdownCell}
      style={
        countdownVariant === "outline" || countdownVariant === "minimal" || countdownVariant === "circles" || countdownVariant === "split" || countdownVariant === "pill" || countdownVariant === "ribbon" || countdownVariant === "stamp"
          ? { borderColor: ACENTO_TARJETA }
          : undefined
      }
    >
      <span
        className={`text-2xl ${countdownNumberWeight} tabular-nums @2xl/inv:text-4xl @4xl/inv:text-5xl`}
        style={{
          ...estiloDeTexto(
            countdownTextStyle,
            countdownVariant === "poster" ? "currentColor" : ACENTO_TARJETA,
          ),
          ...(config.numberFont ? { fontFamily: FONT_STACKS[config.numberFont] } : {}),
        }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs opacity-70 @2xl/inv:text-sm @4xl/inv:text-base">
        {label}
      </span>
    </div>
  );

  // Sin fecha valida no hay cuenta atras que mostrar. En el editor se explica
  // por que; en publico el modulo se OMITE entero, porque «Faltan» seguido de
  // nada parece un error y una instruccion al anfitrion no es asunto del
  // invitado.
  //
  // Se vio mirando el catalogo con las miniaturas puestas. Las cifras, para
  // que nadie las infle: **40 de 50 plantillas** tienen el modulo de mapa sin
  // direccion —y por tanto exhibian la instruccion en su pagina publica—, pero
  // al regenerar solo cambiaron **4 miniaturas**, las del seed original con
  // contenido mas escueto, porque en las demas el modulo cae por debajo del
  // recorte de 560px. Plantillas afectadas y miniaturas afectadas NO son el
  // mismo numero.
  if (!valid) {
    if (!editorHint) return null;
    return (
      <Section
        align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
        bleed={config.bleed}
        media={config.media}
        frame={config.frame}
      divider={config.divider}
        tint
        className="flex flex-col items-center gap-4 text-center"
      >
        <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
          {config.title || "Faltan"}
        </h3>
        <p className="text-sm opacity-70">
          Define la fecha del evento para activar la cuenta regresiva.
        </p>
      </Section>
    );
  }

  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      tint
      className="flex flex-col items-center gap-4 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Faltan"}
      </h3>
      {countdownVariant === "poster" ? (
        <div className="flex w-full max-w-md items-stretch justify-center gap-2 @2xl/inv:gap-4">
          {cell(days, countdownLabels[0])}
          <div className="grid flex-1 grid-cols-3 gap-2 @2xl/inv:gap-3">
            {cell(hours, countdownLabels[1])}
            {cell(minutes, countdownLabels[2])}
            {cell(seconds, countdownLabels[3])}
          </div>
        </div>
      ) : (
        <div className={cn("flex flex-wrap justify-center", countdownLayout)}>
          {cell(days, countdownLabels[0])}
          {cell(hours, countdownLabels[1])}
          {cell(minutes, countdownLabels[2])}
          {cell(seconds, countdownLabels[3])}
        </div>
      )}
    </Section>
  );
}

// ---- Map ------------------------------------------------------------------

function MapPreviewBase({
  config,
  editorHint = false,
}: {
  config: MapConfig;
  /** Ver `CountdownPreview`: los avisos al anfitrión son solo del editor. */
  editorHint?: boolean;
}) {
  const esEditor = useEsEditor();
  // Sin direccion NI nombre del lugar el modulo no tiene contenido: en publico
  // se omite, en el editor se explica.
  if (!config.address && !config.venueName && !editorHint) return null;
  const mapsUrl = config.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`
    : "";
  const mapsActionStyle = config.mapsActionStyle ?? "link";
  const mapLayout = {
    classic: "",
    card: "rounded-2xl bg-[var(--inv-card)] p-6 shadow-sm",
    editorial: "border-l-4 border-[color:var(--inv-primary)] bg-[color-mix(in_srgb,var(--inv-primary)_6%,transparent)] p-6",
  }[config.variant ?? "classic"];
  const mapsActionClass = {
    link: "text-sm underline underline-offset-4 @2xl/inv:text-base @4xl/inv:text-lg",
    button: "rounded-md px-4 py-2 text-sm font-medium text-white @2xl/inv:text-base",
    pill: "rounded-full px-4 py-2 text-sm font-medium text-white @2xl/inv:text-base",
  }[mapsActionStyle];
  const mapsActionVisual = mapsActionStyle === "link"
    ? { color: ACENTO_TEXTO }
    : { backgroundColor: PRIMARY };
  const addressTextStyle = config.textStyles["2"];
  const addressStyle = addressTextStyle && Object.keys(addressTextStyle).length > 0
    ? estiloDeTexto(addressTextStyle, "inherit")
    : undefined;
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      className={cn("flex flex-col items-center gap-2 text-center", mapLayout)}
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Ubicación"}
      </h3>
      {config.venueName && (
        <p className="font-medium @2xl/inv:text-lg @4xl/inv:text-xl @5xl/inv:text-2xl">
          {config.venueName}
        </p>
      )}
      {config.address ? (
        <>
          <p
            // El Fragmento que agrupa dirección + enlace no reenvía atributos
            // de `cloneElement`. Marcamos el texto real sólo en editor (y no
            // en freeMove, donde Section ya provee la ancla canónica).
            data-bloque={esEditor && !config.freeMove ? "2" : undefined}
            className="text-sm opacity-70 @2xl/inv:text-base @4xl/inv:text-lg"
            style={addressStyle}
          >
            {config.address}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={mapsActionClass}
            style={mapsActionVisual}
          >
            Ver en Google Maps
          </a>
        </>
      ) : (
        // El nombre del lugar SI es contenido util para el invitado, asi que
        // se conserva arriba; lo que se calla en publico es la instruccion.
        editorHint && (
          <p className="text-sm opacity-70">Agrega la dirección del lugar.</p>
        )
      )}
    </Section>
  );
}

// ---- Gallery --------------------------------------------------------------

function GalleryPreviewBase({
  config,
  animate = false,
  editorHint = false,
}: {
  config: GalleryConfig;
  animate?: boolean;
  /** Ver `MapPreview`: los avisos al anfitrión son solo del editor. */
  editorHint?: boolean;
}) {
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      wide
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Galería"}
      </h3>
      {config.images.length === 0 ? (
        editorHint ? (
          <p className="text-sm opacity-70">Agrega fotos a tu galería.</p>
        ) : null
      ) : (
        <PhotoGallery
          images={config.images}
          layout={config.layout}
          lightbox={config.lightbox}
          kenBurns={config.kenBurns}
          animate={animate}
        />
      )}
    </Section>
  );
}

// ---- Video ----------------------------------------------------------------

/** Returns an embeddable URL for YouTube/Vimeo, or "" if unsupported. */
export function toEmbedUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

function VideoPreviewBase({
  config,
  editorHint = false,
}: {
  config: VideoConfig;
  /** Ver `MapPreview`: los avisos al anfitrión son solo del editor. */
  editorHint?: boolean;
}) {
  const embed = toEmbedUrl(config.url);
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      wide
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Video"}
      </h3>
      {embed ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg @2xl/inv:rounded-xl">
          <iframe
            src={embed}
            title={config.title || "Video"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : editorHint ? (
        <p className="text-sm opacity-70">Pega un enlace de YouTube o Vimeo.</p>
      ) : null}
    </Section>
  );
}

// ---- Itinerary ------------------------------------------------------------

function ItineraryPreviewBase({
  config,
  animate = false,
  editorHint = false,
}: {
  config: ItineraryConfig;
  animate?: boolean;
  /** Ver `MapPreview`: los avisos al anfitrión son solo del editor. */
  editorHint?: boolean;
}) {
  const items = config.items.filter((i) => i.time || i.label);
  const itineraryVariant = config.variant ?? "cards";
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      tint
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Itinerario"}
      </h3>
      {items.length === 0 ? (
        editorHint ? (
          <p className="text-sm opacity-70">Agrega los horarios del evento.</p>
        ) : null
      ) : itineraryVariant === "cards" ? (
        <StaggerGroup
          enabled={animate}
          className="w-full max-w-sm space-y-2 text-left @2xl/inv:grid @2xl/inv:max-w-3xl @2xl/inv:grid-cols-2 @2xl/inv:gap-3 @2xl/inv:space-y-0"
        >
          {items.map((it, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-md bg-[var(--inv-card)] p-2 @2xl/inv:p-3"
            >
              <span
                className="min-w-[64px] font-semibold @2xl/inv:text-lg @4xl/inv:text-xl"
                style={{ color: ACENTO_TARJETA }}
              >
                {it.time || "—"}
              </span>
              <span className="text-sm @2xl/inv:text-base @4xl/inv:text-lg">
                {it.label}
              </span>
            </div>
          ))}
        </StaggerGroup>
      ) : (
        <StaggerGroup
          enabled={animate}
          className={cn(
            "w-full max-w-sm text-left @2xl/inv:max-w-3xl",
            itineraryVariant === "timeline"
              ? "max-w-md space-y-3 border-l-2 border-[color:var(--inv-primary)] pl-6"
              : "divide-y divide-[color:var(--inv-primary)]/25",
          )}
        >
          {items.map((it, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 py-3",
                itineraryVariant === "timeline" && "relative grid grid-cols-[76px_1fr] items-center gap-3 py-0",
              )}
            >
              {itineraryVariant === "timeline" && (
                <span className="absolute -left-[1.875rem] top-1/2 size-3 -translate-y-1/2 rounded-full bg-[var(--inv-primary)] ring-4 ring-[var(--inv-bg)]" />
              )}
              <span
                className={cn(
                  "min-w-[64px] font-semibold @2xl/inv:text-lg @4xl/inv:text-xl",
                  itineraryVariant === "timeline" && "rounded-full bg-[color-mix(in_srgb,var(--inv-primary)_12%,transparent)] px-2 py-1 text-center",
                )}
                style={{ color: ACENTO_TARJETA }}
              >
                {it.time || "—"}
              </span>
              <span className={cn(
                "text-sm @2xl/inv:text-base @4xl/inv:text-lg",
                itineraryVariant === "timeline" && "rounded-lg bg-[var(--inv-card)] px-3 py-2 shadow-sm",
              )}>
                {it.label}
              </span>
            </div>
          ))}
        </StaggerGroup>
      )}
    </Section>
  );
}

// ---- Libro de firmas ------------------------------------------------------

/**
 * Vista ESTÁTICA del libro de firmas: la que se ve en el editor y en el
 * preview. El muro de verdad (`SignatureWall`) es interactivo y necesita el
 * id de la invitación, así que la página pública lo despacha aparte — igual
 * que el RSVP.
 */
function SignaturesPreviewBase({ config }: { config: SignaturesConfig }) {
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Libro de firmas"}
      </h3>
      {config.description && (
        <p className="max-w-md text-sm opacity-75 @2xl/inv:text-base">
          {config.description}
        </p>
      )}
      <div className="w-full max-w-md space-y-2 text-left">
        <div className="rounded-md border px-3 py-2 text-sm opacity-50">
          Tu nombre
        </div>
        <div className="rounded-md border px-3 py-6 text-sm opacity-50">
          Tu mensaje
        </div>
      </div>
      <span
        className="rounded-md px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: PRIMARY }}
      >
        {config.buttonLabel || "Firmar"}
      </span>
      {config.requireApproval && (
        <p className="text-xs opacity-60">
          Las firmas se publican después de que las revises.
        </p>
      )}
    </Section>
  );
}

// ---- Dress code -----------------------------------------------------------

const DRESSCODE_EDITORIAL_ART: Record<Exclude<DresscodeConfig["level"], "custom">, string> = {
  etiqueta: "/arte/vestimenta/etiqueta-editorial-v1.png",
  formal: "/arte/vestimenta/formal-editorial-v1.png",
  "semi-formal": "/arte/vestimenta/semiformal-editorial-v1.png",
  casual: "/arte/vestimenta/casual-editorial-v1.png",
};

function DresscodeEditorialArt({ level }: { level: Exclude<DresscodeConfig["level"], "custom"> }) {
  return (
    <figure className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-[color:var(--inv-primary)]/20 bg-[#1c1717] shadow-lg @2xl/inv:max-w-md @2xl/inv:rounded-[2.5rem]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DRESSCODE_EDITORIAL_ART[level]}
        alt={`Referencia editorial de vestimenta ${DRESSCODE_LABELS[level].toLowerCase()}`}
        loading="lazy"
        className="aspect-[2/3] w-full object-cover object-top"
      />
      <figcaption className="px-4 py-3 text-center text-xs font-medium tracking-[0.12em] uppercase text-white/80 @2xl/inv:px-5 @2xl/inv:py-4 @2xl/inv:text-sm">
        Inspiración de atuendo · {DRESSCODE_LABELS[level]}
      </figcaption>
    </figure>
  );
}

function DresscodePreviewBase({
  config,
  editorHint = false,
}: {
  config: DresscodeConfig;
  /** Ver `MapPreview`: los avisos al anfitrión son solo del editor. */
  editorHint?: boolean;
}) {
  const level = config.level;
  const badgeStyle = config.badgeStyle ?? "pill";
  const badgeClass = {
    pill: "rounded-full px-3 py-1 text-sm font-medium text-white @2xl/inv:px-4 @2xl/inv:py-1.5 @2xl/inv:text-base @4xl/inv:px-6 @4xl/inv:py-2 @4xl/inv:text-lg",
    outline: "rounded-full border-2 px-3 py-1 text-sm font-medium @2xl/inv:px-4 @2xl/inv:py-1.5 @2xl/inv:text-base @4xl/inv:px-6 @4xl/inv:py-2 @4xl/inv:text-lg",
    banner: "rounded-none px-5 py-1.5 text-sm font-medium text-white @2xl/inv:px-7 @2xl/inv:py-2 @2xl/inv:text-base @4xl/inv:px-9 @4xl/inv:py-2.5 @4xl/inv:text-lg",
  }[badgeStyle];
  const badgeVisual = badgeStyle === "outline"
    ? { color: PRIMARY, borderColor: PRIMARY }
    : { backgroundColor: PRIMARY };
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="flex flex-col items-center gap-2 text-lg font-semibold before:text-[0.65rem] before:font-semibold before:uppercase before:tracking-[0.24em] before:opacity-55 before:content-['Guía_de_estilo'] @2xl/inv:text-2xl @2xl/inv:before:text-xs @4xl/inv:text-3xl @4xl/inv:before:text-sm @5xl/inv:text-4xl">
        {config.title || "Código de vestimenta"}
      </h3>
      {level !== "custom" && (
        <span
          className={badgeClass}
          style={badgeVisual}
        >
          {DRESSCODE_LABELS[level]}
        </span>
      )}
      {config.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.imageUrl}
          alt="Código de vestimenta"
          loading="lazy"
          className="max-h-96 w-full rounded-lg object-contain @2xl/inv:max-h-[32rem]"
        />
      ) : level !== "custom" ? (
        <DresscodeEditorialArt level={level} />
      ) : config.description || !editorHint ? null : (
        <p className="text-sm opacity-70">Indica el código de vestimenta.</p>
      )}
      {(config.context || config.suggestions || config.restrictions || config.palette.length > 0) && (
        <div className="grid w-full max-w-3xl gap-3 text-left @2xl/inv:grid-cols-2 @2xl/inv:gap-4">
          {config.context && (
            <p className="col-span-full rounded-2xl border border-[color:var(--inv-primary)]/15 bg-[var(--inv-card)] px-4 py-3 text-sm leading-relaxed @2xl/inv:px-5 @2xl/inv:text-base">
              <span className="mr-2 font-semibold" style={{ color: ACENTO_TEXTO }}>Considera:</span>
              {config.context}
            </p>
          )}
          {config.suggestions && (
            <div className="rounded-2xl border border-[color:var(--inv-primary)]/15 bg-[var(--inv-card)] p-4 @2xl/inv:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-60">Sugerencias</p>
              <p className="mt-2 text-sm leading-relaxed @2xl/inv:text-base">{config.suggestions}</p>
            </div>
          )}
          {config.restrictions && (
            <div className="rounded-2xl border border-[color:var(--inv-primary)]/15 bg-[var(--inv-card)] p-4 @2xl/inv:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-60">Evita</p>
              <p className="mt-2 text-sm leading-relaxed @2xl/inv:text-base">{config.restrictions}</p>
            </div>
          )}
          {config.palette.length > 0 && (
            <div className="col-span-full flex flex-wrap items-center justify-center gap-2 pt-1 text-sm @2xl/inv:text-base">
              <span className="mr-1 font-medium opacity-70">Paleta sugerida</span>
              {config.palette.map((color) => (
                <span
                  key={color}
                  className="h-7 w-7 rounded-full border-2 border-white shadow-sm @2xl/inv:h-8 @2xl/inv:w-8"
                  style={{ backgroundColor: color }}
                  aria-label={`Tono sugerido ${color}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {config.description && (
        <p className="max-w-prose text-sm opacity-80 @2xl/inv:text-base @4xl/inv:text-lg @5xl/inv:text-2xl">
          {config.description}
        </p>
      )}
    </Section>
  );
}

// ---- Gifts ----------------------------------------------------------------

function GiftsPreviewBase({
  config,
  animate = false,
}: {
  config: GiftsConfig;
  animate?: boolean;
}) {
  const links = config.links.filter((l) => l.url);
  const giftsVariant = config.variant ?? "pills";
  const linksLayout = {
    pills: "flex flex-wrap justify-center gap-2 @2xl/inv:gap-3",
    cards: "grid w-full max-w-md grid-cols-2 gap-2 @2xl/inv:max-w-3xl @2xl/inv:gap-3",
    list: "flex w-full max-w-md flex-col divide-y divide-[color:var(--inv-primary)]/25 @2xl/inv:max-w-xl",
  }[giftsVariant];
  const linkClass = {
    pills: "rounded-full px-4 py-1.5 text-sm font-medium text-white @2xl/inv:px-6 @2xl/inv:py-2.5 @2xl/inv:text-base @4xl/inv:px-8 @4xl/inv:py-3 @4xl/inv:text-lg",
    cards: "flex min-h-20 items-center justify-center rounded-xl border border-[color:var(--inv-primary)] bg-[var(--inv-card)] p-3 text-center text-sm font-medium @2xl/inv:min-h-28 @2xl/inv:text-base",
    list: "flex items-center justify-between py-3 text-sm font-medium after:content-['↗'] @2xl/inv:text-base",
  }[giftsVariant];
  const linkVisual = giftsVariant === "pills"
    ? { backgroundColor: PRIMARY }
    : { color: ACENTO_TEXTO };
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      tint
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Mesa de regalos"}
      </h3>
      {config.description && (
        <p className="max-w-prose text-sm opacity-80 @2xl/inv:text-base @4xl/inv:text-lg @5xl/inv:text-2xl">
          {config.description}
        </p>
      )}
      {links.length > 0 && (
        <StaggerGroup
          enabled={animate}
          className={linksLayout}
          step={0.06}
        >
          {links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
              style={linkVisual}
            >
              {l.label || "Ver mesa"}
            </a>
          ))}
        </StaggerGroup>
      )}
    </Section>
  );
}

// ---- Music ----------------------------------------------------------------

function MusicPreviewBase({
  config,
  editorHint = false,
}: {
  config: MusicConfig;
  /** Ver `MapPreview`: los avisos al anfitrión son solo del editor. */
  editorHint?: boolean;
}) {
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      className="flex flex-col items-center gap-2 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Música"}
      </h3>
      {config.url ? (
        <a
          href={config.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full px-4 py-1.5 text-sm font-medium text-white @2xl/inv:px-6 @2xl/inv:py-2.5 @2xl/inv:text-base @4xl/inv:px-8 @4xl/inv:py-3 @4xl/inv:text-lg"
          style={{ backgroundColor: PRIMARY }}
        >
          ▶ Escuchar
        </a>
      ) : editorHint ? (
        <p className="text-sm opacity-70">
          Pega un enlace de Spotify o YouTube.
        </p>
      ) : null}
    </Section>
  );
}

// ---- RSVP (editor preview, non-interactive) -------------------------------

function RsvpPreviewBase({
  config,
  interactive = false,
  editorHint = false,
}: {
  config: RsvpConfig;
  interactive?: boolean;
  editorHint?: boolean;
}) {
  const deadline = formatDate(config.deadline);
  const formVariant = config.variant ?? "classic";
  const formClass = {
    classic: "",
    card: "rounded-2xl bg-[var(--inv-card)] p-4 shadow-sm",
    minimal: "border-y border-[color:var(--inv-primary)] py-4",
    editorial: "border-l-4 border-[color:var(--inv-primary)] bg-[color-mix(in_srgb,var(--inv-primary)_6%,transparent)] p-4",
  }[formVariant];
  const fieldClass = formVariant === "minimal"
    ? "rounded-none border-x-0 border-t-0 bg-transparent"
    : undefined;
  const configuredFieldClass = {
    // El lienzo usa inputs deshabilitados: sin `disabled:opacity-100` el
    // navegador suaviza tanto el borde que Contorno parece idéntico a Suave.
    // Suave conserva la apariencia histórica de las invitaciones existentes.
    soft: "",
    outline: "border-2 border-[color:var(--inv-primary)] bg-transparent disabled:opacity-100",
    underline: "rounded-none border-x-0 border-t-0 border-b-2 border-[color:var(--inv-primary)] bg-transparent px-0 disabled:opacity-100",
  }[config.fieldStyle ?? "soft"];
  const actionPresentation = config.buttonTone === "auto" || !config.buttonTone
    ? formVariant === "minimal" ? "minimal" : "solid"
    : config.buttonTone;
  const actionTone = {
    solid: "",
    minimal: "border-b-2 bg-transparent text-[var(--inv-primary)]",
    outline: "border-2 bg-transparent text-[var(--inv-primary)]",
    soft: "bg-[color-mix(in_srgb,var(--inv-primary)_14%,white)] text-[var(--inv-primary)]",
  }[actionPresentation];
  const actionShape = {
    rounded: "rounded-lg",
    pill: "rounded-full",
    square: "rounded-none",
  }[config.buttonStyle ?? "rounded"];
  const actionStyle = actionPresentation === "solid"
    ? { backgroundColor: PRIMARY }
    : actionPresentation === "soft"
      ? { color: PRIMARY }
      : { color: PRIMARY, borderColor: PRIMARY };
  const formSpacing = {
    compact: "space-y-2",
    comfortable: "space-y-3",
    airy: "space-y-5",
  }[config.density ?? "comfortable"];
  const attendanceClass = {
    cards: "rounded-md border",
    pills: "rounded-full border",
    underline: "rounded-none border-x-0 border-t-0 border-b-2",
  }[config.attendanceStyle ?? "cards"];
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      textStyles={config.textStyles}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      divider={config.divider}
      tint
      className="flex flex-col items-center gap-4"
    >
      {/* Título y descripción son hermanos directos de Section: cada uno
          recibe su propio data-bloque y su propio override tipográfico. Los
          nodos ocultos conservan la numeración estable aunque estén vacíos. */}
      <h3 className="text-center text-lg font-semibold">
        {config.title || "Confirma tu asistencia"}
      </h3>
      <p className={cn("-mt-3 text-center text-sm opacity-80", !config.description && "hidden")}>
        {config.description}
      </p>
      <p className={cn("-mt-3 text-center text-xs opacity-70", !deadline && "hidden")}>
        Fecha límite: {deadline}
      </p>

      <div className={cn("w-full max-w-sm", formSpacing, formClass)}>
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input className={cn(fieldClass, configuredFieldClass)} disabled={!interactive} placeholder="Tu nombre" />
        </div>
        <div className="space-y-1.5">
          <Label>Correo (opcional)</Label>
          <Input className={cn(fieldClass, configuredFieldClass)}
            disabled={!interactive}
            type="email"
            placeholder="tu@correo.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>¿Asistirás?</Label>
          <div className="grid grid-cols-3 gap-2">
            {["Sí", "Tal vez", "No"].map((option) => (
              <button
                key={option}
                type="button"
                disabled
                className={cn(
                  "h-8 border-[color:var(--inv-primary)] px-1 text-xs font-medium text-[var(--inv-primary)] disabled:opacity-100",
                  attendanceClass,
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {config.allowGuestCount && (
          <div className="space-y-1.5">
            <Label>Número de invitados</Label>
            <Input className={cn(fieldClass, configuredFieldClass)}
              disabled={!interactive}
              type="number"
              min={1}
              defaultValue={1}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Mensaje (opcional)</Label>
          <Textarea className={cn(fieldClass, configuredFieldClass)} disabled={!interactive} placeholder="Déjanos un mensaje" />
        </div>
        <button
          type="button"
          disabled
          className={cn("w-full py-2 text-sm font-medium text-white opacity-90", actionTone, actionShape)}
          style={actionStyle}
        >
          {config.buttonLabel || "Confirmar"}
        </button>
        {!interactive && editorHint && (
          <p className="text-center text-xs opacity-70">
            La confirmación es interactiva en la invitación publicada.
          </p>
        )}
      </div>
    </Section>
  );
}

// El despacho por tipo vive en `registry.tsx`: un solo lugar por modulo, y
// olvidar una entrada es un error de TypeScript en vez de un modulo invisible.

/*
 * ---- Exportaciones memoizadas -------------------------------------------
 *
 * Los doce Preview son PUROS respecto de sus props: derivan todo de `config`
 * mas un par de banderas. `CountdownPreview` tiene su propio `setInterval`,
 * pero ese re-render es interno y `memo` no lo estorba.
 *
 * Esto SOLO sirve porque `ModulePreview` ya memoiza `parseConfig`: antes, la
 * prop `config` cambiaba de identidad en cada render y la comparacion
 * superficial fallaba siempre. El orden importa.
 *
 * Se exporta el envoltorio con el nombre de siempre, asi que ningun sitio de
 * llamada cambia: `registry.tsx` sigue importando `HeroPreview`.
 */
export const HeroPreview = React.memo(HeroPreviewBase);
export const WelcomePreview = React.memo(WelcomePreviewBase);
export const CountdownPreview = React.memo(CountdownPreviewBase);
export const MapPreview = React.memo(MapPreviewBase);
export const GalleryPreview = React.memo(GalleryPreviewBase);
export const VideoPreview = React.memo(VideoPreviewBase);
export const ItineraryPreview = React.memo(ItineraryPreviewBase);
export const SignaturesPreview = React.memo(SignaturesPreviewBase);
export const DresscodePreview = React.memo(DresscodePreviewBase);
export const GiftsPreview = React.memo(GiftsPreviewBase);
export const MusicPreview = React.memo(MusicPreviewBase);
export const RsvpPreview = React.memo(RsvpPreviewBase);
