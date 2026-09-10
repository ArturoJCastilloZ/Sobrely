"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  HeroVariant,
  SectionAlign,
  SectionBleed,
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
  Desplazamiento,
  ItineraryConfig,
  MapConfig,
  MusicConfig,
  RsvpConfig,
  SignaturesConfig,
  VideoConfig,
  WelcomeConfig,
} from "@/lib/modules/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextReveal } from "@/components/animation/text-reveal";
import { StaggerGroup } from "@/components/animation/stagger-group";
import { PhotoGallery } from "@/components/modules/photo-gallery";
import { DresscodeFigures } from "@/components/modules/dresscode-figures";
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
  media,
  className,
  freeMove = false,
  textOffsets,
}: {
  children: React.ReactNode;
  tint?: boolean;
  /** Media-heavy modules (gallery/video) use more of the desktop width. */
  wide?: boolean;
  align?: SectionAlign;
  bleed?: SectionBleed;
  frame?: SectionFrame;
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
}) {
  // Sin imagen, `contenido === children`: el árbol renderizado es LITERALMENTE
  // el de antes, sin una envoltura de más. Es lo que permite comprobar por md5
  // que las 50 no se mueven.
  const conMedia = Boolean(media && media.position !== "none" && media.url);

  // Con el interruptor APAGADO no se envuelve nada: el arbol renderizado sigue
  // siendo literalmente el de antes. Es la misma disciplina que el comentario
  // de arriba sobre `media`, y es lo que permite afirmar que una invitacion
  // que no usa esto no se mueve ni un pixel.
  const colocables = freeMove
    ? React.Children.toArray(children).map((hijo, i) => {
        const d = textOffsets?.[i];
        return (
          <div
            key={i}
            data-bloque={String(i)}
            style={estiloDeDesplazamiento(true, d)}
          >
            {hijo}
          </div>
        );
      })
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
      style={tint ? { backgroundColor: TINT } : undefined}
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
        {contenido}
      </div>
    </section>
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

export function HeroPreview({
  config,
  animate = false,
}: {
  config: HeroConfig;
  animate?: boolean;
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
            color: sobreFoto ? "#fff" : "inherit",
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
              color: sobreFoto ? "rgba(255,255,255,.9)" : "inherit",
              ...desplazamientoStyle(config, "subtitle"),
            }}
          >
            {config.subtitle}
          </p>
        )}
        {config.ctaLabel && (
          <div
            data-bloque="cta"
            className="mt-3 flex items-center gap-3 @2xl/inv:mt-5 @2xl/inv:gap-4"
            style={{
              color: sobreFoto ? "rgba(255,255,255,.92)" : ACENTO_TEXTO,
              ...desplazamientoStyle(config, "cta"),
            }}
          >
            <span
              aria-hidden
              className="h-px w-8 @2xl/inv:w-12 @4xl/inv:w-16"
              style={{ backgroundColor: "currentColor", opacity: 0.5 }}
            />
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-[0.3em] @2xl/inv:px-3 @2xl/inv:text-sm @4xl/inv:text-base"
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
            </span>
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

export function WelcomePreview({ config }: { config: WelcomeConfig }) {
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
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

export function CountdownPreview({
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

  const cell = (value: number, label: string) => (
    <div className="flex min-w-[64px] flex-col items-center rounded-lg bg-[var(--inv-card)] px-3 py-2 shadow-sm @2xl/inv:min-w-[92px] @2xl/inv:px-5 @2xl/inv:py-3 @4xl/inv:min-w-[120px] @4xl/inv:px-7 @4xl/inv:py-4">
      <span
        className="text-2xl font-bold tabular-nums @2xl/inv:text-4xl @4xl/inv:text-5xl"
        style={{ color: ACENTO_TARJETA }}
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
        bleed={config.bleed}
        media={config.media}
        frame={config.frame}
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
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      tint
      className="flex flex-col items-center gap-4 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Faltan"}
      </h3>
      <div className="flex flex-wrap justify-center gap-2 @2xl/inv:gap-4">
        {cell(days, "días")}
        {cell(hours, "hrs")}
        {cell(minutes, "min")}
        {cell(seconds, "seg")}
      </div>
    </Section>
  );
}

// ---- Map ------------------------------------------------------------------

export function MapPreview({
  config,
  editorHint = false,
}: {
  config: MapConfig;
  /** Ver `CountdownPreview`: los avisos al anfitrión son solo del editor. */
  editorHint?: boolean;
}) {
  // Sin direccion NI nombre del lugar el modulo no tiene contenido: en publico
  // se omite, en el editor se explica.
  if (!config.address && !config.venueName && !editorHint) return null;
  const mapsUrl = config.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`
    : "";
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      className="flex flex-col items-center gap-2 text-center"
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
          <p className="text-sm opacity-70 @2xl/inv:text-base @4xl/inv:text-lg">
            {config.address}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-4 @2xl/inv:text-base @4xl/inv:text-lg"
            style={{ color: ACENTO_TEXTO }}
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

export function GalleryPreview({
  config,
  animate = false,
}: {
  config: GalleryConfig;
  animate?: boolean;
}) {
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      wide
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Galería"}
      </h3>
      {config.images.length === 0 ? (
        <p className="text-sm opacity-70">Agrega fotos a tu galería.</p>
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

export function VideoPreview({ config }: { config: VideoConfig }) {
  const embed = toEmbedUrl(config.url);
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
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
      ) : (
        <p className="text-sm opacity-70">Pega un enlace de YouTube o Vimeo.</p>
      )}
    </Section>
  );
}

// ---- Itinerary ------------------------------------------------------------

export function ItineraryPreview({
  config,
  animate = false,
}: {
  config: ItineraryConfig;
  animate?: boolean;
}) {
  const items = config.items.filter((i) => i.time || i.label);
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      tint
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Itinerario"}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm opacity-70">Agrega los horarios del evento.</p>
      ) : (
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
export function SignaturesPreview({ config }: { config: SignaturesConfig }) {
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
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

export function DresscodePreview({ config }: { config: DresscodeConfig }) {
  const level = config.level;
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      className="flex flex-col items-center gap-3 text-center"
    >
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Código de vestimenta"}
      </h3>
      {level !== "custom" && (
        <span
          className="rounded-full px-3 py-1 text-sm font-medium text-white @2xl/inv:px-4 @2xl/inv:py-1.5 @2xl/inv:text-base @4xl/inv:px-6 @4xl/inv:py-2 @4xl/inv:text-lg"
          style={{ backgroundColor: PRIMARY }}
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
        <DresscodeFigures level={level} />
      ) : config.description ? null : (
        <p className="text-sm opacity-70">Indica el código de vestimenta.</p>
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

export function GiftsPreview({
  config,
  animate = false,
}: {
  config: GiftsConfig;
  animate?: boolean;
}) {
  const links = config.links.filter((l) => l.url);
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
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
          className="flex flex-wrap justify-center gap-2 @2xl/inv:gap-3"
          step={0.06}
        >
          {links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-1.5 text-sm font-medium text-white @2xl/inv:px-6 @2xl/inv:py-2.5 @2xl/inv:text-base @4xl/inv:px-8 @4xl/inv:py-3 @4xl/inv:text-lg"
              style={{ backgroundColor: PRIMARY }}
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

export function MusicPreview({ config }: { config: MusicConfig }) {
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
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
      ) : (
        <p className="text-sm opacity-70">
          Pega un enlace de Spotify o YouTube.
        </p>
      )}
    </Section>
  );
}

// ---- RSVP (editor preview, non-interactive) -------------------------------

export function RsvpPreview({
  config,
  interactive = false,
  editorHint = false,
}: {
  config: RsvpConfig;
  interactive?: boolean;
  editorHint?: boolean;
}) {
  const deadline = formatDate(config.deadline);
  return (
    <Section
      align={config.align}
      freeMove={config.freeMove}
      textOffsets={config.textOffsets}
      bleed={config.bleed}
      media={config.media}
      frame={config.frame}
      tint
      className="flex flex-col items-center gap-4"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {config.title || "Confirma tu asistencia"}
        </h3>
        {config.description && (
          <p className="mt-1 text-sm opacity-80">{config.description}</p>
        )}
        {deadline && (
          <p className="mt-1 text-xs opacity-70">Fecha límite: {deadline}</p>
        )}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input disabled={!interactive} placeholder="Tu nombre" />
        </div>
        <div className="space-y-1.5">
          <Label>Correo (opcional)</Label>
          <Input
            disabled={!interactive}
            type="email"
            placeholder="tu@correo.com"
          />
        </div>
        {config.allowGuestCount && (
          <div className="space-y-1.5">
            <Label>Número de invitados</Label>
            <Input
              disabled={!interactive}
              type="number"
              min={1}
              defaultValue={1}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Mensaje (opcional)</Label>
          <Textarea disabled={!interactive} placeholder="Déjanos un mensaje" />
        </div>
        <button
          type="button"
          disabled
          className="w-full rounded-lg py-2 text-sm font-medium text-white opacity-90"
          style={{ backgroundColor: PRIMARY }}
        >
          Confirmar
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
