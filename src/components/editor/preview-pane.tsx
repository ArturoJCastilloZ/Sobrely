"use client";

import type { EditorModule } from "@/lib/invitations/editor-types";
import type { ThemeConfig } from "@/lib/theme/theme";
import { ModulePreview } from "@/components/modules/previews";
import { ThemeScope } from "@/components/theme/theme-scope";
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
}: {
  modules: EditorModule[];
  theme: ThemeConfig;
  eventDate?: string;
}) {
  const visible = modules.filter((m) => m.is_visible);

  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border shadow-sm">
      <ThemeScope theme={theme} className="relative overflow-hidden">
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
          <div className="relative z-10">
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
      </ThemeScope>
    </div>
  );
}
