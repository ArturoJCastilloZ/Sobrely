"use client";

import { useEffect, useState, type RefObject } from "react";
import type { AnimationTrigger } from "@/lib/animation/types";

/**
 * Decides when an element should reveal. Uses IntersectionObserver for the
 * "scroll" trigger (cheap, no scroll listeners) and reveals on mount for
 * "load". Returns false until revealed.
 *
 * State updates never happen synchronously in the effect body (they run inside
 * the observer callback or a requestAnimationFrame), keeping it lint-clean and
 * avoiding cascading renders.
 */
export function useReveal(
  ref: RefObject<HTMLElement | null>,
  opts: {
    trigger: AnimationTrigger;
    once: boolean;
    enabled: boolean;
    /**
     * Umbral del IntersectionObserver. Debe ser 0 para presets que ocultan
     * recortando la caja con `clip-path`: Chrome descuenta ese recorte del
     * area de interseccion, asi que con un umbral > 0 no disparan jamas.
     */
    threshold?: number;
  },
): boolean {
  const { trigger, once, enabled, threshold = 0.15 } = opts;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Disabled → always visible (no animation).
    if (!enabled) {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }

    // Non-scroll triggers reveal shortly after mount so the transition plays.
    if (trigger !== "scroll") {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setRevealed(false);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref, trigger, once, enabled, threshold]);

  return revealed;
}
