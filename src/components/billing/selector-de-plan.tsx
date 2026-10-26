"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RecomendacionPlan {
  nombre: string;
  precio: string;
  precioRegular: string | null;
  motivos: string[];
  href: string;
}

export interface OpcionSelector {
  id: string;
  etiqueta: string;
}

/**
 * Selector de dos preguntas. Presentacional: el servidor calcula las nueve
 * recomendaciones con `recomendarPlan` (plans.ts) y las pasa ya resueltas, así
 * aquí no hay reglas de precio ni de capacidad que se desincronicen.
 */
export function SelectorDePlan({
  invitados,
  funciones,
  resultados,
}: {
  invitados: OpcionSelector[];
  funciones: OpcionSelector[];
  /** `resultados[idInvitados][idFunciones]` */
  resultados: Record<string, Record<string, RecomendacionPlan>>;
}) {
  const [inv, setInv] = useState(invitados[0].id);
  const [fun, setFun] = useState(funciones[0].id);
  const rec = resultados[inv]?.[fun];

  return (
    <section
      aria-labelledby="selector-titulo"
      className="mx-auto w-full max-w-4xl px-4"
    >
      <div className="grid gap-6 rounded-2xl border bg-card p-5 sm:p-7 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-5">
          <h2
            id="selector-titulo"
            className="font-display text-balance text-2xl font-bold tracking-tight"
          >
            ¿Cuál te conviene?
          </h2>
          <Pregunta
            nombre="invitados"
            titulo="¿Cuántos invitados?"
            opciones={invitados}
            valor={inv}
            alCambiar={setInv}
          />
          <Pregunta
            nombre="funciones"
            titulo="¿Qué quieres incluir?"
            opciones={funciones}
            valor={fun}
            alCambiar={setFun}
          />
        </div>

        {rec && (
          <div
            aria-live="polite"
            className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Te recomendamos
            </p>
            <p className="text-xl font-semibold">{rec.nombre}</p>
            <p className="flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {rec.precio}
              </span>
              {rec.precioRegular && (
                <span className="pb-1 text-sm text-muted-foreground line-through tabular-nums">
                  {rec.precioRegular}
                </span>
              )}
            </p>
            <p className="-mt-2 text-xs text-muted-foreground">
              Pago único por evento
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {rec.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <Button
              render={<Link href={rec.href} />}
              nativeButton={false}
              className="mt-1 h-11 w-full"
            >
              Elegir {rec.nombre}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function Pregunta({
  nombre,
  titulo,
  opciones,
  valor,
  alCambiar,
}: {
  nombre: string;
  titulo: string;
  opciones: OpcionSelector[];
  valor: string;
  alCambiar: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <label
            key={o.id}
            className={cn(
              "flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              valor === o.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name={nombre}
              value={o.id}
              checked={valor === o.id}
              onChange={() => alCambiar(o.id)}
              className="sr-only"
            />
            {o.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
