"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ResolvedAnimation } from "@/lib/animation/types";
import { EASINGS, INTENSITY_SCALE } from "@/lib/animation/tokens";
import { CSS_REVEAL_PRESETS } from "@/lib/animation/registry";
import { useReveal } from "@/hooks/use-reveal";

/**
 * Runtime wrapper that applies a resolved animation to its children. Shared by
 * the editor preview and the public page so both render identically.
 *
 * Progressive enhancement: the element is visible by default. The hidden
 * pre-reveal state only applies when JS is present (gated by
 * `html[data-motion-ready]` in animations.css), so content is never invisible
 * if scripts fail to load.
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

  const revealed = useReveal(ref, {
    trigger: animation.trigger,
    once: animation.once,
    enabled: active,
  });

  // Not animating → plain, always-visible container.
  if (!active) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
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
      {children}
    </div>
  );
}
