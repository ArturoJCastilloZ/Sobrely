"use client";

import { useRef, useState } from "react";
import {
  CANVAS_ASPECTS,
  CANVAS_ASPECT_LABELS,
  canvasConfigSchema,
  canvasLayerSchema,
  type CanvasAspect,
  type CanvasConfig,
  type CanvasLayer,
} from "@/lib/modules/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUploader, type UploadContext } from "@/components/editor/image-uploader";

/**
 * Editor de la "sección libre" — PRUEBA DE CONCEPTO.
 *
 * Reusa deliberadamente la mecánica de arrastre que ya está en producción para
 * los stickers (`setPointerCapture` + coordenadas fraccionarias contra el
 * `getBoundingClientRect` de la superficie), en vez de meter una librería de
 * canvas. Esa técnica ya sobrevivió a móvil en este proyecto.
 *
 * Lo que este editor NO tiene, y es exactamente el pozo que el análisis
 * advirtió: sin deshacer/rehacer, sin guías de alineación, sin reordenar capas
 * más allá del orden del arreglo, sin selección múltiple y sin teclado. Con
 * cuatro capas se siente bien; con veinte, no.
 */

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function newLayer(kind: CanvasLayer["kind"]): CanvasLayer {
  return canvasLayerSchema.parse({
    id: crypto.randomUUID(),
    kind,
    ...(kind === "text" ? { text: "Tu texto" } : {}),
  });
}

export function CanvasEditor({
  config,
  onChange,
  ctx,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  ctx?: UploadContext;
}) {
  const parsed = canvasConfigSchema.parse(config ?? {}) as CanvasConfig;
  const [selectedId, setSelectedId] = useState<string | null>(
    parsed.layers[0]?.id ?? null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const selected = parsed.layers.find((l) => l.id === selectedId) ?? null;

  function setLayers(layers: CanvasLayer[]) {
    onChange({ layers });
  }

  function patchLayer(id: string, patch: Partial<CanvasLayer>) {
    setLayers(
      parsed.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  }

  function addLayer(kind: CanvasLayer["kind"]) {
    const layer = newLayer(kind);
    setLayers([...parsed.layers, layer]);
    setSelectedId(layer.id);
  }

  function removeLayer(id: string) {
    setLayers(parsed.layers.filter((l) => l.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    setSelectedId(id);
    setDragId(id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragId || !surfaceRef.current) return;
    const r = surfaceRef.current.getBoundingClientRect();
    patchLayer(dragId, {
      x: clamp((e.clientX - r.left) / r.width, 0, 1),
      y: clamp((e.clientY - r.top) / r.height, 0, 1),
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Título de la sección (opcional)</Label>
        <Input
          value={parsed.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Sin título"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Proporción</Label>
          <select
            value={parsed.aspect}
            onChange={(e) =>
              onChange({ aspect: e.target.value as CanvasAspect })
            }
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base md:text-sm"
          >
            {CANVAS_ASPECTS.map((a) => (
              <option key={a} value={a}>
                {CANVAS_ASPECT_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fondo de la sección</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={parsed.background || "#ffffff"}
              onChange={(e) => onChange({ background: e.target.value })}
              className="size-8 shrink-0 rounded border"
              aria-label="Color de fondo de la sección"
            />
            {parsed.background ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ background: "" })}
              >
                Quitar
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Hereda</span>
            )}
          </div>
        </div>
      </div>

      {/* Superficie de arrastre: es el mismo lienzo que verá el invitado, con
          proporción fija, así que lo que se coloca aquí es lo que se publica. */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          Arrastra para colocar {parsed.layers.length > 0 ? "" : "(agrega una capa)"}
        </Label>
        <div
          ref={surfaceRef}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragId(null)}
          onPointerLeave={() => setDragId(null)}
          style={{
            containerType: "inline-size",
            aspectRatio: parsed.aspect.replace("/", " / "),
            background: parsed.background || undefined,
          }}
          className="relative w-full touch-none overflow-hidden rounded-lg border border-dashed bg-muted/30"
        >
          {parsed.layers.map((layer) => {
            const isSel = layer.id === selectedId;
            return (
              <div
                key={layer.id}
                onPointerDown={(e) => onPointerDown(e, layer.id)}
                style={{
                  position: "absolute",
                  left: `${layer.x * 100}%`,
                  top: `${layer.y * 100}%`,
                  width: `${layer.w * 100}%`,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                }}
                className={`cursor-grab ${isSel ? "outline outline-2 outline-primary" : ""}`}
              >
                {layer.kind === "text" ? (
                  <div
                    style={{
                      color: layer.color,
                      textAlign: layer.align,
                      fontSize: `${layer.fontSize}cqw`,
                      lineHeight: 1.15,
                    }}
                    className="font-display break-words select-none"
                  >
                    {layer.text || "Texto"}
                  </div>
                ) : layer.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={layer.url}
                    alt=""
                    draggable={false}
                    className="h-auto w-full select-none"
                  />
                ) : (
                  <div className="flex h-16 items-center justify-center rounded border border-dashed text-[11px] text-muted-foreground">
                    Sube una imagen
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => addLayer("text")}>
          + Texto
        </Button>
        <Button variant="outline" size="sm" onClick={() => addLayer("image")}>
          + Imagen
        </Button>
      </div>

      {selected ? (
        <div className="space-y-2.5 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              Capa seleccionada · {selected.kind === "text" ? "Texto" : "Imagen"}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeLayer(selected.id)}
            >
              Eliminar
            </Button>
          </div>

          {selected.kind === "text" ? (
            <>
              <Textarea
                value={selected.text}
                onChange={(e) =>
                  patchLayer(selected.id, { text: e.target.value })
                }
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">
                    Tamaño ({selected.fontSize}% del ancho)
                  </Label>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={selected.fontSize}
                    onChange={(e) =>
                      patchLayer(selected.id, {
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Color</Label>
                  <input
                    type="color"
                    value={selected.color}
                    onChange={(e) =>
                      patchLayer(selected.id, { color: e.target.value })
                    }
                    className="h-8 w-full rounded border"
                    aria-label="Color del texto"
                  />
                </div>
              </div>
            </>
          ) : (
            ctx ? (
              <ImageUploader
                value={selected.url}
                onChange={(url) => patchLayer(selected.id, { url })}
                ctx={ctx}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Guarda la invitación para poder subir imágenes.
              </p>
            )
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">
                Ancho ({Math.round(selected.w * 100)}%)
              </Label>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(selected.w * 100)}
                onChange={(e) =>
                  patchLayer(selected.id, { w: Number(e.target.value) / 100 })
                }
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Giro ({selected.rotation}°)</Label>
              <input
                type="range"
                min={-180}
                max={180}
                value={selected.rotation}
                onChange={(e) =>
                  patchLayer(selected.id, { rotation: Number(e.target.value) })
                }
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>
      ) : parsed.layers.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Toca una capa en el lienzo para editarla.
        </p>
      ) : null}
    </div>
  );
}
