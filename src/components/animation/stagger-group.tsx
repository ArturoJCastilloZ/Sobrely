"use client";

import { Children, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AnimationTrigger } from "@/lib/animation/types";
import { useReveal } from "@/hooks/use-reveal";

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
  const revealed = useReveal(ref, { trigger, once, enabled: active });

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
