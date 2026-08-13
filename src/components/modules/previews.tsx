"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  CountdownConfig,
  DresscodeConfig,
  GalleryConfig,
  GiftsConfig,
  HeroConfig,
  ItineraryConfig,
  MapConfig,
  ModuleType,
  MusicConfig,
  RsvpConfig,
  VideoConfig,
  WelcomeConfig,
} from "@/lib/modules/types";
import { parseConfig } from "@/lib/modules/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextReveal } from "@/components/animation/text-reveal";
import { StaggerGroup } from "@/components/animation/stagger-group";
import { PhotoGallery } from "@/components/modules/photo-gallery";
import { DresscodeFigures } from "@/components/modules/dresscode-figures";
import { DRESSCODE_LABELS } from "@/lib/modules/types";

const PRIMARY = "var(--inv-primary, var(--primary))";
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
function Section({
  children,
  tint = false,
  wide = false,
  className,
}: {
  children: React.ReactNode;
  tint?: boolean;
  /** Media-heavy modules (gallery/video) use more of the desktop width. */
  wide?: boolean;
  className?: string;
}) {
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
        )}
      >
        {children}
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

export function HeroPreview({
  config,
  animate = false,
}: {
  config: HeroConfig;
  animate?: boolean;
}) {
  const title = config.title || "Nuestra celebración";
  return (
    <section
      className="relative flex min-h-[260px] flex-col items-center justify-center gap-3 overflow-hidden px-6 py-12 text-center @2xl/inv:min-h-[460px] @2xl/inv:py-20 @4xl/inv:min-h-[70svh]"
      style={config.imageUrl ? undefined : { backgroundColor: TINT }}
    >
      {config.imageUrl && (
        <div
          className={cn("absolute inset-0", animate && "inv-kenburns")}
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)), url(${config.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div className="relative flex max-w-3xl flex-col items-center gap-3 @2xl/inv:gap-5">
        <h2
          className="text-3xl font-bold tracking-tight @2xl/inv:text-5xl @4xl/inv:text-6xl @5xl/inv:text-7xl"
          style={{ color: config.imageUrl ? "#fff" : "inherit" }}
        >
          {animate ? <TextReveal text={title} variant="text-rise" /> : title}
        </h2>
        {config.subtitle && (
          <p
            className="text-base @2xl/inv:text-xl @4xl/inv:text-2xl @5xl/inv:text-3xl"
            style={{ color: config.imageUrl ? "rgba(255,255,255,.9)" : "inherit" }}
          >
            {config.subtitle}
          </p>
        )}
        {config.ctaLabel && (
          <span
            className="mt-2 rounded-full px-4 py-1.5 text-sm font-medium text-white @2xl/inv:px-6 @2xl/inv:py-2.5 @2xl/inv:text-lg @4xl/inv:px-8 @4xl/inv:py-3 @4xl/inv:text-xl"
            style={{ backgroundColor: PRIMARY }}
          >
            {config.ctaLabel}
          </span>
        )}
      </div>
    </section>
  );
}

// ---- Welcome --------------------------------------------------------------

export function WelcomePreview({ config }: { config: WelcomeConfig }) {
  return (
    <Section className="text-center">
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
}: {
  config: CountdownConfig;
  eventDate?: string;
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
    <div className="flex min-w-[64px] flex-col items-center rounded-lg bg-white/70 px-3 py-2 shadow-sm @2xl/inv:min-w-[92px] @2xl/inv:px-5 @2xl/inv:py-3 @4xl/inv:min-w-[120px] @4xl/inv:px-7 @4xl/inv:py-4 dark:bg-black/20">
      <span
        className="text-2xl font-bold tabular-nums @2xl/inv:text-4xl @4xl/inv:text-5xl"
        style={{ color: PRIMARY }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs opacity-70 @2xl/inv:text-sm @4xl/inv:text-base">
        {label}
      </span>
    </div>
  );

  return (
    <Section tint className="flex flex-col items-center gap-4 text-center">
      <h3 className="text-lg font-semibold @2xl/inv:text-2xl @4xl/inv:text-3xl @5xl/inv:text-4xl">
        {config.title || "Faltan"}
      </h3>
      {valid ? (
        <div className="flex flex-wrap justify-center gap-2 @2xl/inv:gap-4">
          {cell(days, "días")}
          {cell(hours, "hrs")}
          {cell(minutes, "min")}
          {cell(seconds, "seg")}
        </div>
      ) : (
        <p className="text-sm opacity-70">
          Define la fecha del evento para activar la cuenta regresiva.
        </p>
      )}
    </Section>
  );
}

// ---- Map ------------------------------------------------------------------

export function MapPreview({ config }: { config: MapConfig }) {
  const mapsUrl = config.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`
    : "";
  return (
    <Section className="flex flex-col items-center gap-2 text-center">
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
            style={{ color: PRIMARY }}
          >
            Ver en Google Maps
          </a>
        </>
      ) : (
        <p className="text-sm opacity-70">Agrega la dirección del lugar.</p>
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
    <Section wide className="flex flex-col items-center gap-3 text-center">
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
    <Section wide className="flex flex-col items-center gap-3 text-center">
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
        <p className="text-sm opacity-70">
          Pega un enlace de YouTube o Vimeo.
        </p>
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
    <Section tint className="flex flex-col items-center gap-3 text-center">
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
              className="flex gap-3 rounded-md bg-white/60 p-2 @2xl/inv:p-3 dark:bg-black/20"
            >
              <span
                className="min-w-[64px] font-semibold @2xl/inv:text-lg @4xl/inv:text-xl"
                style={{ color: PRIMARY }}
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

// ---- Dress code -----------------------------------------------------------

export function DresscodePreview({ config }: { config: DresscodeConfig }) {
  const level = config.level;
  return (
    <Section className="flex flex-col items-center gap-3 text-center">
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
    <Section tint className="flex flex-col items-center gap-3 text-center">
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
    <Section className="flex flex-col items-center gap-2 text-center">
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
        <p className="text-sm opacity-70">Pega un enlace de Spotify o YouTube.</p>
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
    <Section tint className="flex flex-col items-center gap-4">
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
          <Input disabled={!interactive} type="email" placeholder="tu@correo.com" />
        </div>
        {config.allowGuestCount && (
          <div className="space-y-1.5">
            <Label>Número de invitados</Label>
            <Input disabled={!interactive} type="number" min={1} defaultValue={1} />
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

// ---- Dispatcher -----------------------------------------------------------

export function ModulePreview({
  moduleType,
  config,
  interactive,
  editorHint,
  animate = false,
  eventDate = "",
}: {
  moduleType: ModuleType;
  config: Record<string, unknown>;
  interactive?: boolean;
  editorHint?: boolean;
  /** Enables the module's internal choreography (text reveal, stagger, …). */
  animate?: boolean;
  /** Invitation-level event date (ISO), used by the countdown module. */
  eventDate?: string;
}) {
  const parsed = parseConfig(moduleType, config);
  switch (moduleType) {
    case "hero":
      return <HeroPreview config={parsed as HeroConfig} animate={animate} />;
    case "welcome":
      return <WelcomePreview config={parsed as WelcomeConfig} />;
    case "countdown":
      return (
        <CountdownPreview config={parsed as CountdownConfig} eventDate={eventDate} />
      );
    case "map":
      return <MapPreview config={parsed as MapConfig} />;
    case "gallery":
      return <GalleryPreview config={parsed as GalleryConfig} animate={animate} />;
    case "video":
      return <VideoPreview config={parsed as VideoConfig} />;
    case "itinerary":
      return (
        <ItineraryPreview config={parsed as ItineraryConfig} animate={animate} />
      );
    case "dresscode":
      return <DresscodePreview config={parsed as DresscodeConfig} />;
    case "gifts":
      return <GiftsPreview config={parsed as GiftsConfig} animate={animate} />;
    case "music":
      return <MusicPreview config={parsed as MusicConfig} />;
    case "rsvp":
      return (
        <RsvpPreview
          config={parsed as RsvpConfig}
          interactive={interactive}
          editorHint={editorHint}
        />
      );
    default:
      return null;
  }
}
