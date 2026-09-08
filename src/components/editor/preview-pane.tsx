"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SmartphoneIcon, MonitorIcon, ChevronLeftIcon, ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODULE_META } from "@/lib/modules/types";
import type { EditorModule } from "@/lib/invitations/editor-types";
import type { ThemeConfig } from "@/lib/theme/theme";
import { cn } from "@/lib/utils";
import { ModulePreview } from "@/components/modules/registry";
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

  /*
   * Paginador de secciones.
   *
   * Invitio hace lo mismo ("Sección 1 de 3") pero al precio de fijar secciones
   * de 900px de alto — su propia página de precios lo dice— y renunciar al
   * responsive. Aquí es solo NAVEGACIÓN: mueve el scroll a la sección, no
   * cambia el modelo. La invitación sigue siendo un scroll continuo y sigue
   * adaptándose, que es donde este producto gana.
   */
  // Se busca en el DOM por `data-modulo` en vez de mantener un arreglo de refs.
  //
  // Con refs, `ref={registrar(i)}` devuelve una funcion nueva en cada render,
  // asi que React desengancha y vuelve a enganchar constantemente; medido, el
  // arreglo quedaba vacio cuando se pulsaba el paginador y `scrollIntoView` no
  // se llamaba sobre nada — la etiqueta avanzaba y la pantalla no se movia. El
  // DOM ya tiene la verdad; preguntarle no puede quedar obsoleto.
  const canvas = useRef<HTMLDivElement | null>(null);
  const [actual, setActual] = useState(0);

  const leerAnclas = useCallback(
    () =>
      Array.from(
        canvas.current?.querySelectorAll<HTMLElement>("[data-modulo]") ?? [],
      ),
    [],
  );

  // Extraida para que el linter pueda comprobar la dependencia.
  const clavesVisibles = visible.map((m) => m.id).join(",");

  useEffect(() => {
    const nodos = leerAnclas();
    if (nodos.length === 0) return;

    // Se elige la sección MÁS visible, no la primera que toque el borde: con
    // secciones cortas hay varias en pantalla a la vez y "la que cruza" daría
    // un contador que salta.
    const obs = new IntersectionObserver(
      (entradas) => {
        let mejor = -1;
        let ratio = 0;
        for (const e of entradas) {
          if (e.intersectionRatio > ratio) {
            ratio = e.intersectionRatio;
            mejor = nodos.indexOf(e.target as HTMLElement);
          }
        }
        if (mejor >= 0) setActual(mejor);
      },
      { threshold: [0.1, 0.25, 0.5, 0.75, 1] },
    );
    nodos.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
    // Se rearma cuando cambia la lista visible: si no, observaría nodos muertos.
  }, [clavesVisibles, leerAnclas]);

  function irA(i: number) {
    const nodos = leerAnclas();
    const n = Math.max(0, Math.min(i, nodos.length - 1));
    const destino = nodos[n];
    if (!destino) return; // sin ancla no se finge que navego

    // El desplazamiento suave lo hace la plataforma. Llegue a escribir una
    // animacion propia creyendo que `smooth` estaba roto —lo medi y no movia
    // nada— hasta darme cuenta de que el panel del navegador estaba OCULTO y
    // ahi `requestAnimationFrame` se pausa: fallaba todo lo que pasa por rAF
    // (el `smooth` nativo y mi animacion por igual) y funcionaba todo lo
    // sincrono. Era el entorno de medicion, no el codigo.
    destino.scrollIntoView({ behavior: "smooth", block: "start" });
    setActual(n);
  }

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
            ["mobile", "Móvil", SmartphoneIcon],
            ["desktop", "Escritorio", MonitorIcon],
          ] as const
        ).map(([v, label, Icon]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-(--ed-fast)",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              view === v
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
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
          imageUrl={theme.decoration.imageUrl}
            count={12}
          />
        )}
        {visible.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center p-8 text-center text-sm opacity-70">
            Agrega módulos para ver la vista previa.
          </div>
        ) : (
          <div key={replayKey} ref={canvas} className="relative z-10">
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
                <div key={m.id} data-modulo={m.id}>
                  <AnimatedModule animation={animation} index={i}>
                    <ModulePreview
                      moduleType={m.module_type}
                      config={m.config}
                      animate={animation.enabled}
                      eventDate={eventDate}
                      editorHint
                    />
                  </AnimatedModule>
                </div>
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

      {/*
        Reserva del alto del paginador. Sin esto la barra se monta ENCIMA del
        ultimo contenido —el dev lo vio tapando el boton "Confirmar"—: `sticky`
        no ocupa espacio propio, flota sobre lo que hay debajo.
      */}
      {visible.length > 1 && <div aria-hidden className="h-14" />}

      {visible.length > 1 && (
        <div className="pointer-events-none sticky bottom-3 -mt-11 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border bg-background/95 px-1.5 py-1 shadow-(--ed-shadow-menu) backdrop-blur">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sección anterior"
              disabled={actual === 0}
              onClick={() => irA(actual - 1)}
            >
              <ChevronLeftIcon />
            </Button>
            <span
              className="min-w-36 px-1 text-center text-[length:var(--ed-text-mini)] text-muted-foreground"
              aria-live="polite"
            >
              {MODULE_META[visible[actual]?.module_type ?? visible[0].module_type].label}
              {" · "}
              {actual + 1} de {visible.length}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sección siguiente"
              disabled={actual >= visible.length - 1}
              onClick={() => irA(actual + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
