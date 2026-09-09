"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SmartphoneIcon, MonitorIcon, ChevronLeftIcon, ChevronRightIcon,
  MinusIcon, PlusIcon, ScanIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODULE_META } from "@/lib/modules/types";
import type { EditorModule } from "@/lib/invitations/editor-types";
import type { ThemeConfig } from "@/lib/theme/theme";
import { cn } from "@/lib/utils";
import { ModulePreview } from "@/components/modules/registry";
import { ThemeScope } from "@/components/theme/theme-scope";
import { StickerEditorLayer } from "@/components/editor/sticker-editor-layer";
import { MovimientoLibreLayer } from "@/components/editor/movimiento-libre-layer";
import type { Desplazamiento } from "@/lib/modules/types";
import { AnimatedModule } from "@/components/animation/animated-module";
import { DecorationLayer } from "@/components/animation/decoration-layer";
import {
  resolveAnimation,
  readModuleAnimationOverride,
} from "@/lib/animation/schema";
import { useReplayDeAnimacion } from "@/lib/animation/replay";

export function PreviewPane({
  modules,
  theme,
  eventDate = "",
  onStickersChange,
  onOffset,
}: {
  modules: EditorModule[];
  theme: ThemeConfig;
  eventDate?: string;
  /** When provided, the preview shows an editable (draggable) sticker layer. */
  onStickersChange?: (stickers: ThemeConfig["stickers"]) => void;
  /** Arrastre del texto: `(moduloId, bloque, desplazamiento)`. */
  onOffset?: (moduloId: string, bloque: string, d: Desplazamiento) => void;
}) {
  const visible = modules.filter((m) => m.is_visible);
  const [view, setView] = useState<"mobile" | "desktop">("mobile");
  const desktop = view === "desktop";

  /*
   * Zoom del lienzo.
   *
   * Se escala con `transform: scale`, NO con la propiedad `zoom`, y la
   * decisión la tomó la medición. Comparadas las dos en una sonda cruda con un
   * container query dentro, al 50 %:
   *
   *   | técnica     | breakpoint del CQ | telón sticky | alto del layout |
   *   |-------------|-------------------|--------------|-----------------|
   *   | sin zoom    | estrecho          | se pega      | 811             |
   *   | `transform` | estrecho ✅       | NO se pega   | 811 (no baja)   |
   *   | `zoom`      | ANCHO ❌          | se pega      | 434 (baja)      |
   *
   * `zoom` sale más barato —conserva el sticky y el layout solo— pero cambia
   * el ANCHO DE LAYOUT (298 → 598), así que al 50 % la invitación se cree de
   * escritorio y salta de breakpoint. Eso haría que el preview MIENTA sobre el
   * responsive, que es exactamente donde este producto le gana a Invitio y su
   * lienzo fijo de 400×900. Se paga el precio de `transform` a cambio de que
   * lo que se ve sea de verdad lo que verá el invitado.
   *
   * El precio se paga en las dos líneas siguientes: `transform` no reduce el
   * alto que ocupa el elemento, así que la envoltura reserva el alto ESCALADO
   * a mano; si no, al alejar quedaría un hueco muerto debajo y al acercar el
   * contenido se montaría sobre el paginador.
   */
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 1.5;
  const [zoom, setZoom] = useState(1);
  const marco = useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState({ ancho: 0, alto: 0 });

  // Las medidas SIN escalar del marco. Se observan en vez de leerlas una vez
  // porque cambian con cada edición (un módulo nuevo, un texto más largo) y
  // una lectura única dejaría la reserva desfasada.
  useEffect(() => {
    const el = marco.current;
    if (!el) return;
    const leer = () =>
      // `offsetWidth/Height` son las medidas de LAYOUT, que `transform` no
      // altera — son justo los números para calcular la reserva.
      setNatural({ ancho: el.offsetWidth, alto: el.offsetHeight });
    const obs = new ResizeObserver(leer);
    obs.observe(el);
    leer();
    return () => obs.disconnect();
  }, []);

  const pctZoom = Math.round(zoom * 100);
  const ajustaZoom = (z: number) =>
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100)));

  /**
   * "Ajustar al ancho": el zoom que hace que el marco quepe justo en su
   * columna. Se mide la columna (el padre de la envoltura), no el viewport:
   * el canvas del editor es un panel, no la pantalla.
   */
  function ajustarAlAncho() {
    const el = marco.current;
    // `closest` con una marca explícita, y NO `parentElement.parentElement`:
    // contar padres es un acoplamiento posicional que se rompe en silencio en
    // cuanto alguien envuelve el marco en otro div — me pasó al añadir la
    // envoltura de reserva, y el cálculo habría salido contra el nodo
    // equivocado sin fallar.
    const columna = el?.closest<HTMLElement>("[data-columna-canvas]");
    if (!el || !columna) return;
    const disponible = columna.clientWidth;
    if (!disponible || !natural.ancho) return;
    ajustaZoom(disponible / natural.ancho);
  }

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
  // Peticiones explicitas de replay desde los paneles de animacion. Entra en
  // la clave de remonte: cambiarla es lo que hace que la animacion arranque
  // desde su estado oculto otra vez.
  const replayPedido = useReplayDeAnimacion();

  const replayKey = [
    String(replayPedido),
    JSON.stringify(theme.animation),
    String(theme.animations),
    ...visible.map((m) =>
      JSON.stringify(readModuleAnimationOverride(m.config) ?? null),
    ),
  ].join("|");

  return (
    // La marca va AQUI y no en la envoltura de reserva: el `clientWidth` de la
    // envoltura es el ancho ya ESCALADO, asi que "ajustar al ancho" se
    // calcularia contra su propio resultado. Esta raiz mide el espacio
    // DISPONIBLE, que es el dato que hace falta.
    <div data-columna-canvas>
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
      {/*
        Envoltura que RESERVA el alto escalado. `transform` no cambia el alto
        que el elemento ocupa en el layout, así que sin esto: al alejar queda
        un hueco muerto debajo del marco, y al acercar el marco se derrama
        sobre el paginador. Con `zoom: 1` no se toca nada (`height: undefined`)
        para no meter un número donde el flujo normal ya acierta.
      */}
      <div
        className="mx-auto"
        style={
          zoom === 1 || !natural.alto
            ? undefined
            : {
                // Se reserva el ancho ADEMÁS del alto. Sin el ancho, el
                // desborde del marco escalado no entra en el `scrollWidth` de
                // la columna: medido en Escritorio al 150 %, el marco de
                // 1200px sobresalía 184px por CADA lado de un panel de 832 y
                // se dibujaba debajo del riel de secciones.
                width: Math.round(natural.ancho * zoom),
                height: Math.round(natural.alto * zoom),
              }
        }
      >
      <div
        ref={marco}
        className={cn(
          // `overflow-clip` y no `overflow-hidden`: recorta igual para el
          // borde redondeado, pero no se vuelve contenedor de scroll — si lo
          // fuera, el telón sticky del ThemeScope de abajo quedaría anclado a
          // este marco, que nunca scrollea, y no se quedaría quieto.
          "mx-auto overflow-clip rounded-2xl border shadow-sm",
          desktop ? "w-full" : "w-full max-w-[420px]",
        )}
        style={
          zoom === 1
            ? undefined
            : {
                // El ancho se fija al natural medido: si se dejara `w-full`,
                // dependería de la envoltura, que a su vez depende del zoom.
                width: natural.ancho || undefined,
                transform: `scale(${zoom})`,
                // `top left` y no `top center`. Con el origen centrado, al
                // acercar el desborde se reparte a los dos lados y el
                // IZQUIERDO queda inalcanzable: no se puede scrollear a
                // negativo. Desde la esquina, todo el desborde va a la derecha
                // y abajo, que es donde el scroll sí llega. El centrado lo
                // sigue haciendo la envoltura con `mx-auto`.
                transformOrigin: "top left",
              }
        }
      >
        <ThemeScope
          theme={theme}
          className={cn("relative", desktop && "@container/inv")}
          // Con el zoom fuera del 100% el telon sticky DERIVA, porque el
          // `transform` del marco escala su desplazamiento: medido, al 150%
          // se movia 282px a lo largo de 663px de scroll. Anclado arriba es
          // predecible; derivando parece un fallo.
          backdropSticky={zoom === 1}
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
        {/* Sólo se monta si ALGÚN módulo visible tiene el movimiento libre
            encendido: una capa a pantalla completa que capture punteros sin
            hacer nada se comería los clics del resto del editor. */}
        {onOffset && visible.some((m) => Boolean(m.config?.freeMove)) && (
          <MovimientoLibreLayer onOffset={onOffset} />
        )}
      </ThemeScope>
      </div>
      </div>

      {/*
        Reserva del alto del paginador. Sin esto la barra se monta ENCIMA del
        ultimo contenido —el dev lo vio tapando el boton "Confirmar"—: `sticky`
        no ocupa espacio propio, flota sobre lo que hay debajo.
      */}
      {visible.length > 0 && <div aria-hidden className="h-14" />}

      {/*
        La barra aparece con UN solo modulo, no con dos: el zoom sirve igual
        con una sola seccion. Lo que se condiciona a `> 1` son las flechas y el
        contador, que sin secciones que recorrer no tienen sentido.
      */}
      {visible.length > 0 && (
        // `z-40` NO es decorativo: sin z-index la barra queda en `auto` y
        // pierde contra DOS capas del preview, porque el `-mt-11` la mete
        // fisicamente dentro del marco de la invitacion. Medido en el editor
        // real: en el centro del paginador ganaba la capa de stickers
        // (`absolute inset-0 z-30` de `sticker-editor-layer`), y el contenido
        // de la invitacion (`relative z-10`) tambien quedaba por encima.
        //
        // Y no era solo visual: `elementFromPoint` sobre la flecha devolvia la
        // capa de stickers, o sea que **los botones no recibian el clic**.
        // Con `z-40` el hit-test devuelve el boton. La escalera queda:
        // contenido 10 < stickers 30 < paginador 40 < modal de plan 50, que es
        // el orden que se quiere (un modal SI debe tapar el paginador).
        <div className="pointer-events-none sticky bottom-3 -mt-11 z-40 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border bg-background/95 px-1.5 py-1 shadow-(--ed-shadow-menu) backdrop-blur">
            {/*
              Controles de zoom. El reparto es el que se midió en el editor de
              Invitio (menos / deslizador / más / % / ajustar al ancho), que es
              el patrón que la gente ya reconoce de Figma y Canva.
            */}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Alejar"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => ajustaZoom(zoom - 0.1)}
            >
              <MinusIcon />
            </Button>
            <input
              type="range"
              aria-label="Zoom"
              min={ZOOM_MIN * 100}
              max={ZOOM_MAX * 100}
              step={5}
              value={pctZoom}
              onChange={(e) => ajustaZoom(Number(e.target.value) / 100)}
              className="h-1 w-20 cursor-pointer accent-primary"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Acercar"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => ajustaZoom(zoom + 0.1)}
            >
              <PlusIcon />
            </Button>
            {/*
              `tabular-nums` y ancho fijo: sin eso la barra entera se mueve
              cada vez que el numero cambia de 100 a 90, y el deslizador se
              desplaza bajo el cursor mientras se arrastra.
            */}
            <button
              type="button"
              onClick={() => setZoom(1)}
              aria-label={`Zoom al ${pctZoom} por ciento. Restablecer al 100 por ciento`}
              className="w-11 shrink-0 rounded px-1 text-center text-[length:var(--ed-text-mini)] text-muted-foreground tabular-nums hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {pctZoom}%
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ajustar al ancho"
              onClick={ajustarAlAncho}
            >
              <ScanIcon />
            </Button>
            {visible.length > 1 && (
              <>
            <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
