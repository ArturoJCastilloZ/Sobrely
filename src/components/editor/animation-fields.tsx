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
  INTENSITY_SCALE,
  TRIGGER_LABELS,
  clampDuration,
} from "@/lib/animation/tokens";
import { pedirReplayDeAnimacion } from "@/lib/animation/replay";
import { PlayIcon } from "lucide-react";
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

      {/*
        Reproducir. Es lo que hace ajustable el resto: la animacion ya se
        re-reproduce sola al cambiar un ajuste, pero DURA ~300ms y arranca en
        el mismo instante en que pulsas un boton que esta en el panel OPUESTO
        al lienzo, asi que se acaba antes de que muevas la vista. Medido: entre
        Sutil y Llamativa hay 9x de diferencia de recorrido (8px contra 72px) y
        aun asi las tres se percibian iguales.
      */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        onClick={pedirReplayDeAnimacion}
      >
        <PlayIcon className="size-3.5" aria-hidden />
        Reproducir en el lienzo
      </Button>

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
        {/*
          La magnitud, dicha en claro. Las tres etiquetas son adjetivos y no
          dejan ver que la diferencia es de 8 a 72 px; con el numero delante,
          la eleccion se puede razonar sin tener que adivinar.
        */}
        <p className="text-[length:var(--ed-text-mini)] text-muted-foreground">
          Se desliza {INTENSITY_SCALE[intensity].distance} px al aparecer.
        </p>
      </div>

      {/*
        Velocidad como deslizador continuo y no tres botones: `duration` ya es
        un numero en el esquema (0.1-3s), asi que los tres valores fijos eran
        una limitacion de la UI, no del modelo. Pedido por el dev, con el mismo
        patron que el zoom del lienzo.
      */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs" htmlFor="anim-velocidad">
            Velocidad
          </Label>
          <span className="text-[length:var(--ed-text-mini)] text-muted-foreground tabular-nums">
            {duration.toFixed(2)}s
          </span>
        </div>
        <input
          id="anim-velocidad"
          type="range"
          // En milisegundos para que el paso sea entero: con un `step` de 0.05
          // en segundos, el valor acumula error de coma flotante y el numero
          // de al lado acaba mostrando 0.6500000000000001.
          //
          // El rango es EXACTAMENTE el del esquema (0.1-3s) y no uno mas
          // estrecho "razonable": un `<input type=range>` con un `value` fuera
          // de [min,max] lo clava en el extremo SIN avisar, asi que un valor
          // persistido de 2.5s se veria como 2s, la etiqueta diria otra cosa
          // que el pulgar, y el primer roce lo bajaria a 2s sin que nadie lo
          // pidiera. Acotar la UI mas que el modelo es una forma silenciosa de
          // corromper el dato.
          min={100}
          max={3000}
          step={50}
          value={Math.round(duration * 1000)}
          onChange={(e) =>
            onPatch({ duration: clampDuration(Number(e.target.value) / 1000) })
          }
          className="h-1 w-full cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-[length:var(--ed-text-mini)] text-muted-foreground">
          <span>Rapida</span>
          <span>Lenta</span>
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
