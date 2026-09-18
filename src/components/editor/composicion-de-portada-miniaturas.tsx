"use client";

import {
  HERO_VARIANTS,
  HERO_VARIANT_LABELS,
  type HeroVariant,
} from "@/lib/modules/types";
import { cn } from "@/lib/utils";

/**
 * El diagrama de cada composicion de portada.
 *
 * Vocabulario, deliberadamente el de cualquier selector de plantilla
 * (Keynote, Figma, Canva): la FOTO es un bloque tintado y el TEXTO son barras,
 * la del titulo mas gruesa que las demas. Se lee sin leyenda, que es el punto
 * entero de sustituir un `<Select>` por esto.
 *
 * Los diagramas se derivan de lo que el renderer HACE, no de lo que suena
 * bien (`previews.tsx`, HERO_*):
 *
 *   centered   foto a sangre, texto centrado encima
 *   offset     foto a sangre, texto abajo y alineado al inicio
 *   split      foto a un lado, texto al otro
 *   editorial  texto arriba, foto abajo
 *   plain      solo tipografia, sin foto
 *
 * Sin `currentColor` no habria tema oscuro: el SVG hereda el color del boton,
 * asi que la miniatura seleccionada se tine sola con el color primario y el
 * resto queda apagado, sin una sola regla de color duplicada.
 */
function Diagrama({ variant }: { variant: HeroVariant }) {
  const foto = "fill-current opacity-15";
  const barra = "fill-current opacity-70";
  return (
    <svg
      viewBox="0 0 64 48"
      className="h-full w-full"
      aria-hidden
      focusable="false"
    >
      {variant === "centered" && (
        <>
          <rect x="0" y="0" width="64" height="48" className={foto} />
          <rect x="18" y="19" width="28" height="4" rx="1" className={barra} />
          <rect x="24" y="27" width="16" height="2" rx="1" className={barra} />
        </>
      )}
      {variant === "offset" && (
        <>
          <rect x="0" y="0" width="64" height="48" className={foto} />
          <rect x="8" y="30" width="26" height="4" rx="1" className={barra} />
          <rect x="8" y="38" width="15" height="2" rx="1" className={barra} />
        </>
      )}
      {variant === "split" && (
        <>
          <rect x="0" y="0" width="30" height="48" className={foto} />
          <rect x="36" y="17" width="22" height="4" rx="1" className={barra} />
          <rect x="36" y="25" width="14" height="2" rx="1" className={barra} />
        </>
      )}
      {variant === "editorial" && (
        <>
          <rect x="14" y="7" width="36" height="4" rx="1" className={barra} />
          <rect x="22" y="15" width="20" height="2" rx="1" className={barra} />
          <rect x="0" y="23" width="64" height="25" className={foto} />
        </>
      )}
      {variant === "plain" && (
        <>
          <rect x="12" y="17" width="40" height="4" rx="1" className={barra} />
          <rect x="20" y="25" width="24" height="2" rx="1" className={barra} />
          <rect x="27" y="32" width="10" height="2" rx="1" className={barra} />
        </>
      )}
    </svg>
  );
}

/**
 * Las cinco composiciones de portada, elegidas VIENDOLAS.
 *
 * Sustituye al `<Select>` que pedia la Fase 4 del plan. Dos motivos medidos, no
 * de gusto:
 *
 * 1. El disparador decia el valor CRUDO del enum —«editorial»— asi que el
 *    control estaba literalmente en ingles, que es la queja textual del plan.
 * 2. Un rotulo como «Foto a un lado, texto al otro» describe un LAYOUT, y un
 *    layout se reconoce antes viendolo que leyendolo. El `<Select>` ademas
 *    esconde cuatro de las cinco opciones hasta que lo abres.
 *
 * ── Por que radios NATIVOS ────────────────────────────────────────────
 *
 * Un grupo de `<button>` habria necesitado `role="radio"`, `aria-checked` y un
 * roving tabindex a mano — justo lo que se acaba de escribir para el lienzo, y
 * ahi hacia falta porque los bloques no son controles de formulario. Aqui si lo
 * son: `<input type="radio">` da la navegacion por flechas, el anuncio de «2 de
 * 5» y el foco visible sin una linea de JavaScript. Se oculta con `sr-only` y
 * el aspecto lo pone `peer-checked:` sobre la etiqueta.
 *
 * El nombre accesible es el rotulo largo de `HERO_VARIANT_LABELS`, que ya
 * describe lo que el usuario obtiene. No se inventan nombres cortos: `types.ts`
 * dice que «Partida» y «Editorial» eran jerga del research y se cambiaron a
 * proposito.
 */
export function ComposicionDePortadaMiniaturas({
  value,
  onChange,
  name,
}: {
  value: HeroVariant;
  onChange: (v: HeroVariant) => void;
  /** Agrupa los radios. Unico por invitacion abierta, que es lo que hay. */
  name: string;
}) {
  return (
    <div className="space-y-1.5">
      {HERO_VARIANTS.map((v) => {
        const id = `${name}-${v}`;
        const activo = value === v;
        return (
          <div key={v} className="flex">
            <input
              type="radio"
              id={id}
              name={name}
              value={v}
              checked={activo}
              onChange={() => onChange(v)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-md border p-2 text-xs transition-colors",
                // El MISMO anillo que el recuadro de seleccion del lienzo. Que
                // «esto esta elegido» se diga igual en las dos superficies del
                // editor no es adorno: es una sola cosa que aprender.
                "peer-checked:border-primary peer-checked:text-primary peer-checked:ring-2 peer-checked:ring-primary",
                // El foco se ve aunque el raton no haya tocado nada: el radio
                // real esta oculto, asi que su anillo tiene que salir aqui.
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                !activo && "text-muted-foreground hover:border-foreground/30",
              )}
            >
              <span className="h-9 w-12 shrink-0 overflow-hidden rounded-sm border bg-muted/40">
                <Diagrama variant={v} />
              </span>
              <span className="leading-tight">{HERO_VARIANT_LABELS[v]}</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
