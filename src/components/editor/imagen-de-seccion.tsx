"use client";

import {
  MEDIA_FOCALS,
  MEDIA_FOCAL_LABELS,
  MEDIA_POSITIONS,
  MEDIA_POSITION_LABELS,
  MEDIA_RATIOS,
  MEDIA_RATIO_LABELS,
  MEDIA_SHAPES,
  MEDIA_SHAPE_LABELS,
} from "@/lib/modules/types";
import { FeatureBadge } from "@/components/billing/feature-badge";
import {
  ImageUploader,
  type UploadContext,
} from "@/components/editor/image-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Lo que el esquema garantiza que hay en `config.media`. */
type Media = {
  url: string;
  alt: string;
  position: string;
  ratio: string;
  focal: string;
  overlay: number;
  shape: string;
};

const DEFECTO: Media = {
  url: "",
  alt: "",
  position: "none",
  ratio: "4/3",
  focal: "center",
  overlay: 0,
  shape: "rect",
};

/** Lee `config.media` sin fiarse: el panel recibe la config CRUDA. */
function leer(config: Record<string, unknown>): Media {
  const m = config.media;
  if (!m || typeof m !== "object") return DEFECTO;
  const v = m as Record<string, unknown>;
  const cad = (k: keyof Media, def: string) =>
    typeof v[k] === "string" ? (v[k] as string) : def;
  return {
    url: cad("url", ""),
    alt: cad("alt", ""),
    position: cad("position", "none"),
    ratio: cad("ratio", "4/3"),
    focal: cad("focal", "center"),
    overlay: typeof v.overlay === "number" ? v.overlay : 0,
    shape: cad("shape", "rect"),
  };
}

/**
 * El slot de imagen de una sección, expuesto en el panel.
 *
 * ── Por qué hacía falta ───────────────────────────────────────────────
 *
 * `media{url,alt,position,ratio,focal,overlay,shape}` existía en el esquema
 * desde la Fase 11 (P2) y el renderer lo pinta entero, pero **el editor no
 * mencionaba `media` ni una vez** — medido sobre las 1 067 líneas de
 * `config-editors.tsx`. O sea que la única forma de tener una foto en una
 * sección era que la plantilla la trajera sembrada.
 *
 * ── Por qué va aquí y no en los once editores ─────────────────────────
 *
 * Mismo sitio y mismo motivo que `ComposicionDeSeccion`: el dispatcher de
 * `registry.tsx` ya centraliza el despacho por tipo, así que el bloque se
 * escribe una vez y quien decide si aparece es el ESQUEMA
 * (`tieneSlotDeMedia`), no una lista a mano. `hero` queda fuera solo, porque
 * no lleva `mediaShape`: compone su imagen con `variant` e `imageUrl`.
 *
 * ── Revelado progresivo ───────────────────────────────────────────────
 *
 * Sin imagen sólo se ve el botón de subir. Las seis perillas restantes no
 * describen nada mientras no hay foto, y este panel mide ~280 px: mostrarlas
 * siempre convierte cada sección en el formulario que el rediseño quiere
 * matar. Es el mismo patrón que `theme-panel` ya usa para la atenuación del
 * fondo (`{theme.backgroundImage.url && ...}`).
 *
 * Dos ocultaciones más, y las dos salen de MEDIR el renderer:
 *
 * - La proporción no se muestra con forma `circle`: `previews.tsx` no aplica
 *   `aspectRatio` cuando la forma es círculo, así que el control no haría
 *   nada y mentiría.
 * - El velo sólo aparece con la imagen DE FONDO. En las demás posiciones la
 *   foto no lleva texto encima, y atenuarla sólo la ensucia.
 *
 * ── Por que `SelectValue` lleva funcion ──────────────────────────────
 *
 * `<SelectValue />` a secas pinta el valor CRUDO del enum: el disparador decia
 * «top», «rect», «4/3», «center» mientras el desplegable si mostraba los
 * rotulos. Medido en Chrome — las tablas de rotulos eran, en la practica,
 * codigo muerto en el sitio que el usuario mira primero. La API de Base UI
 * acepta una funcion para formatearlo.
 *
 * ── El gate ───────────────────────────────────────────────────────────
 *
 * Lleva `FeatureBadge` de `custom_art` porque esto SÍ añade una superficie
 * donde meter arte propio — al contrario que `ComposicionDeSeccion`, que sólo
 * recoloca lo que el usuario ya tiene. El gate de verdad vive en
 * `canPublishInvitation`; la insignia sólo lo dice antes de que sorprenda.
 */
