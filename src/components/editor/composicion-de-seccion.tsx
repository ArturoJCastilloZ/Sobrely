"use client";

import {
  SECTION_ALIGNS,
  SECTION_ALIGN_LABELS,
  SECTION_BLEEDS,
  SECTION_BLEED_LABELS,
  SECTION_FRAMES,
  SECTION_FRAME_LABELS,
} from "@/lib/modules/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Las perillas de composición de una sección, expuestas como PRESETS.
 *
 * `align`, `bleed` y `frame` existían en el esquema y en el renderer desde la
 * Fase 11 (P1 y P5) y **el editor no exponía ninguna** — medido el 2026-09-08.
 * O sea que el usuario no podía dar a su invitación ninguna de las
 * composiciones del catálogo: sólo las tenía si creaba la invitación desde una
 * plantilla que ya las trajera.
 *
 * Se exponen ACOTADAS y no como lienzo libre a propósito: 3 x 2 x 4 = 24
 * combinaciones por sección, todas dentro de lo que la Fase 11 ya validó. Un
 * lienzo libre daría infinitas, la mayoría feas, y las feas acabarían en
 * soporte y en las capturas del catálogo. Ver `sobrely-canvas-poc.md` §4-bis.
 *
 * No lleva gate de plan: cambia la DISPOSICIÓN de contenido que el usuario ya
 * tiene, no añade una superficie nueva donde meter arte propio — que es lo que
 * `custom_art` cobra.
 */
export function ComposicionDeSeccion({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const val = (k: string, def: string) =>
    typeof config[k] === "string" && config[k] ? (config[k] as string) : def;

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">
        Composición de la sección
      </p>

      <div className="space-y-1.5">
        <Label>Alineación</Label>
        <Select
          value={val("align", "center")}
          onValueChange={(v) => onChange({ align: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_ALIGNS.map((a) => (
              <SelectItem key={a} value={a}>
                {SECTION_ALIGN_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Marco</Label>
        <Select
          value={val("frame", "none")}
          onValueChange={(v) => onChange({ frame: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_FRAMES.map((f) => (
              <SelectItem key={f} value={f}>
                {SECTION_FRAME_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Márgenes</Label>
        <Select
          value={val("bleed", "contained")}
          onValueChange={(v) => onChange({ bleed: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_BLEEDS.map((b) => (
              <SelectItem key={b} value={b}>
                {SECTION_BLEED_LABELS[b]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
