"use client";

import type { ComponentType } from "react";
import {
  SparklesIcon, MailOpenIcon, TimerIcon, MapPinIcon, ImagesIcon, FilmIcon,
  CalendarClockIcon, ShirtIcon, GiftIcon, MusicIcon, CheckCircle2Icon,
  PenLineIcon, type LucideIcon,
} from "lucide-react";

import {
  MODULE_TYPES,
  parseConfig,
  tieneComposicionDeSeccion,
  type ModuleType,
} from "@/lib/modules/types";
import type { AnimationConfig } from "@/lib/animation/types";
import type { UploadContext } from "@/components/editor/image-uploader";

import {
  HeroPreview, WelcomePreview, CountdownPreview, MapPreview, GalleryPreview,
  VideoPreview, ItineraryPreview, DresscodePreview, GiftsPreview, MusicPreview,
  RsvpPreview, SignaturesPreview,
} from "./previews";
import {
  HeroEditor, WelcomeEditor, CountdownEditor, MapEditor, GalleryEditor,
  VideoEditor, ItineraryEditor, DresscodeEditor, GiftsEditor, MusicEditor,
  RsvpEditor, SignaturesEditor, AnimationControl,
} from "./config-editors";
import { defaultAnimation } from "@/lib/animation/schema";
import { ComposicionDeSeccion } from "@/components/editor/composicion-de-seccion";

/**
 * Registro de tipos de módulo: un solo lugar por tipo.
 *
 * Antes había DOS `switch` gigantes —uno en `previews.tsx`, otro en
 * `config-editors.tsx`— más el `MODULE_META` de `types.ts`. Añadir un tipo
 * obligaba a tocar cuatro sitios, y olvidar uno no rompía la compilación:
 * el `default: return null` de cada switch se lo tragaba en silencio y el
 * módulo simplemente no se veía.
 *
 * Con el registro tipado como `Record<ModuleType, …>`, olvidar una entrada es
 * un error de TypeScript, no un módulo invisible.
 *
 * Los componentes de módulo NO se reescriben: cada entrada es un adaptador
 * fino sobre lo que ya existe. Reescribir 1,600 líneas de editores y previews
 * no era el objetivo y habría sido puro riesgo.
 */

/** Props uniformes del editor de un módulo. Cada adaptador toma lo que usa. */
export type ModuleEditorProps = {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  ctx?: UploadContext;
  /** Fecha del evento (ISO) + setter. Solo la usa `countdown`. */
  eventDate?: string;
  onSetEventDate?: (iso: string) => void;
  /** En `guest_list` el cupo lo pone el organizador. Solo la usa `rsvp`. */
  rsvpMode?: "open" | "guest_list";
};

/** Props uniformes del render. `config` llega YA parseado por `parseConfig`. */
export type ModulePreviewProps = {
  config: unknown;
  animate?: boolean;
  interactive?: boolean;
  editorHint?: boolean;
  eventDate?: string;
};

export type ModuleEntry = {
  /** Icono real, no emoji: hereda color y tamaño del tema y se ve igual en
   *  todos los sistemas operativos. */
  Icon: LucideIcon;
  Editor: ComponentType<ModuleEditorProps>;
  Preview: ComponentType<ModulePreviewProps>;
};

