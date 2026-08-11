"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GalleryLayout } from "@/lib/modules/types";
import { StaggerGroup } from "@/components/animation/stagger-group";

/** Bento/collage tile spans, cycled by index. */
const COLLAGE_SPANS = [
  "col-span-2 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-2 row-span-2",
];

/**
 * Auto-playing, infinite "coverflow" carousel: the centered photo is largest;
 * neighbors shrink and dim. Wraps around infinitely via modular offset.
 */
function Coverflow({
  images,
  kb,
  reduce,
  onOpen,
}: {
  images: string[];
  kb: boolean;
  reduce: boolean;
  onOpen: (i: number) => void;
}) {
  const [active, setActive] = useState(0);
  const n = images.length;

  useEffect(() => {
    if (reduce || n < 2) return;
    const id = setInterval(() => setActive((a) => (a + 1) % n), 3200);
    return () => clearInterval(id);
  }, [reduce, n]);

  function offset(i: number) {
    let d = (((i - active) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  }

  return (
    <div className="relative h-56 w-full overflow-hidden">
      {images.map((src, i) => {
        const o = offset(i);
        const abs = Math.abs(o);
        if (abs > 2) return null;
        return (
          <div
            key={`${src}-${i}`}
            onClick={() => (o === 0 ? onOpen(i) : setActive(i))}
            className={cn(
              "absolute left-1/2 top-1/2 h-[88%] w-[62%] overflow-hidden rounded-lg",
              o === 0 ? "cursor-zoom-in" : "cursor-pointer",
            )}
            style={{
              transform: `translate(-50%,-50%) translateX(${o * 46}%) scale(${o === 0 ? 1 : 0.8})`,
              zIndex: 10 - abs,
              opacity: abs >= 2 ? 0 : o === 0 ? 1 : 0.6,
              transition: "transform .6s cubic-bezier(.22,1,.36,1), opacity .6s",
            }}
          >
            {/* Ken Burns lives on the inner img so its transform doesn't
                clobber the outer coverflow positioning transform. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Foto ${i + 1}`}
              loading="lazy"
              className={cn(
                "h-full w-full object-cover",
                kb && o === 0 && "inv-kenburns",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Photo gallery with selectable layout (grid / masonry / collage / carousel),
 * optional tap-to-expand lightbox and optional Ken Burns.
 */
export function PhotoGallery({
  images,
  layout,
  lightbox,
  kenBurns,
  animate = false,
}: {
  images: string[];
  layout: GalleryLayout;
  lightbox: boolean;
  kenBurns: boolean;
  animate?: boolean;
}) {
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useState<number | null>(null);
  const kb = kenBurns && !reduce;
  const shared = lightbox && layout !== "carousel";

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function Thumb({ src, i, className }: { src: string; i: number; className?: string }) {
    return (
      <motion.img
        layoutId={shared ? `gphoto-${i}` : undefined}
        src={src}
        alt={`Foto ${i + 1}`}
        loading="lazy"
        onClick={lightbox ? () => setOpen(i) : undefined}
        className={cn(
          "h-full w-full rounded-md object-cover",
          lightbox && "cursor-zoom-in",
          kb && "inv-kenburns",
          className,
        )}
      />
    );
  }

  let bodyEl: React.ReactNode;
  if (layout === "carousel") {
    bodyEl = <Coverflow images={images} kb={kb} reduce={reduce} onOpen={setOpen} />;
  } else if (layout === "masonry") {
    bodyEl = (
      <div className="w-full [column-gap:0.5rem] [columns:2]">
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="mb-2 overflow-hidden rounded-md">
            <Thumb src={src} i={i} />
          </div>
        ))}
      </div>
    );
  } else if (layout === "collage") {
    bodyEl = (
      <div className="grid w-full auto-rows-[64px] grid-cols-4 gap-2 [grid-auto-flow:dense]">
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={cn(
              "overflow-hidden rounded-md",
              COLLAGE_SPANS[i % COLLAGE_SPANS.length],
            )}
          >
            <Thumb src={src} i={i} />
          </div>
        ))}
      </div>
    );
  } else {
    bodyEl = (
      <StaggerGroup
        enabled={animate}
        className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="aspect-square overflow-hidden rounded-md">
            <Thumb src={src} i={i} />
          </div>
        ))}
      </StaggerGroup>
    );
  }

  return (
    <>
      {bodyEl}

      <AnimatePresence>
        {open !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Foto ampliada"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.img
              layoutId={shared ? `gphoto-${open}` : undefined}
              initial={shared ? undefined : { scale: 0.85, opacity: 0 }}
              animate={shared ? undefined : { scale: 1, opacity: 1 }}
              src={images[open]}
              alt={`Foto ${open + 1}`}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(null)}
              className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-lg text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
