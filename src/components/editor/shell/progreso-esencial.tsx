"use client";

import { useMemo, useState } from "react";
import { CheckIcon, CircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDocumento } from "@/lib/editor/contexto-documento";
import { useSeleccion } from "@/lib/editor/contexto-seleccion";
import { progresoEsencial, type ClaveProgreso } from "@/lib/analytics/borrador-completo";
import { cn } from "@/lib/utils";

/**
 * Lista de progreso (T13): lo esencial de la invitación —nombres, fecha, lugar y foto—,
 * siempre a la vista bajo la barra superior. Responde a «¿qué me falta?», que hoy solo se
 * contestaba al pulsar Publicar. Usa el mismo criterio que el evento `complete_draft`
 * (`progresoEsencial`).
 *
 * Es INFORMATIVA: no deshabilita ni condiciona «Publicar». Una invitación puede prescindir de
 * cualquiera de estos puntos, y bloquear el botón frustraría a quien ya sabe lo que hace.
 *
 * Se suscribe al documento (cambia con cada edición) y a la selección solo para llevar a la
 * persona a donde se completa cada punto; por eso vive aparte de `EditorLayout`, que no llama
 * a ningún hook de contexto.
 */
export function ProgresoEsencial() {
  const { invitation, modules, tituloDePlantilla } = useDocumento();
  const { seleccionarModulo, irAPanel } = useSeleccion();
  const [abierto, setAbierto] = useState(false);

  const pasos = useMemo(
    () =>
      progresoEsencial({
        fechaDelEvento: invitation.event_date,
        modulos: modules,
        tituloDeLaPlantilla: tituloDePlantilla,
      }),
    [invitation.event_date, modules, tituloDePlantilla],
  );
  const hechos = pasos.filter((p) => p.hecho).length;
  const completo = hechos === pasos.length;
  const falta = pasos.filter((p) => !p.hecho).map((p) => p.etiqueta.toLowerCase());

  function irA(clave: ClaveProgreso) {
    // La lista tapa justo lo que se va a editar: se cierra al ir a completar un punto.
    setAbierto(false);
    if (clave === "fecha") {
      irAPanel("settings");
      return;
    }
    const tipo = clave === "lugar" ? "map" : "hero";
    const modulo = modules.find((m) => m.module_type === tipo && m.is_visible);
    if (modulo) {
      seleccionarModulo(modulo.id);
      irAPanel("module");
    }
  }

  return (
    <div className="shrink-0 border-b bg-muted/30">
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-3 px-3 py-1.5 text-left text-xs focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-9 sm:px-4"
            />
          }
        >
          <span aria-hidden="true" className="flex shrink-0 gap-1">
            {pasos.map((p) => (
              <span
                key={p.clave}
                className={cn(
                  "h-1.5 w-6 rounded-full",
                  p.hecho ? "bg-emerald-600" : "bg-border",
                )}
              />
            ))}
          </span>
          <span className="min-w-0 truncate">
            {completo ? (
              <span className="font-medium">Lo esencial está listo</span>
            ) : (
              <>
                <span className="font-medium">
                  {hechos} de {pasos.length} esenciales
                </span>
                <span className="text-muted-foreground"> · falta: {falta.join(", ")}</span>
              </>
            )}
          </span>
          <span className="ml-auto shrink-0 text-muted-foreground underline underline-offset-4">
            Ver lista
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 max-w-[calc(100vw-1.5rem)] p-3">
          <p className="text-sm font-medium">Lo esencial de tu invitación</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Es una guía: puedes publicar cuando quieras.
          </p>
          <ul className="mt-3 space-y-2">
            {pasos.map((p) => (
              <li key={p.clave} className="flex items-start gap-2.5 text-sm">
                {p.hecho ? (
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <span className={cn("font-medium", p.hecho && "text-muted-foreground")}>
                    {p.etiqueta}
                    <span className="sr-only">{p.hecho ? ": listo" : ": pendiente"}</span>
                  </span>
                  {!p.hecho && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{p.ayuda}</span>
                      <Button
                        variant="link"
                        size="xs"
                        className="h-auto p-0 text-xs"
                        onClick={() => irA(p.clave)}
                      >
                        Completar
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