export function ImagenDeSeccion({
  config,
  onChange,
  ctx,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  ctx?: UploadContext;
}) {
  const media = leer(config);
  // El parche reemplaza la clave entera, así que `media` viaja completo. Un
  // parche parcial borraría las perillas que no se tocaron.
  const set = (cambio: Partial<Media>) =>
    onChange({ media: { ...media, ...cambio } });

  // `onValueChange` de Base UI entrega `string | null`: `null` es «se
  // deseleccionó». Ninguna de estas perillas tiene estado vacío —el esquema
  // exige un valor de su enum—, así que un `null` conserva el actual en vez de
  // escribir algo que `parseConfig` tendría que rescatar.
  const elegido = (clave: keyof Media) => (v: string | null) =>
    v === null ? undefined : set({ [clave]: v } as Partial<Media>);

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Imagen de la sección
        </p>
        <FeatureBadge feature="custom_art" />
      </div>

      {ctx ? (
        <ImageUploader
          value={media.url}
          onChange={(url) =>
            set({
              url,
              // Una foto recién subida que se queda en `none` no se ve, y el
              // usuario no tiene forma de saber que le falta un paso. Al subir
              // se coloca arriba, que es la posición que no reordena nada.
              // Al quitarla se vuelve a `none` para no dejar la sección
              // envuelta en un hueco vacío.
              position: url ? (media.position === "none" ? "top" : media.position) : "none",
            })
          }
          ctx={ctx}
        />
      ) : (
        <Input
          value={media.url}
          onChange={(e) => set({ url: e.target.value })}
          placeholder="https://..."
          aria-label="URL de la imagen de la sección"
        />
      )}

      {media.url && (
        <>
          <div className="space-y-1.5">
            <Label>Posición</Label>
            <Select
              value={media.position}
              onValueChange={elegido("position")}
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string | null) =>
                    v ? MEDIA_POSITION_LABELS[v as keyof typeof MEDIA_POSITION_LABELS] : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MEDIA_POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {MEDIA_POSITION_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Forma</Label>
            <Select value={media.shape} onValueChange={elegido("shape")}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string | null) =>
                    v ? MEDIA_SHAPE_LABELS[v as keyof typeof MEDIA_SHAPE_LABELS] : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MEDIA_SHAPES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {MEDIA_SHAPE_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Con forma de círculo el renderer NO aplica `aspectRatio`, así que
              este control no haría nada. Ocultarlo es más honesto que dejarlo
              inerte. */}
          {media.shape !== "circle" && (
            <div className="space-y-1.5">
              <Label>Proporción</Label>
              <Select value={media.ratio} onValueChange={elegido("ratio")}>
                <SelectTrigger>
                  <SelectValue>
                  {(v: string | null) =>
                    v ? MEDIA_RATIO_LABELS[v as keyof typeof MEDIA_RATIO_LABELS] : null
                  }
                </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_RATIOS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {MEDIA_RATIO_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Al recortar, conservar</Label>
            <Select value={media.focal} onValueChange={elegido("focal")}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string | null) =>
                    v ? MEDIA_FOCAL_LABELS[v as keyof typeof MEDIA_FOCAL_LABELS] : null
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MEDIA_FOCALS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {MEDIA_FOCAL_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sólo de fondo: en las demás posiciones no hay texto encima que
              rescatar, y el velo sólo ensuciaría la foto. */}
          {media.position === "background" && (
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="velo-seccion">
                Atenuación ({Math.round(media.overlay * 100)}%)
              </Label>
              <input
                id="velo-seccion"
                type="range"
                min={0}
                max={100}
                value={Math.round(media.overlay * 100)}
                onChange={(e) => set({ overlay: Number(e.target.value) / 100 })}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Oscurece la foto para que el texto de encima se lea.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="alt-seccion">Texto alternativo</Label>
            <Input
              id="alt-seccion"
              value={media.alt}
              onChange={(e) => set({ alt: e.target.value })}
              placeholder="Describe la foto"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              Lo lee quien navega con lector de pantalla. Déjalo vacío si la
              foto es sólo decorativa.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