// Los `as never` son el precio de adaptar componentes con props estrechas a una
// firma uniforme: cada Preview conoce su propio tipo de config y `parseConfig`
// ya garantizó la forma correcta antes de llegar aquí.
export const MODULE_REGISTRY: Record<ModuleType, ModuleEntry> = {
  hero: {
    Icon: SparklesIcon,
    Editor: ({ config, onChange, ctx }) => <HeroEditor config={config} onChange={onChange} ctx={ctx} />,
    Preview: ({ config, animate }) => <HeroPreview config={config as never} animate={animate} />,
  },
  welcome: {
    Icon: MailOpenIcon,
    Editor: ({ config, onChange }) => <WelcomeEditor config={config} onChange={onChange} />,
    Preview: ({ config }) => <WelcomePreview config={config as never} />,
  },
  countdown: {
    Icon: TimerIcon,
    Editor: ({ config, onChange, eventDate, onSetEventDate }) => (
      <CountdownEditor config={config} onChange={onChange} eventDate={eventDate} onSetEventDate={onSetEventDate} />
    ),
    Preview: ({ config, eventDate, editorHint }) => (
      <CountdownPreview
        config={config as never}
        eventDate={eventDate ?? ""}
        editorHint={editorHint}
      />
    ),
  },
  map: {
    Icon: MapPinIcon,
    Editor: ({ config, onChange }) => <MapEditor config={config} onChange={onChange} />,
    Preview: ({ config, editorHint }) => (
      <MapPreview config={config as never} editorHint={editorHint} />
    ),
  },
  gallery: {
    Icon: ImagesIcon,
    Editor: ({ config, onChange, ctx }) => <GalleryEditor config={config} onChange={onChange} ctx={ctx} />,
    Preview: ({ config, animate }) => <GalleryPreview config={config as never} animate={animate} />,
  },
  video: {
    Icon: FilmIcon,
    Editor: ({ config, onChange }) => <VideoEditor config={config} onChange={onChange} />,
    Preview: ({ config }) => <VideoPreview config={config as never} />,
  },
  itinerary: {
    Icon: CalendarClockIcon,
    Editor: ({ config, onChange }) => <ItineraryEditor config={config} onChange={onChange} />,
    Preview: ({ config, animate }) => <ItineraryPreview config={config as never} animate={animate} />,
  },
  dresscode: {
    Icon: ShirtIcon,
    Editor: ({ config, onChange, ctx }) => <DresscodeEditor config={config} onChange={onChange} ctx={ctx} />,
    Preview: ({ config }) => <DresscodePreview config={config as never} />,
  },
  gifts: {
    Icon: GiftIcon,
    Editor: ({ config, onChange }) => <GiftsEditor config={config} onChange={onChange} />,
    Preview: ({ config, animate }) => <GiftsPreview config={config as never} animate={animate} />,
  },
  music: {
    Icon: MusicIcon,
    Editor: ({ config, onChange }) => <MusicEditor config={config} onChange={onChange} />,
    Preview: ({ config }) => <MusicPreview config={config as never} />,
  },
  rsvp: {
    Icon: CheckCircle2Icon,
    Editor: ({ config, onChange, rsvpMode }) => <RsvpEditor config={config} onChange={onChange} rsvpMode={rsvpMode} />,
    Preview: ({ config, interactive, editorHint }) => (
      <RsvpPreview config={config as never} interactive={interactive} editorHint={editorHint} />
    ),
  },
  signatures: {
    Icon: PenLineIcon,
    Editor: ({ config, onChange }) => <SignaturesEditor config={config} onChange={onChange} />,
    Preview: ({ config }) => <SignaturesPreview config={config as never} />,
  },
};

/** Guarda en tiempo de ejecución: el registro cubre TODOS los tipos. */
export const MODULE_REGISTRY_IS_COMPLETE = MODULE_TYPES.every(
  (t) => MODULE_REGISTRY[t] !== undefined,
);

/** Render de un módulo. Sustituye al `switch` de `previews.tsx`. */
export function ModulePreview({
  moduleType,
  config,
  ...rest
}: ModulePreviewProps & { moduleType: ModuleType; config: Record<string, unknown> }) {
  const { Preview } = MODULE_REGISTRY[moduleType];
  return <Preview config={parseConfig(moduleType, config)} {...rest} />;
}

/** Panel de propiedades de un módulo. Sustituye al `switch` de `config-editors`. */
export function ModuleConfigEditor({
  moduleType,
  animationDefaults,
  ...rest
}: ModuleEditorProps & {
  moduleType: ModuleType;
  /** Animación del tema, mostrada como línea base heredada en el control. */
  animationDefaults?: AnimationConfig;
}) {
  const { Editor } = MODULE_REGISTRY[moduleType];
  return (
    <div>
      <Editor {...rest} />
      {/*
        Va AQUÍ y no en los once editores: el dispatcher ya centraliza el
        despacho por tipo, así que el bloque se escribe una vez y quien decide
        si aparece es el ESQUEMA (`tieneComposicionDeSeccion`), no una lista a
        mano. `hero` queda fuera solo, porque compone con `variant`.
      */}
      {tieneComposicionDeSeccion(moduleType) ? (
        <ComposicionDeSeccion config={rest.config} onChange={rest.onChange} />
      ) : null}
      <AnimationControl
        config={rest.config}
        onChange={rest.onChange}
        defaults={animationDefaults ?? defaultAnimation()}
      />
    </div>
  );
}
