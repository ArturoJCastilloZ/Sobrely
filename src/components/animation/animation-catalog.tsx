"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedModule } from "@/components/animation/animated-module";
import { StaggerGroup } from "@/components/animation/stagger-group";
import { TextReveal } from "@/components/animation/text-reveal";
import { DecorationLayer } from "@/components/animation/decoration-layer";
import { defaultAnimation } from "@/lib/animation/schema";
import { CSS_REVEAL_PRESETS, ANIMATION_REGISTRY } from "@/lib/animation/registry";
import type { AnimationPreset } from "@/lib/animation/types";
import { ThemeScope } from "@/components/theme/theme-scope";
import { defaultTheme } from "@/lib/theme/theme";

const REVEALS = [...CSS_REVEAL_PRESETS] as AnimationPreset[];

function Demo({ preset, replayKey }: { preset: AnimationPreset; replayKey: number }) {
  const meta = ANIMATION_REGISTRY[preset];
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{meta.label}</span>
          <Badge variant={meta.cost === "high" ? "destructive" : "secondary"}>
            {meta.cost}
          </Badge>
        </div>
        <div className="overflow-hidden rounded-md border bg-muted/30 p-4">
          <AnimatedModule
            key={replayKey}
            animation={{ ...defaultAnimation(), preset, trigger: "load" }}
          >
            <div className="rounded-md bg-background p-4 text-center text-sm shadow-sm">
              {meta.label}
            </div>
          </AnimatedModule>
        </div>
        <p className="text-xs text-muted-foreground">
          <code>{preset}</code> · {meta.description}
        </p>
      </CardContent>
    </Card>
  );
}

export function AnimationCatalog() {
  const [replay, setReplay] = useState(0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Catálogo base de animaciones (Fase 5.3). Pulsa reproducir para verlas.
      </p>

      {/* Floating replay button: reachable at any scroll position. */}
      <Button
        size="lg"
        onClick={() => setReplay((k) => k + 1)}
        className="fixed bottom-6 right-6 z-50 shadow-lg"
      >
        ▶ Reproducir
      </Button>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Revelados (scroll / entrada)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REVEALS.map((p) => (
            <Demo key={p} preset={p} replayKey={replay} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Texto
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="py-6 text-center text-xl font-semibold">
              <TextReveal key={`tr-${replay}`} text="Texto que asciende palabra a palabra" variant="text-rise" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center text-xl font-semibold">
              <TextReveal key={`mt-${replay}`} text="Texto enmascarado elegante" variant="masked-text" />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Stagger de hijos
        </h2>
        <Card>
          <CardContent className="py-6">
            <StaggerGroup key={`sg-${replay}`} trigger="load" className="flex flex-wrap gap-2">
              {["Ceremonia", "Cóctel", "Cena", "Baile", "Brindis"].map((t) => (
                <span key={t} className="rounded-full border px-3 py-1 text-sm">
                  {t}
                </span>
              ))}
            </StaggerGroup>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Decoraciones (continuas)
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["floating", "sparkle", "ambient-gradient"] as const).map((v) => (
            <Card key={v}>
              <CardContent className="py-2">
                <ThemeScope
                  theme={defaultTheme()}
                  className="relative h-32 overflow-hidden rounded-md border"
                >
                  <DecorationLayer variant={v} count={10} />
                  <div className="absolute inset-0 grid place-items-center text-xs opacity-70">
                    {v}
                  </div>
                </ThemeScope>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
