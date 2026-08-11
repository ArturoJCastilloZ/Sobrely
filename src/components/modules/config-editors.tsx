"use client";

import type { ModuleType, GalleryLayout, DresscodeLevel } from "@/lib/modules/types";
import { GALLERY_LAYOUTS, GALLERY_LAYOUT_LABELS } from "@/lib/modules/types";
import { DRESSCODE_LEVELS, DRESSCODE_LABELS } from "@/lib/modules/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImageUploader,
  type UploadContext,
} from "@/components/editor/image-uploader";
import { SortableImageGrid } from "@/components/editor/sortable-image-grid";
import {
  CSS_REVEAL_PRESETS,
  ANIMATION_REGISTRY,
} from "@/lib/animation/registry";
import { defaultAnimation } from "@/lib/animation/schema";
import type {
  AnimationConfig,
  AnimationOverride,
  AnimationPreset,
} from "@/lib/animation/types";
import { AnimationFields } from "@/components/editor/animation-fields";
import { Badge } from "@/components/ui/badge";

const REVEAL_OPTIONS = [...CSS_REVEAL_PRESETS] as AnimationPreset[];
const ANIM_DEFAULTS = defaultAnimation();

/** ISO string -> value for <input type="datetime-local"> (local time). */
function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

type EditorProps = {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  ctx?: UploadContext;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// ---- Hero -----------------------------------------------------------------

function HeroEditor({ config, onChange, ctx }: EditorProps) {
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Subtítulo">
        <Input value={str(config.subtitle)} onChange={(e) => onChange({ subtitle: e.target.value })} />
      </Field>
      <Field label="Imagen de fondo">
        {ctx ? (
          <ImageUploader
            value={str(config.imageUrl)}
            onChange={(url) => onChange({ imageUrl: url })}
            ctx={ctx}
          />
        ) : (
          <Input
            type="url"
            placeholder="https://…"
            value={str(config.imageUrl)}
            onChange={(e) => onChange({ imageUrl: e.target.value })}
          />
        )}
      </Field>
      <Field label="Etiqueta (opcional)">
        <Input value={str(config.ctaLabel)} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
      </Field>
    </div>
  );
}

// ---- Welcome --------------------------------------------------------------

function WelcomeEditor({ config, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Mensaje">
        <Textarea
          rows={4}
          value={str(config.message)}
          onChange={(e) => onChange({ message: e.target.value })}
        />
      </Field>
    </div>
  );
}

// ---- Countdown ------------------------------------------------------------

