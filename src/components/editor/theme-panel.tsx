"use client";

import { useState } from "react";
import {
  FONT_KEYS,
  FONT_LABELS,
  SPACING_KEYS,
  SPACING_LABELS,
  DECORATION_VARIANTS,
  DECORATION_LABELS,
  MODE_PRESETS,
  type DecorationVariantKey,
  type FontKey,
  type SpacingKey,
  type ThemeConfig,
} from "@/lib/theme/theme";
import {
  STYLE_PRESETS,
  STYLE_PRESET_LIST,
  applyStylePreset,
  type StylePresetKey,
} from "@/lib/animation/style-presets";
import { applyThemePack } from "@/lib/theme/theme-packs";
import { ThemePackPicker } from "./theme-pack-picker";
import { SYSTEM_DEFAULT_ANIMATION } from "@/lib/animation/schema";
import { AnimationFields } from "@/components/editor/animation-fields";
import { cn } from "@/lib/utils";
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

type ColorKey = keyof ThemeConfig["colors"];

const COLOR_FIELDS: { key: ColorKey; label: string }[] = [
  { key: "primary", label: "Primario" },
  { key: "secondary", label: "Secundario" },
  { key: "background", label: "Fondo" },
  { key: "text", label: "Texto" },
];

/** Common decoration symbols offered in the picker. */
const SYMBOL_OPTIONS = [
  "❀", "🌸", "🌷", "💮", "✿", "🍃",
  "⭐", "✦", "💖", "🎈", "🎉", "🕊️",
];

function SymbolPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (symbol: string) => void;
}) {
  const [custom, setCustom] = useState("");
  return (
    <div className="space-y-2">
      <Label className="text-xs">Símbolo</Label>
      <div className="flex flex-wrap gap-1.5">
        {SYMBOL_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border text-base",
              value === s ? "border-primary bg-primary/10" : "hover:bg-muted",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          maxLength={2}
          placeholder="Otro…"
          onChange={(e) => setCustom(e.target.value)}
          className="w-20"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!custom.trim()}
          onClick={() => {
            onChange(custom.trim());
            setCustom("");
          }}
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}

export function ThemePanel({
  theme,
  onChange,
  warnings = [],
  onApplyAnimationToAll,
}: {
  theme: ThemeConfig;
  onChange: (patch: Partial<ThemeConfig>) => void;
  warnings?: string[];
  onApplyAnimationToAll?: () => void;
}) {
  function setColor(key: ColorKey, value: string) {
    onChange({ colors: { ...theme.colors, [key]: value } });
  }

  function setMode(mode: "light" | "dark") {
    // Switching mode presets a legible surface (fondo/texto); accents stay.
    onChange({ mode, colors: { ...theme.colors, ...MODE_PRESETS[mode] } });
  }

  function applyStyle(key: StylePresetKey) {
    const next = applyStylePreset(theme, key);
    onChange({
      stylePreset: key,
      animation: next.animation,
      decoration: next.decoration,
    });
  }

  function applyPack(key: string) {
    const next = applyThemePack(theme, key);
    // Patch con solo los campos que la temática impone (updateTheme mergea).
    onChange({
      colors: next.colors,
      font: next.font,
      spacing: next.spacing,
      stylePreset: next.stylePreset,
      animation: next.animation,
      decoration: next.decoration,
      themePack: next.themePack,
    });
  }

  const styleValue = (theme.stylePreset ?? "") as string;

  return (
    <div className="space-y-4">
      {/* Theme packs (temáticas de 1 clic) */}
      <ThemePackPicker value={theme.themePack} onSelect={applyPack} />

      {/* Style presets */}
      <div className="space-y-1.5">
        <Label>Estilo de animación</Label>
        <Select
          value={styleValue}
          onValueChange={(v) => applyStyle(v as StylePresetKey)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Aplicar un estilo…">
              {(v: string) =>
                STYLE_PRESETS[v as StylePresetKey]?.label ?? "Aplicar un estilo…"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-[18rem]">
            {STYLE_PRESET_LIST.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                <span className="flex flex-col items-start">
                  <span className="font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Aplica una combinación completa; luego puedes ajustar cada módulo.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-1 rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          {warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Mode (light/dark surface) */}
      <div className="space-y-1.5">
        <Label>Modo</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md border p-2 text-sm transition-colors",
                theme.mode === m
                  ? "border-primary bg-primary/10 font-medium"
                  : "hover:bg-muted",
              )}
            >
              {m === "light" ? "☀️ Claro" : "🌙 Oscuro"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Ajusta fondo y texto para una superficie clara u oscura; los acentos se
          conservan.
        </p>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <Label>Colores</Label>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 rounded-md border p-2">
              <input
                type="color"
                aria-label={label}
                value={theme.colors[key]}
                onChange={(e) => setColor(key, e.target.value)}
                className="h-8 w-8 cursor-pointer rounded"
              />
              <div className="min-w-0">
                <div className="text-xs font-medium">{label}</div>
                <Input
                  value={theme.colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="h-6 px-1 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-1.5">
        <Label>Tipografía</Label>
        <Select value={theme.font} onValueChange={(v) => onChange({ font: v as FontKey })}>
          <SelectTrigger>
            <SelectValue>{(v: string) => FONT_LABELS[v as FontKey] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FONT_KEYS.map((f) => (
              <SelectItem key={f} value={f}>
                {FONT_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Spacing */}
      <div className="space-y-1.5">
        <Label>Espaciado</Label>
        <Select value={theme.spacing} onValueChange={(v) => onChange({ spacing: v as SpacingKey })}>
          <SelectTrigger>
            <SelectValue>{(v: string) => SPACING_LABELS[v as SpacingKey] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SPACING_KEYS.map((s) => (
              <SelectItem key={s} value={s}>
                {SPACING_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Master animations switch + global animation settings */}
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Animaciones</Label>
          <Switch
            checked={theme.animations}
            onCheckedChange={(v) => onChange({ animations: v })}
          />
        </div>

        {theme.animations && (
          <>
            <AnimationFields
              value={theme.animation}
              onPatch={(patch) =>
                onChange({ animation: { ...theme.animation, ...patch } })
              }
              defaults={theme.animation}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {onApplyAnimationToAll && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onApplyAnimationToAll}
                >
                  Aplicar a todos los módulos
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({
                    animation: SYSTEM_DEFAULT_ANIMATION,
                    stylePreset: undefined,
                  })
                }
              >
                Restaurar animaciones
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Decoration */}
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Decoración ambiental</Label>
          <Switch
            checked={theme.decoration.enabled}
            onCheckedChange={(v) =>
              onChange({ decoration: { ...theme.decoration, enabled: v } })
            }
          />
        </div>
        {theme.decoration.enabled && (
          <>
            <Select
              value={theme.decoration.variant}
              onValueChange={(v) =>
                onChange({
                  decoration: { ...theme.decoration, variant: v as DecorationVariantKey },
                })
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string) => DECORATION_LABELS[v as DecorationVariantKey] ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DECORATION_VARIANTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DECORATION_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {theme.decoration.variant === "floating" && (
              <SymbolPicker
                value={theme.decoration.symbol}
                onChange={(symbol) =>
                  onChange({ decoration: { ...theme.decoration, symbol } })
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
