"use client";

import { useEffect, useState } from "react";

import type {
  HeroVariant,
  GalleryLayout,
  DresscodeLevel,
  CountdownVariant,
  RsvpVariant,
  MapVariant,
  ItineraryVariant,
  GiftsVariant,
  RsvpQuestion,
  RsvpQuestionType,
} from "@/lib/modules/types";
import {
  MOSTRAR_MOVIMIENTO_LIBRE,
  parcheDeComposicionDePortada,
  proporcionMasCercana,
  MAX_RSVP_QUESTIONS,
  MAX_RSVP_QUESTION_OPTIONS,
  RSVP_QUESTION_TYPES,
  RSVP_QUESTION_TYPE_LABELS,
} from "@/lib/modules/types";
import { newQuestionId } from "@/lib/modules/rsvp-answers";
import { GALLERY_LAYOUTS, GALLERY_LAYOUT_LABELS } from "@/lib/modules/types";
import {
  COUNTDOWN_VARIANTS,
  COUNTDOWN_VARIANT_LABELS,
  COUNTDOWN_LABEL_STYLES,
  COUNTDOWN_LABEL_STYLE_LABELS,
  COUNTDOWN_NUMBER_WEIGHTS,
  COUNTDOWN_NUMBER_WEIGHT_LABELS,
  DRESSCODE_LEVELS,
  DRESSCODE_LABELS,
  RSVP_VARIANTS,
  RSVP_VARIANT_LABELS,
  RSVP_FIELD_STYLES,
  RSVP_FIELD_STYLE_LABELS,
  RSVP_BUTTON_STYLES,
  RSVP_BUTTON_STYLE_LABELS,
  RSVP_BUTTON_TONES,
  RSVP_BUTTON_TONE_LABELS,
  RSVP_DENSITIES,
  RSVP_DENSITY_LABELS,
  RSVP_ATTENDANCE_STYLES,
  RSVP_ATTENDANCE_STYLE_LABELS,
  MAP_VARIANTS,
  MAP_VARIANT_LABELS,
  ITINERARY_VARIANTS,
  ITINERARY_VARIANT_LABELS,
  DRESSCODE_BADGE_STYLES,
  DRESSCODE_BADGE_STYLE_LABELS,
  GIFTS_VARIANTS,
  GIFTS_VARIANT_LABELS,
} from "@/lib/modules/types";
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
} from "@/components/ui/select";
import {
  ImageUploader,
  type UploadContext,
} from "@/components/editor/image-uploader";
import { SortableImageGrid } from "@/components/editor/sortable-image-grid";
import { ComposicionDePortadaMiniaturas } from "@/components/editor/composicion-de-portada-miniaturas";
import {
  CSS_REVEAL_PRESETS,
  ANIMATION_REGISTRY,
} from "@/lib/animation/registry";
import type {
  AnimationConfig,
  AnimationOverride,
  AnimationPreset,
} from "@/lib/animation/types";
import { AnimationFields } from "@/components/editor/animation-fields";
import { Badge } from "@/components/ui/badge";
import { SelectLabelTrigger } from "@/components/ui/select-label-trigger";
import {
  FontPreviewOptions,
  FontPreviewTrigger,
} from "@/components/editor/font-select-options";
import type { FontKey } from "@/lib/theme/theme";

const REVEAL_OPTIONS = [...CSS_REVEAL_PRESETS] as AnimationPreset[];

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

/**
 * Composición de la portada, expuesta como PRESETS y no como lienzo libre.
 *
 * Las cinco variantes ya existían en el esquema y en el renderer desde la Fase
 * 11, y `HERO_VARIANT_LABELS` ya traía sus etiquetas — pero **no las usaba
 * ningún componente**: estaban escritas para un selector que nunca se
 * construyó. Medido el 2026-09-08. O sea que un usuario NO podía darle a su
 * invitación ninguna de las composiciones que ve en el catálogo; sólo se
 * conseguían creando la invitación desde una plantilla que ya las trajera.
 *
 * Se exponen acotadas a propósito: cada combinación posible es una que la Fase
 * 11 ya puntuó. Un lienzo libre daría combinaciones infinitas y la mayoría
 * feas, y las feas acaban en soporte y en las capturas del catálogo.
 */