function CountdownEditor({
  config,
  onChange,
  eventDate = "",
  onSetEventDate,
}: EditorProps & {
  eventDate?: string;
  onSetEventDate?: (iso: string) => void;
}) {
  const useEvent = Boolean(config.useEventDate);
  const targetDate = str(config.targetDate);

  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label className="cursor-pointer">Usar la fecha del evento</Label>
        <Switch
          checked={useEvent}
          onCheckedChange={(v) => onChange({ useEventDate: v })}
        />
      </div>

      {useEvent ? (
        <p className="text-xs text-muted-foreground">
          {eventDate
            ? `Cuenta hacia la fecha del evento: ${new Date(eventDate).toLocaleString("es-MX")}.`
            : "Define la fecha del evento en la pestaña Ajustes."}
        </p>
      ) : (
        <>
          <Field label="Fecha y hora objetivo">
            <Input
              type="datetime-local"
              value={isoToLocalInput(targetDate)}
              onChange={(e) => onChange({ targetDate: localInputToIso(e.target.value) })}
            />
          </Field>
          {targetDate && onSetEventDate && eventDate !== targetDate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSetEventDate(targetDate)}
            >
              Usar también como fecha del evento
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ---- Map ------------------------------------------------------------------

function MapEditor({ config, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Nombre del lugar">
        <Input value={str(config.venueName)} onChange={(e) => onChange({ venueName: e.target.value })} />
      </Field>
      <Field label="Dirección">
        <Textarea value={str(config.address)} onChange={(e) => onChange({ address: e.target.value })} />
      </Field>
    </div>
  );
}

// ---- Gallery --------------------------------------------------------------

function GalleryEditor({ config, onChange, ctx }: EditorProps) {
  const images = Array.isArray(config.images)
    ? (config.images as string[])
    : [];

  const layout = (config.layout as GalleryLayout) ?? "grid";

  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>

      <Field label="Estilo de galería">
        <Select
          value={layout}
          onValueChange={(v) => onChange({ layout: v as GalleryLayout })}
        >
          <SelectTrigger>
            <SelectValue>
              {(v: string) => GALLERY_LAYOUT_LABELS[v as GalleryLayout] ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GALLERY_LAYOUTS.map((l) => (
              <SelectItem key={l} value={l}>
                {GALLERY_LAYOUT_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label className="cursor-pointer">Ampliar al tocar (lightbox)</Label>
        <Switch
          checked={config.lightbox !== false}
          onCheckedChange={(v) => onChange({ lightbox: v })}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label className="cursor-pointer">Efecto Ken Burns (zoom lento)</Label>
        <Switch
          checked={Boolean(config.kenBurns)}
          onCheckedChange={(v) => onChange({ kenBurns: v })}
        />
      </div>

      {images.length > 0 && (
        <>
          <SortableImageGrid
            images={images}
            onChange={(next) => onChange({ images: next })}
          />
          <p className="text-xs text-muted-foreground">
            Arrastra las fotos para reordenarlas.
          </p>
        </>
      )}

      {ctx ? (
        images.length < 20 ? (
          <ImageUploader
            value=""
            onChange={(url) => onChange({ images: [...images, url] })}
            ctx={ctx}
            label="Agregar foto"
          />
        ) : (
          <p className="text-xs text-muted-foreground">Máximo 20 fotos.</p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          Guarda la invitación para poder subir imágenes.
        </p>
      )}
    </div>
  );
}

// ---- Video ----------------------------------------------------------------

function VideoEditor({ config, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Enlace (YouTube o Vimeo)">
        <Input
          type="url"
          placeholder="https://youtube.com/watch?v=…"
          value={str(config.url)}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </Field>
    </div>
  );
}

// ---- Itinerary ------------------------------------------------------------

type ItineraryItem = { time: string; label: string };

function ItineraryEditor({ config, onChange }: EditorProps) {
  const items: ItineraryItem[] = Array.isArray(config.items)
    ? (config.items as ItineraryItem[])
    : [];

  function update(i: number, patch: Partial<ItineraryItem>) {
    onChange({
      items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>

      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="w-28"
              placeholder="18:00"
              value={it.time}
              onChange={(e) => update(i, { time: e.target.value })}
            />
            <Input
              placeholder="Ceremonia"
              value={it.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Quitar"
              onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      {items.length < 30 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ items: [...items, { time: "", label: "" }] })}
        >
          + Agregar horario
        </Button>
      )}
    </div>
  );
}

// ---- Dress code -----------------------------------------------------------

function DresscodeEditor({ config, onChange, ctx }: EditorProps) {
  const level = (config.level as DresscodeLevel) ?? "formal";
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Código de vestimenta">
        <Select
          value={level}
          onValueChange={(v) => onChange({ level: v as DresscodeLevel })}
        >
          <SelectTrigger>
            <SelectValue>
              {(v: string) => DRESSCODE_LABELS[v as DresscodeLevel] ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DRESSCODE_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {DRESSCODE_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field
        label={level === "custom" ? "Descripción" : "Nota adicional (opcional)"}
      >
        <Textarea
          placeholder={
            level === "custom"
              ? "Describe el código de vestimenta."
              : "Ej. evita colores blancos."
          }
          value={str(config.description)}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>

      <Field label="Imagen personalizada (opcional)">
        {ctx ? (
          <ImageUploader
            value={str(config.imageUrl)}
            onChange={(url) => onChange({ imageUrl: url })}
            ctx={ctx}
            label="Subir imagen"
          />
        ) : (
          <Input
            type="url"
            placeholder="https://…"
            value={str(config.imageUrl)}
            onChange={(e) => onChange({ imageUrl: e.target.value })}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Si subes una imagen, se muestra en lugar de la ilustración.
        </p>
      </Field>
    </div>
  );
}

// ---- Gifts ----------------------------------------------------------------

type GiftLink = { label: string; url: string };

function GiftsEditor({ config, onChange }: EditorProps) {
  const links: GiftLink[] = Array.isArray(config.links)
    ? (config.links as GiftLink[])
    : [];

  function update(i: number, patch: Partial<GiftLink>) {
    onChange({ links: links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  }

  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Descripción">
        <Textarea value={str(config.description)} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>

      <div className="space-y-2">
        {links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="w-32"
              placeholder="Amazon"
              value={l.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <Input
              type="url"
              placeholder="https://…"
              value={l.url}
              onChange={(e) => update(i, { url: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Quitar"
              onClick={() => onChange({ links: links.filter((_, j) => j !== i) })}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      {links.length < 10 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ links: [...links, { label: "", url: "" }] })}
        >
          + Agregar enlace
        </Button>
      )}
    </div>
  );
}

// ---- Music ----------------------------------------------------------------

function MusicEditor({ config, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Enlace (Spotify, YouTube o audio)">
        <Input
          type="url"
          placeholder="https://open.spotify.com/…"
          value={str(config.url)}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </Field>
    </div>
  );
}

// ---- RSVP -----------------------------------------------------------------

function RsvpEditor({ config, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Descripción">
        <Textarea value={str(config.description)} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>
      <Field label="Fecha límite (opcional)">
        <Input
          type="datetime-local"
          value={isoToLocalInput(str(config.deadline))}
          onChange={(e) => onChange({ deadline: localInputToIso(e.target.value) })}
        />
      </Field>
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label className="cursor-pointer">Pedir número de invitados</Label>
        <Switch
          checked={Boolean(config.allowGuestCount ?? true)}
          onCheckedChange={(v) => onChange({ allowGuestCount: v })}
        />
      </div>
    </div>
  );
}

// ---- Per-module animation control -----------------------------------------

const INHERIT = "__inherit__";

function AnimationControl({
  config,
  onChange,
  defaults,
}: EditorProps & { defaults: AnimationConfig }) {
  const override = (config.animation ?? {}) as AnimationOverride;
  const enabled = override.enabled ?? defaults.enabled;
  const preset = override.preset ?? INHERIT;

  function patch(p: Partial<AnimationOverride>) {
    const next: Record<string, unknown> = { ...override, ...p };
    for (const k of Object.keys(next)) {
      if (next[k] === undefined) delete next[k];
    }
    onChange({ animation: next });
  }

  const selectedMeta =
    preset !== INHERIT ? ANIMATION_REGISTRY[preset as AnimationPreset] : null;
  const hasOverride = Object.keys(override).length > 0;

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <Label className="cursor-pointer">Animar este módulo</Label>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => patch({ enabled: v })}
        />
      </div>

      {enabled && (
        <>
          <Field label="Animación de entrada">
            <Select
              value={preset}
              onValueChange={(v) =>
                patch({ preset: v === INHERIT ? undefined : (v as AnimationPreset) })
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string) =>
                    v === INHERIT
                      ? "Heredar del tema"
                      : (ANIMATION_REGISTRY[v as AnimationPreset]?.label ?? v)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={INHERIT}>Heredar del tema</SelectItem>
                {REVEAL_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ANIMATION_REGISTRY[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMeta && (
              <div className="flex items-center gap-2 pt-1">
                <Badge
                  variant={selectedMeta.cost === "low" ? "secondary" : "destructive"}
                >
                  {selectedMeta.cost}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedMeta.description}
                </span>
              </div>
            )}
            {selectedMeta && selectedMeta.cost !== "low" && (
              <p className="pt-1 text-xs text-amber-600">
                ⚠ Puede impactar el rendimiento en móviles.
              </p>
            )}
          </Field>

          <AnimationFields value={override} onPatch={patch} defaults={defaults} />

          {hasOverride && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ animation: {} })}
            >
              Restaurar (heredar del tema)
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ---- Dispatcher -----------------------------------------------------------

export function ModuleConfigEditor({
  moduleType,
  config,
  onChange,
  ctx,
  animationDefaults,
  eventDate,
  onSetEventDate,
}: {
  moduleType: ModuleType;
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  ctx?: UploadContext;
  /** The theme's animation — shown as the inherited baseline in the control. */
  animationDefaults?: AnimationConfig;
  /** Invitation event date (ISO) + setter, used by the countdown module. */
  eventDate?: string;
  onSetEventDate?: (iso: string) => void;
}) {
  const props = { config, onChange, ctx };

  const editor = (() => {
    switch (moduleType) {
      case "hero":
        return <HeroEditor {...props} />;
      case "welcome":
        return <WelcomeEditor {...props} />;
      case "countdown":
        return (
          <CountdownEditor
            {...props}
            eventDate={eventDate}
            onSetEventDate={onSetEventDate}
          />
        );
      case "map":
        return <MapEditor {...props} />;
      case "gallery":
        return <GalleryEditor {...props} />;
      case "video":
        return <VideoEditor {...props} />;
      case "itinerary":
        return <ItineraryEditor {...props} />;
      case "dresscode":
        return <DresscodeEditor {...props} />;
      case "gifts":
        return <GiftsEditor {...props} />;
      case "music":
        return <MusicEditor {...props} />;
      case "rsvp":
        return <RsvpEditor {...props} />;
      default:
        return null;
    }
  })();

  return (
    <div>
      {editor}
      <AnimationControl
        config={config}
        onChange={onChange}
        defaults={animationDefaults ?? ANIM_DEFAULTS}
      />
    </div>
  );
}
