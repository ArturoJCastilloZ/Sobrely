"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Minus, Plus, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemeConfig } from "@/lib/theme/theme";
import { STICKER_RADIUS } from "@/components/theme/sticker-layer";

type Sticker = ThemeConfig["stickers"][number];

const NEXT_ROUNDED: Record<Sticker["rounded"], Sticker["rounded"]> = {
  none: "soft",
  soft: "circle",
  circle: "none",
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Editable sticker layer shown over the editor preview. Drag to move; the
 * selected sticker gets a toolbar to scale, rotate and delete. Positions are
 * fractions (0–1) of the layer box, matching the read-only StickerLayer.
 */
export function StickerEditorLayer({
  stickers,
  onChange,
}: {
  stickers: Sticker[];
  onChange: (stickers: Sticker[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const patch = (id: string, p: Partial<Sticker>) =>
    onChange(stickers.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const remove = (id: string) => {
    onChange(stickers.filter((s) => s.id !== id));
    setSelected(null);
  };
  const bringToFront = (id: string) => {
    const s = stickers.find((x) => x.id === id);
    if (s) onChange([...stickers.filter((x) => x.id !== id), s]);
  };

  function onPointerDown(e: React.PointerEvent, s: Sticker) {
    e.preventDefault();
    setSelected(s.id);
    bringToFront(s.id);
    dragId.current = s.id;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragId.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    patch(dragId.current, {
      x: clamp((e.clientX - r.left) / r.width, 0, 1),
      y: clamp((e.clientY - r.top) / r.height, 0, 1),
    });
  }
  const endDrag = () => {
    dragId.current = null;
  };

  // Deseleccionar al pulsar fuera. Antes lo hacía el `onClick` de la capa
  // comparando el objetivo del clic con la propia capa, y eso dejó de ser
  // posible al
  // volverla transparente al puntero: ya no recibe el clic del vacío. Se
  // escucha en el documento y sólo mientras haya algo seleccionado, así que no
  // cuesta un listener cuando nadie usa stickers.
  useEffect(() => {
    if (!selected) return;
    const alPulsar = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.("[data-sticker]")) return;
      setSelected(null);
    };
    document.addEventListener("pointerdown", alPulsar, true);
    return () => document.removeEventListener("pointerdown", alPulsar, true);
  }, [selected]);

  return (
    <div
      ref={ref}
      // `pointer-events-none` en la CAPA, `auto` en cada sticker.
      //
      // Sin esto la capa es un `inset-0` opaco al puntero que se come TODO lo
      // que hay debajo. Ya costó un bug —los clics del paginador, arreglado
      // subiéndolo a `z-40`, ver `editor-stacking.test.ts`— y volvió a costar
      // otro: el arrastre del texto de la portada no llegaba nunca al bloque.
      // MEDIDO en el editor real con `elementsFromPoint` sobre el centro del
      // título: el primer elemento era este DIV `z-30`, y
      // `closest("[data-bloque]")` daba null.
      //
      // Subir el z-index del contenido no era opción: el contenido vive en
      // `z-10` por debajo a propósito. Lo correcto es que la capa no reclame
      // los eventos donde no tiene nada.
      //
      // El arrastre del sticker sigue funcionando porque `onPointerDown` hace
      // `setPointerCapture` sobre la imagen: con captura, los `pointermove`
      // van a la imagen y burbujean hasta el `onPointerMove` de la capa sin
      // depender del hit-test.
      className="pointer-events-none absolute inset-0 z-30"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      {stickers.map((s) => (
        <div
          key={s.id}
          data-sticker={s.id}
          className="pointer-events-auto absolute"
          style={{
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            width: `${s.scale * 100}%`,
            transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.url}
            alt=""
            draggable={false}
            onPointerDown={(e) => onPointerDown(e, s)}
            style={{ borderRadius: STICKER_RADIUS[s.rounded] }}
            className={cn(
              "w-full cursor-move touch-none select-none",
              selected === s.id && "outline outline-2 outline-primary",
            )}
          />
          {selected === s.id && (
            <div
              className="absolute -top-9 left-1/2 flex items-center gap-0.5 rounded-md bg-neutral-900/95 p-0.5 text-white shadow-lg ring-1 ring-white/10"
              style={{ transform: `translateX(-50%) rotate(${-s.rotation}deg)` }}
            >
              <ToolBtn
                label="Más chico"
                onClick={() => patch(s.id, { scale: clamp(s.scale - 0.03, 0.03, 0.9) })}
              >
                <Minus className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn
                label="Más grande"
                onClick={() => patch(s.id, { scale: clamp(s.scale + 0.03, 0.03, 0.9) })}
              >
                <Plus className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn
                label="Rotar izquierda"
                onClick={() =>
                  patch(s.id, { rotation: clamp(s.rotation - 15, -180, 180) })
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn
                label="Rotar derecha"
                onClick={() =>
                  patch(s.id, { rotation: clamp(s.rotation + 15, -180, 180) })
                }
              >
                <RotateCw className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn
                label="Redondear bordes"
                onClick={() => patch(s.id, { rounded: NEXT_ROUNDED[s.rounded] })}
              >
                <Circle className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn label="Eliminar" onClick={() => remove(s.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </ToolBtn>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/15"
    >
      {children}
    </button>
  );
}
