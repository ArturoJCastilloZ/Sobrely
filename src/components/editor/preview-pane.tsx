"use client";

import { useState } from "react";
import type { EditorModule } from "@/lib/invitations/editor-types";
import type { ThemeConfig } from "@/lib/theme/theme";
import { cn } from "@/lib/utils";
import { ModulePreview } from "@/components/modules/previews";
import { ThemeScope } from "@/components/theme/theme-scope";
import { StickerEditorLayer } from "@/components/editor/sticker-editor-layer";
import { AnimatedModule } from "@/components/animation/animated-module";
import { DecorationLayer } from "@/components/animation/decoration-layer";
import {
  resolveAnimation,
  readModuleAnimationOverride,
} from "@/lib/animation/schema";

export function PreviewPane({
  modules,
  theme,
  eventDate = "",
  onStickersChange,
}: {
  modules: EditorModule[];
  theme: ThemeConfig;
  eventDate?: string;
  /** When provided, the preview shows an editable (draggable) sticker layer. */
  onStickersChange?: (stickers: ThemeConfig["stickers"]) => void;
}) {
  const visible = modules.filter((m) => m.is_visible);
  const [view, setView] = useState<"mobile" | "desktop">("mobile");
  const desktop = view === "desktop";

  // Re-play the entrance animation in the preview when any animation setting
  // changes — the global config (intensity/speed/preset/on-off) OR a per-module
  // override. Keying the module list by this remounts it, so the "load" reveal
  // runs again; otherwise nothing replays once modules have appeared. Non-anim
  // edits (colors, module text) don't change this key, so they don't replay.
  const replayKey = [
    JSON.stringify(theme.animation),
    String(theme.animations),
    ...visible.map((m) =>
      JSON.stringify(readModuleAnimationOverride(m.config) ?? null),
    ),
  ].join("|");

  return (
    <div>
      <div className="mb-2 flex justify-center gap-1">
        {(
          [
            ["mobile", "📱 Móvil"],
            ["desktop", "🖥 Escritorio"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              view === v
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          "mx-auto overflow-hidden rounded-2xl border shadow-sm",
          desktop ? "w-full" : "w-full max-w-[420px]",
        )}
      >
        <ThemeScope
          theme={theme}
          className={cn("relative overflow-hidden", desktop && "@container/inv")}
        >
        {theme.animations && theme.decoration.enabled && (
          <DecorationLayer
            variant={theme.decoration.variant}
            symbol={theme.decoration.symbol}
            count={12}
          />
        )}
        {visible.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center p-8 text-center text-sm opacity-70">
            Agrega módulos para ver la vista previa.
          </div>
        ) : (
          <div key={replayKey} className="relative z-10">
            {visible.map((m, i) => {
              const resolved = resolveAnimation(
                theme.animation,
                readModuleAnimationOverride(m.config),
                theme.animations,
              );
              // In the constrained preview panel, scroll-triggered modules
              // below the fold never enter the real viewport (they'd stay
              // hidden). Reveal on mount instead so content is always visible.
              const animation = { ...resolved, trigger: "load" as const };
              return (
                <AnimatedModule key={m.id} animation={animation} index={i}>
                  <ModulePreview
                    moduleType={m.module_type}
                    config={m.config}
                    animate={animation.enabled}
                    eventDate={eventDate}
                    editorHint
                  />
                </AnimatedModule>
              );
            })}
          </div>
        )}
        {onStickersChange && (
          <StickerEditorLayer
            stickers={theme.stickers}
            onChange={onStickersChange}
          />
        )}
      </ThemeScope>
      </div>
    </div>
  );
}
