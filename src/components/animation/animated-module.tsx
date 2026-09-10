"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ResolvedAnimation } from "@/lib/animation/types";
import { EASINGS, INTENSITY_SCALE } from "@/lib/animation/tokens";
import {
  CSS_REVEAL_PRESETS,
  CLIPPING_REVEAL_PRESETS,
} from "@/lib/animation/registry";
import { useReveal } from "@/hooks/use-reveal";
import { RevealDelAncestro } from "@/components/animation/reveal-del-ancestro";

/**
 * Runtime wrapper that applies a resolved animation to its children. Shared by
 * the editor preview and the public page so both render identically.
 *
 * Progressive enhancement: the element is visible by default. The hidden
 * pre-reveal state only applies when scripting is available (gated by
 * `@media (scripting: enabled)` in animations.css), so content is never
 * invisible if scripts cannot run at all.
 */
export function AnimatedModule({
  animation,
  index = 0,
  className,
  children,
}: {
  animation: ResolvedAnimation;
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const isRevealPreset = CSS_REVEAL_PRESETS.has(animation.preset);
  const active =
    animation.enabled && animation.preset !== "none" && isRevealPreset && !reduce;

  // El nodo observado es el MISMO que lleva el estado oculto. Para los presets
  // que ocultan recortando (`clip-path`), ese recorte deja la caja con area
  // cero y el observer no la ve nunca entrar: hay que mirarla con umbral 0.
  const recorta = CLIPPING_REVEAL_PRESETS.has(animation.preset);
  const revealed = useReveal(ref, {
    trigger: animation.trigger,
    once: animation.once,
    enabled: active,
    threshold: recorta ? 0 : 0.15,
  });

  // Not animating → plain, always-visible container. Se publica `true`: sin
  // animacion el contenido esta visible desde el primer momento, y un grupo
  // escalonado dentro no tiene nada que esperar.
  if (!active) {
    return (
      <RevealDelAncestro.Provider value={true}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </RevealDelAncestro.Provider>
    );
  }

  const scale = INTENSITY_SCALE[animation.intensity];
  const style: React.CSSProperties = {
    ["--anim-dur" as string]: `${animation.duration}s`,
    ["--anim-ease" as string]: EASINGS.standard,
    ["--anim-delay" as string]: `${animation.delay + animation.stagger * index}s`,
    ["--anim-dist" as string]: `${scale.distance}px`,
    ["--anim-scale" as string]: `${scale.scale}`,
    ["--anim-blur" as string]: `${scale.blur}px`,
  };

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "anim",
        `anim--${animation.preset}`,
        revealed && "is-revealed",
        className,
      )}
    >
      {/* Lo que arregla U-3: los observadores ANIDADOS no pueden ver nada
          mientras este modulo se oculta recortando su caja, asi que en vez de
          mirar la pantalla heredan este dato. Ver `reveal-del-ancestro.tsx`.

          Se publica SOLO si el preset recorta. Un preset que se oculta con
          opacidad o desplazamiento no tiene el defecto —medido: 0 items
          atascados— y su descendiente puede seguir esperando su propio turno,
          que es lo que hace que la animacion se vea cuando el invitado la
          esta mirando. Heredar SIEMPRE revelaria un grupo que aun esta por
          debajo del pliegue en un modulo alto: cambiaria la conducta de los
          otros diecisiete presets para arreglar dos. */}
      <RevealDelAncestro.Provider value={revealed && recorta}>
        {children}
      </RevealDelAncestro.Provider>
    </div>
  );
}