function ComposicionDePortada({
  config,
  onChange,
}: Pick<EditorProps, "config" | "onChange">) {
  const variant = str(config.variant) || "centered";
  const imageUrl = str(config.imageUrl);
  // La medida se guarda ATADA a su URL. Así no hace falta limpiarla de forma
  // sincrónica al cambiar de foto —lo que además ESLint prohíbe con razón— y,
  // más importante, una medida de la foto ANTERIOR no puede usarse nunca: si no
  // corresponde a la URL actual, se descarta al derivarla.
  const [medido, setMedido] = useState<{
    url: string;
    w: number;
    h: number;
  } | null>(null);

  // Se mide la foto REAL del usuario. Sin esto, elegir `split` o `editorial`
  // deja `imageRatio` en `auto`, y el renderer usa 3/4 o 4/3 HARDCODEADOS: una
  // panorámica perdería la mitad y nada lo diría. Es exactamente el defecto que
  // la 0034/0035/0038 pagaron en las plantillas, y exponer la perilla sin medir
  // lo trasladaría al usuario.
  useEffect(() => {
    if (!imageUrl) return;
    let vivo = true;
    const img = new Image();
    img.onload = () => {
      if (vivo) {
        setMedido({ url: imageUrl, w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    // Un 404 o un formato ilegible dejan la medida en nulo, y sin medida NO se
    // toca `imageRatio`: se prefiere el valor de siempre a inventar un encuadre.
    img.onerror = () => {
      if (vivo) setMedido(null);
    };
    img.src = imageUrl;
    return () => {
      vivo = false;
    };
  }, [imageUrl]);

  /** Sólo vale si es de la foto que hay puesta AHORA. */
  const medida = medido && medido.url === imageUrl ? medido : null;

  /** `split` y `editorial` meten la foto en una FIGURA; las otras, no. */
  const enFigura = variant === "split" || variant === "editorial";
  const sugerida = medida ? proporcionMasCercana(medida.w, medida.h) : null;

  return (
    <>
      <Field label="Diseño de la portada">
        {/* Miniaturas y no un `<Select>`: el disparador decía el valor CRUDO
            del enum —«editorial»—, o sea que el control estaba en inglés, que
            es la queja textual de la Fase 4 del plan. Y un layout se reconoce
            antes viéndolo que leyéndolo.

            La decisión sigue viviendo en `parcheDeComposicionDePortada`, que SÍ
            tiene pruebas: este proyecto no tiene entorno de DOM, así que dejar
            la lógica en el componente sería dejarla sin comprobar. Cambia el
            control, no la regla. */}
        <ComposicionDePortadaMiniaturas
          value={variant as HeroVariant}
          name="composicion-de-portada"
          onChange={(v) => onChange(parcheDeComposicionDePortada(v, medida))}
        />
      </Field>

      {/* Se DICE el encuadre en vez de dejarlo pasar en silencio. */}
      {enFigura && imageUrl ? (
        <p className="text-xs text-muted-foreground">
          {sugerida
            ? sugerida.recorte < 0.02
              ? `Encuadre ${sugerida.ratio}: tu foto entra completa.`
              : `Encuadre ${sugerida.ratio}: se recorta un ${Math.round(
                  sugerida.recorte * 100,
                )} % de tu foto. Para que entre completa, súbela en ${sugerida.ratio}.`
            : "No se pudo medir la foto, así que el encuadre queda en el valor por defecto y puede recortar."}
        </p>
      ) : null}

      {/* El interruptor va SEPARADO del combo, no como una sexta opción: el
          diseño elegido se mantiene y esto sólo permite empujar los textos
          encima. Es el mismo control que llevan las 11 secciones.
          OCULTO por ahora — ver `MOSTRAR_MOVIMIENTO_LIBRE`. */}
      <div
        className="space-y-1.5 border-t pt-3"
        hidden={!MOSTRAR_MOVIMIENTO_LIBRE}
      >
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="libre-portada">Movimiento libre del texto</Label>
          <Switch
            id="libre-portada"
            checked={Boolean(config.freeMove)}
            onCheckedChange={(v) => onChange({ freeMove: v })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {config.freeMove
            ? "Arrastra el título, el subtítulo o la etiqueta en la vista previa. El diseño elegido se mantiene."
            : "Actívalo para colocar cada texto a mano sobre el diseño elegido."}
        </p>
      </div>

      {variant === "plain" && imageUrl ? (
        <p className="text-xs text-muted-foreground">
          Esta composición es sólo tipografía: ignora la imagen de fondo a
          propósito.
        </p>
      ) : null}
    </>
  );
}

export function HeroEditor({ config, onChange, ctx }: EditorProps) {
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
      <ComposicionDePortada config={config} onChange={onChange} />
    </div>
  );
}

// ---- Welcome --------------------------------------------------------------

export function WelcomeEditor({ config, onChange }: EditorProps) {
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

/** Miniatura fiel a la distribución, no un icono abstracto del diseño. */
function CountdownDesignThumbnail({ variant }: { variant: CountdownVariant }) {
  const cell = "flex items-center justify-center border border-current text-[7px] leading-none";
  const value = "8";

  if (variant === "poster") {
    return (
      <span aria-hidden className="grid h-10 grid-cols-[1.2fr_2fr] gap-1 text-primary">
        <i className={`${cell} rounded-sm bg-current text-background`}>{value}</i>
        <span className="grid grid-cols-3 gap-1">
          <i className={`${cell} rounded-sm bg-current text-background`}>{value}</i>
          <i className={`${cell} rounded-sm bg-current text-background`}>{value}</i>
          <i className={`${cell} rounded-sm bg-current text-background`}>{value}</i>
        </span>
      </span>
    );
  }

  if (variant === "split") {
    return (
      <span aria-hidden className="grid h-10 grid-cols-2 gap-1 text-primary">
        {[0, 1, 2, 3].map((item) => <i key={item} className={`${cell} rounded-sm bg-current/10`}>{value}</i>)}
      </span>
    );
  }

  const shape = {
    cards: "rounded-sm bg-current/15 shadow-sm",
    outline: "rounded-sm bg-transparent border-2",
    minimal: "border-x-0 border-t-0 rounded-none",
    circles: "rounded-full bg-current/15",
    timeline: "rounded-none border-y-0 border-r-0 first:border-l",
    pill: "rounded-full bg-current/10 border-2",
    ribbon: "rounded-none border-x-0 border-y-2 bg-current/15",
    stamp: "rounded-full border-2 border-dashed bg-current/10",
  }[variant];

  return (
    <span
      aria-hidden
      className={`grid h-10 grid-cols-4 gap-1 text-primary ${variant === "timeline" ? "gap-0" : ""}`}
    >
      {[0, 1, 2, 3].map((item) => <i key={item} className={`${cell} ${shape}`}>{value}</i>)}
    </span>
  );
}

export function CountdownEditor({
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
  const variant = (str(config.variant) || "cards") as CountdownVariant;
  const numberFont = str(config.numberFont) || undefined;
  const labelStyle = str(config.labelStyle) || "short";
  const numberWeight = str(config.numberWeight) || "bold";

  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>

      <Field label="Diseño de la cuenta regresiva">
        <div className="grid grid-cols-2 gap-2">
          {COUNTDOWN_VARIANTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ variant: option })}
              className={`rounded-md border p-2 text-left text-sm transition-colors ${variant === option ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}
            >
              <CountdownDesignThumbnail variant={option} />
              <span className="mt-1.5 block">{COUNTDOWN_VARIANT_LABELS[option]}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Fuente de los números">
        <Select
          value={numberFont ?? "global"}
          onValueChange={(value) => onChange({ numberFont: value === "global" ? undefined : value as FontKey })}
        >
          <SelectTrigger><FontPreviewTrigger font={numberFont as FontKey | undefined} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Diseño global</SelectItem>
            <FontPreviewOptions />
          </SelectContent>
        </Select>
      </Field>
      <Field label="Etiquetas de tiempo">
        <div className="grid grid-cols-3 gap-1.5">
          {COUNTDOWN_LABEL_STYLES.map((option) => (
            <Button
              key={option}
              type="button"
              variant={labelStyle === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ labelStyle: option })}
            >
              {COUNTDOWN_LABEL_STYLE_LABELS[option]}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Peso de los números">
        <div className="grid grid-cols-3 gap-1.5">
          {COUNTDOWN_NUMBER_WEIGHTS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={numberWeight === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ numberWeight: option })}
            >
              {COUNTDOWN_NUMBER_WEIGHT_LABELS[option]}
            </Button>
          ))}
        </div>
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

export function MapEditor({ config, onChange }: EditorProps) {
  const mapsActionStyle = str(config.mapsActionStyle) || "link";
  const variant = (str(config.variant) || "classic") as MapVariant;
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
      <Field label="Diseño de ubicación">
        <div className="grid grid-cols-3 gap-1.5">
          {MAP_VARIANTS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={variant === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ variant: option })}
            >
              {MAP_VARIANT_LABELS[option]}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Acción de mapa">
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ["link", "Enlace"],
            ["button", "Botón"],
            ["pill", "Cápsula"],
          ] as const).map(([option, label]) => (
            <Button
              key={option}
              type="button"
              variant={mapsActionStyle === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ mapsActionStyle: option })}
            >
              {label}
            </Button>
          ))}
        </div>
      </Field>
    </div>
  );
}

// ---- Gallery --------------------------------------------------------------

export function GalleryEditor({ config, onChange, ctx }: EditorProps) {
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
          <SelectTrigger><SelectLabelTrigger label={GALLERY_LAYOUT_LABELS[layout]} /></SelectTrigger>
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

export function VideoEditor({ config, onChange }: EditorProps) {
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

export function ItineraryEditor({ config, onChange }: EditorProps) {
  const items: ItineraryItem[] = Array.isArray(config.items)
    ? (config.items as ItineraryItem[])
    : [];
  const variant = (str(config.variant) || "cards") as ItineraryVariant;

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
      <Field label="Diseño del programa">
        <div className="grid grid-cols-3 gap-1.5">
          {ITINERARY_VARIANTS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={variant === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ variant: option })}
            >
              {ITINERARY_VARIANT_LABELS[option]}
            </Button>
          ))}
        </div>
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

/**
 * Libro de firmas. La config solo describe el módulo — las firmas viven en su
 * propia tabla porque las escribe un visitante anónimo (ver migración 0023).
 */
export function SignaturesEditor({ config, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input
          value={str(config.title)}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Libro de firmas"
        />
      </Field>
      <Field label="Descripción">
        <Textarea
          value={str(config.description)}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="Déjanos unas palabras. Las leeremos todas."
        />
      </Field>
      <Field label="Texto del botón">
        <Input
          value={str(config.buttonLabel)}
          onChange={(e) => onChange({ buttonLabel: e.target.value })}
          placeholder="Firmar"
        />
      </Field>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label className="cursor-pointer">Revisar las firmas antes de publicarlas</Label>
        <Switch
          checked={Boolean(config.requireApproval)}
          onCheckedChange={(v) => onChange({ requireApproval: v })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {config.requireApproval
          ? "Cada firma llega oculta y tú decides si se muestra. Acuérdate de revisarlas durante el evento, o el muro se queda vacío."
          : "Las firmas se muestran al instante. Puedes ocultar cualquiera desde el panel del evento."}
      </p>
    </div>
  );
}

export function DresscodeEditor({ config, onChange, ctx }: EditorProps) {
  const level = (config.level as DresscodeLevel) ?? "formal";
  const badgeStyle = str(config.badgeStyle) || "pill";
  const palette = Array.isArray(config.palette)
    ? config.palette.filter((color): color is string => typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color))
    : [];
  const updatePalette = (index: number, color: string) => {
    onChange({ palette: palette.map((current, i) => (i === index ? color : current)) });
  };
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
          <SelectTrigger><SelectLabelTrigger label={DRESSCODE_LABELS[level]} /></SelectTrigger>
          <SelectContent>
            {DRESSCODE_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {DRESSCODE_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {level !== "custom" && (
        <Field label="Estilo de la etiqueta">
          <div className="grid grid-cols-3 gap-1.5">
            {DRESSCODE_BADGE_STYLES.map((option) => (
              <Button
                key={option}
                type="button"
                variant={badgeStyle === option ? "secondary" : "outline"}
                size="sm"
                onClick={() => onChange({ badgeStyle: option })}
              >
                {DRESSCODE_BADGE_STYLE_LABELS[option]}
              </Button>
            ))}
          </div>
        </Field>
      )}
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

      <Field label="Contexto (opcional)">
        <Input
          placeholder="Ej. ceremonia al aire libre sobre césped."
          value={str(config.context)}
          onChange={(e) => onChange({ context: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sugerencias (opcional)">
          <Textarea
            placeholder="Ej. telas ligeras y zapatos cómodos."
            value={str(config.suggestions)}
            onChange={(e) => onChange({ suggestions: e.target.value })}
          />
        </Field>
        <Field label="Evita (opcional)">
          <Textarea
            placeholder="Ej. blanco, mezclilla o tenis."
            value={str(config.restrictions)}
            onChange={(e) => onChange({ restrictions: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Paleta sugerida (opcional)">
        <div className="flex flex-wrap gap-2">
          {palette.map((color, index) => (
            <div key={`${color}-${index}`} className="flex items-center gap-1 rounded-md border p-1">
              <input
                aria-label={`Color sugerido ${index + 1}`}
                className="h-8 w-8 cursor-pointer rounded"
                type="color"
                value={color}
                onChange={(e) => updatePalette(index, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onChange({ palette: palette.filter((_, i) => i !== index) })}
              >
                Quitar
              </Button>
            </div>
          ))}
          {palette.length < 4 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ palette: [...palette, "#B68A91"] })}
            >
              Agregar color
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Hasta cuatro tonos para orientar a tus invitados.</p>
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

export function GiftsEditor({ config, onChange }: EditorProps) {
  const links: GiftLink[] = Array.isArray(config.links)
    ? (config.links as GiftLink[])
    : [];
  const variant = (str(config.variant) || "pills") as GiftsVariant;

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
      <Field label="Diseño de enlaces">
        <div className="grid grid-cols-3 gap-1.5">
          {GIFTS_VARIANTS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={variant === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ variant: option })}
            >
              {GIFTS_VARIANT_LABELS[option]}
            </Button>
          ))}
        </div>
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

export function MusicEditor({ config, onChange }: EditorProps) {
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

function RsvpDesignThumbnail({ variant }: { variant: RsvpVariant }) {
  const field = "h-1.5 rounded-sm border border-current/60";
  const shell = {
    classic: "",
    card: "rounded-md border p-1.5 shadow-sm",
    minimal: "border-x-0 border-t-0 rounded-none",
    editorial: "rounded-none border-x-2 border-y-0 pl-1.5",
  }[variant];
  return (
    <span aria-hidden className={`flex h-10 flex-col gap-1 text-primary ${shell}`}>
      <i className="h-1.5 w-3/5 rounded-sm bg-current" />
      <i className={field} />
      <i className={field} />
      <i className="mt-auto h-2 rounded-sm bg-current" />
    </span>
  );
}

export function RsvpEditor({
  config,
  onChange,
  rsvpMode,
}: EditorProps & { rsvpMode?: "open" | "guest_list" }) {
  const isGuestList = rsvpMode === "guest_list";
  const variant = (str(config.variant) || "classic") as RsvpVariant;
  const fieldStyle = str(config.fieldStyle) || "soft";
  const buttonStyle = str(config.buttonStyle) || "rounded";
  const buttonTone = str(config.buttonTone) || "auto";
  const density = str(config.density) || "comfortable";
  const attendanceStyle = str(config.attendanceStyle) || "cards";
  return (
    <div className="space-y-3">
      <Field label="Título">
        <Input value={str(config.title)} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Descripción">
        <Textarea value={str(config.description)} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>
      <Field label="Texto del botón">
        <Input
          value={str(config.buttonLabel) || "Confirmar"}
          maxLength={40}
          onChange={(e) => onChange({ buttonLabel: e.target.value })}
        />
      </Field>
      <Field label="Diseño del formulario">
        <div className="grid grid-cols-2 gap-2">
          {RSVP_VARIANTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ variant: option })}
              className={`rounded-md border p-2 text-left text-sm transition-colors ${variant === option ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}
            >
              <RsvpDesignThumbnail variant={option} />
              <span className="mt-1.5 block">{RSVP_VARIANT_LABELS[option]}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Estilo de los campos">
        <div className="grid grid-cols-3 gap-1.5">
          {RSVP_FIELD_STYLES.map((option) => (
            <Button
              key={option}
              type="button"
              variant={fieldStyle === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ fieldStyle: option })}
            >
              {RSVP_FIELD_STYLE_LABELS[option]}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Forma del botón">
        <div className="grid grid-cols-3 gap-1.5">
          {RSVP_BUTTON_STYLES.map((option) => (
            <Button
              key={option}
              type="button"
              variant={buttonStyle === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ buttonStyle: option })}
            >
              {RSVP_BUTTON_STYLE_LABELS[option]}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Estilo de la acción">
        <div className="grid grid-cols-2 gap-1.5">
          {RSVP_BUTTON_TONES.map((option) => (
            <Button
              key={option}
              type="button"
              variant={buttonTone === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ buttonTone: option })}
            >
              {RSVP_BUTTON_TONE_LABELS[option]}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Espaciado del formulario">
        <div className="grid grid-cols-3 gap-1.5">
          {RSVP_DENSITIES.map((option) => (
            <Button
              key={option}
              type="button"
              variant={density === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ density: option })}
            >
              {RSVP_DENSITY_LABELS[option]}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Opciones de asistencia">
        <div className="grid grid-cols-3 gap-1.5">
          {RSVP_ATTENDANCE_STYLES.map((option) => (
            <Button
              key={option}
              type="button"
              variant={attendanceStyle === option ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ attendanceStyle: option })}
            >
              {RSVP_ATTENDANCE_STYLE_LABELS[option]}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Fecha límite (opcional)">
        <Input
          type="datetime-local"
          value={isoToLocalInput(str(config.deadline))}
          onChange={(e) => onChange({ deadline: localInputToIso(e.target.value) })}
        />
      </Field>
      {isGuestList ? (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          En modo lista de invitados el cupo de cada invitado lo defines tú en la
          pestaña <span className="font-medium">Invitados</span>.
        </p>
      ) : (
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label className="cursor-pointer">Pedir número de invitados</Label>
          <Switch
            checked={Boolean(config.allowGuestCount ?? true)}
            onCheckedChange={(v) => onChange({ allowGuestCount: v })}
          />
        </div>
      )}
      <RsvpQuestionsEditor config={config} onChange={onChange} />
    </div>
  );
}

/**
 * Preguntas personalizadas al confirmar (alergias, menú, transporte).
 *
 * El `id` se genera una vez y no se vuelve a tocar: es la llave con la que se
 * guardan las respuestas, así que renombrar la pregunta conserva lo ya
 * recibido. Borrar una pregunta NO borra las respuestas de la base, pero deja
 * de mostrarlas — sin la pregunta, el valor suelto no significa nada, y por
 * eso el botón lo advierte.
 */
function RsvpQuestionsEditor({ config, onChange }: EditorProps) {
  const questions: RsvpQuestion[] = Array.isArray(config.questions)
    ? (config.questions as RsvpQuestion[])
    : [];

  function patch(i: number, p: Partial<RsvpQuestion>) {
    const next = questions.map((q, idx) => (idx === i ? { ...q, ...p } : q));
    onChange({ questions: next });
  }

  function add() {
    onChange({
      questions: [
        ...questions,
        {
          id: newQuestionId(),
          label: "",
          type: "text" as const,
          options: [],
          required: false,
        },
      ],
    });
  }

  function remove(i: number) {
    onChange({ questions: questions.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <Label>Preguntas al confirmar</Label>
        <span className="text-xs text-muted-foreground">
          {questions.length}/{MAX_RSVP_QUESTIONS}
        </span>
      </div>

      {questions.length === 0 && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Sin preguntas extra. Puedes pedir alergias, elección de menú o si
          necesitan transporte.
        </p>
      )}

      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2 rounded-md border p-3">
          <Input
            value={q.label ?? ""}
            placeholder="p. ej. ¿Alguna alergia o restricción alimentaria?"
            maxLength={120}
            onChange={(e) => patch(i, { label: e.target.value })}
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
              value={q.type ?? "text"}
              onChange={(e) =>
                patch(i, {
                  type: e.target.value as RsvpQuestionType,
                  // Las opciones solo tienen sentido en "elegir una".
                  options: e.target.value === "choice" ? (q.options ?? []) : [],
                })
              }
            >
              {RSVP_QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {RSVP_QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch
                checked={Boolean(q.required)}
                onCheckedChange={(v) => patch(i, { required: v })}
              />
              Obligatoria
            </label>

            <button
              type="button"
              onClick={() => remove(i)}
              className="ml-auto text-xs text-destructive underline"
              title="Las respuestas ya recibidas dejarán de mostrarse"
            >
              Quitar
            </button>
          </div>

          {q.type === "choice" && (
            <OptionsInput
              options={q.options ?? []}
              onChange={(options) => patch(i, { options })}
            />
          )}

          {/* El guardado ya rechaza estos dos casos, pero con un error genérico
              ("Configuración inválida en el módulo rsvp") que no dice CUÁL
              pregunta falla. El aviso en línea lo señala antes de intentar. */}
          {!q.label?.trim() && (
            <p className="text-xs text-destructive">
              Escribe la pregunta o quítala: no se puede guardar en blanco.
            </p>
          )}
          {q.type === "choice" && (q.options ?? []).length === 0 && (
            <p className="text-xs text-destructive">
              Agrega al menos una opción
              {q.required ? " — sin opciones, nadie podría confirmar." : "."}
            </p>
          )}
        </div>
      ))}

      {questions.length < MAX_RSVP_QUESTIONS && (
        <button
          type="button"
          onClick={add}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Agregar pregunta
        </button>
      )}
    </div>
  );
}


/**
 * Captura de opciones separadas por coma.
 *
 * Guarda su PROPIO texto en vez de re-derivarlo del array en cada tecla, que
 * es lo que rompía el campo: `value={options.join(", ")}` con un `onChange`
 * que hacía `split(",").map(trim).filter(Boolean)` borraba la coma en el
 * instante de teclearla (produce un token vacío que `filter` elimina) y
 * comía el espacio siguiente (lo quita `trim`). El input se peleaba con
 * quien escribía: tras "Carne" ya no se podía seguir.
 *
 * El array se deriva al vuelo para el padre, pero el texto visible es el que
 * el usuario tecleó, intacto. Solo se normaliza al salir del campo, que es
 * cuando ya terminó de escribir.
 */
function OptionsInput({
  options,
  onChange,
}: {
  options: readonly string[];
  onChange: (options: string[]) => void;
}) {
  const [texto, setTexto] = useState(() => options.join(", "));

  function parse(v: string): string[] {
    return v
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .slice(0, MAX_RSVP_QUESTION_OPTIONS);
  }

  const opciones = parse(texto);
  const sobran = texto.split(",").filter((o) => o.trim()).length >
    MAX_RSVP_QUESTION_OPTIONS;

  return (
    <div className="space-y-1">
      <Input
        value={texto}
        placeholder={`Opciones separadas por coma (máx. ${MAX_RSVP_QUESTION_OPTIONS})`}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(parse(e.target.value));
        }}
        // Al salir se normaliza el texto a lo que realmente se guardó, para
        // que no quede una coma suelta o un hueco que no corresponde a nada.
        onBlur={() => setTexto(opciones.join(", "))}
      />
      <p className="text-xs text-muted-foreground">
        {opciones.length === 0
          ? "Escribe las opciones separadas por coma. Ej: Carne, Pescado, Vegetariano"
          : `${opciones.length} ${
              opciones.length === 1 ? "opción" : "opciones"
            }: ${opciones.join(" · ")}`}
        {sobran && ` — solo se guardan las primeras ${MAX_RSVP_QUESTION_OPTIONS}.`}
      </p>
    </div>
  );
}

// ---- Per-module animation control -----------------------------------------

const INHERIT = "__inherit__";

export function AnimationControl({
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
    <div className="space-y-3 pt-3">
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
              <SelectTrigger><SelectLabelTrigger label={preset === INHERIT ? "Heredar del tema" : (ANIMATION_REGISTRY[preset as AnimationPreset]?.label ?? preset)} /></SelectTrigger>
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
              <p className="pt-1 text-xs text-warning">
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

// El despacho por tipo vive en `registry.tsx`.
