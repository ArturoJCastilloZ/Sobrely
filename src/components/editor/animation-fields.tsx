"use client";

import { useState } from "react";
import {
  ANIMATION_INTENSITIES,
  type AnimationConfig,
  type AnimationIntensity,
  type AnimationPreset,
} from "@/lib/animation/types";
import {
  INTENSITY_LABELS,
  SPEED_OPTIONS,
  TRIGGER_LABELS,
} from "@/lib/animation/tokens";
import {
  ANIMATION_REGISTRY,
  CSS_REVEAL_PRESETS,
  isImplemented,
} from "@/lib/animation/registry";

/** Transiciones de entrada disponibles (presets del motor CSS, implementados). */
const TRANSITIONS: { key: AnimationPreset; label: string }[] = [
  ...CSS_REVEAL_PRESETS,
]
  .filter(isImplemented)
  .map((p) => ({ key: p, label: ANIMATION_REGISTRY[p].label }));
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Granular animation controls shared by the global panel (theme.animation) and
 * the per-module override. Works on a partial config so per-module overrides
 * can leave fields inherited.
 */
export function AnimationFields({
  value,
  onPatch,
  defaults,
  showTransition = false,
}: {
  value: Partial<AnimationConfig>;
  onPatch: (patch: Partial<AnimationConfig>) => void;
  defaults: Pick<
    AnimationConfig,
    "preset" | "intensity" | "duration" | "trigger" | "delay" | "stagger"
  >;
  /** Show the transition (preset) selector. Off in the per-module panel, which
   *  already has its own "Animación de entrada" preset picker. */
  showTransition?: boolean;
}) {
  const [advanced, setAdvanced] = useState(false);

  const preset = (value.preset ?? defaults.preset) as AnimationPreset;
  const intensity = (value.intensity ?? defaults.intensity) as AnimationIntensity;
  const duration = value.duration ?? defaults.duration;
  const trigger = value.trigger ?? defaults.trigger;
  const delay = value.delay ?? defaults.delay;
  const staggerOn = (value.stagger ?? defaults.stagger) > 0;

  const activeSpeed =
    SPEED_OPTIONS.reduce((best, opt) =>
      Math.abs(opt.duration - duration) < Math.abs(best.duration - duration)
        ? opt
        : best,
    ).key;

  return (
    <div className="space-y-3">
      {/* Transition (reveal preset) — global panel only */}
      {showTransition && (
      <div className="space-y-1.5">
        <Label className="text-xs">Transición</Label>
        <Select
          value={preset}
          onValueChange={(v) => onPatch({ preset: v as AnimationPreset })}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: string) =>
                ANIMATION_REGISTRY[v as AnimationPreset]?.label ?? "Transición"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TRANSITIONS.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      )}

      {/* Intensity */}
      <div className="space-y-1.5">
        <Label className="text-xs">Intensidad</Label>
        <div className="grid grid-cols-3 gap-1">
          {ANIMATION_INTENSITIES.map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={intensity === k ? "default" : "outline"}
              onClick={() => onPatch({ intensity: k })}
            >
              {INTENSITY_LABELS[k]}
            </Button>
          ))}
        </div>
      </div>

      {/* Speed */}
      <div className="space-y-1.5">
        <Label className="text-xs">Velocidad</Label>
        <div className="grid grid-cols-3 gap-1">
          {SPEED_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              type="button"
              size="sm"
              variant={activeSpeed === opt.key ? "default" : "outline"}
              onClick={() => onPatch({ duration: opt.duration })}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvanced((a) => !a)}
        className="text-xs text-muted-foreground underline underline-offset-2"
      >
        {advanced ? "Ocultar avanzado" : "Opciones avanzadas"}
      </button>

      {advanced && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Activación</Label>
            <Select
              value={trigger}
              onValueChange={(v) => onPatch({ trigger: v as AnimationConfig["trigger"] })}
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string) => TRIGGER_LABELS[v] ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {["scroll", "load"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRIGGER_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Retraso (segundos)</Label>
            <Input
              type="number"
              min={0}
              max={3}
              step={0.1}
              value={delay}
              onChange={(e) =>
                onPatch({
                  delay: Math.min(3, Math.max(0, Number(e.target.value) || 0)),
                })
              }
              className="w-24"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="cursor-pointer text-xs">
              Escalonar hijos (listas/galería)
            </Label>
            <Switch
              checked={staggerOn}
              onCheckedChange={(v) => onPatch({ stagger: v ? 0.08 : 0 })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
