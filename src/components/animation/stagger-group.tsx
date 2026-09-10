"use client";

import { Children, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AnimationTrigger } from "@/lib/animation/types";
import { useReveal } from "@/hooks/use-reveal";
import { useRevealDelAncestro } from "@/components/animation/reveal-del-ancestro";

/**
 * Reveals its direct children in sequence (CSS engine). Reusable for lists and
 * galleries (wired to modules in 5.4). Progressive-enhancement safe: children
 * are visible without JS or under reduced motion.
 */
export function StaggerGroup({
  trigger = "scroll",
  once = true,
  step = 0.08,
  enabled = true,
  className,
  children,
}: {
  trigger?: AnimationTrigger;
  once?: boolean;
  step?: number;
  enabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const active = enabled && !reduce;
  const propio = useReveal(ref, { trigger, once, enabled: active });
  // O lo vi yo entrar en pantalla, O el modulo que me contiene ya abrio su
  // cortina. Lo segundo es lo que cierra U-3: dentro de un modulo que se oculta
  // recortando la caja, mi observador no ve NADA —a ningun umbral— y cuando la
  // cortina abre el scroll ya me paso de largo. Ver `reveal-del-ancestro.tsx`.
  const ancestro = useRevealDelAncestro();
  const revealed = propio || ancestro;

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) => (
        <div
          className={cn(
            active && "anim-stagger-item",
            (!active || revealed) && "is-revealed",
          )}
          style={
            active
              ? ({
                  ["--stagger-index" as string]: i,
                  ["--stagger-step" as string]: `${step}s`,
                } as React.CSSProperties)
              : undefined
          }
        >
          {child}
        </div>
      ))}
    </div>
  );
}
