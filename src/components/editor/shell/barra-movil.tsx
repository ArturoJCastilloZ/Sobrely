"use client";

import { LayersIcon } from "lucide-react";

import { MODULE_REGISTRY } from "@/components/modules/registry";
import { useDocumento } from "@/lib/editor/contexto-documento";
import { PANELES_DOC, useSeleccion, type PanelId } from "@/lib/editor/contexto-seleccion";
import { MODULE_META } from "@/lib/modules/types";
import { cn } from "@/lib/utils";

import { ICONO_PANEL } from "./iconos-panel";

/**
 * BARRA MOVIL (< 1024). La que hubo antes se quito porque mezclaba tres
 * niveles —documento, bloque y un MODO («Vista previa»)— y porque cinco
 * `flex-1` se truncaban a 420 px. Las dos cosas estan atendidas:
 * · «Vista previa» ya no es una pestana: el lienzo esta SIEMPRE visible,
 *   asi que desaparece el nivel que sobraba.
 * · No se trunca porque cada entrada apila icono sobre etiqueta de 10 px
 *   en vez de ponerlos en fila — verificado por medicion, no a ojo.
 *
 * Las entradas salen de las MISMAS fuentes que el escritorio
 * (`PANELES_DOC`, con su filtro de `guest_list`), asi que no hay una
 * lista paralela que se quede vieja cuando se anada un panel.
 */
export function BarraMovil() {
  const { modules, invitation } = useDocumento();
  const { moduloId, setPanel, hojaMovil, setHojaMovil } = useSeleccion();

  const selected = modules.find((m) => m.id === moduloId) ?? null;

  return (
    <nav
      aria-label="Secciones y paneles"
      className="fixed inset-x-0 bottom-0 z-50 flex h-(--ed-barra-movil) border-t bg-background lg:hidden"
    >
      {[
        { id: "secciones" as const, label: "Secciones", icon: LayersIcon },
        {
          id: "module" as const,
          label: selected ? MODULE_META[selected.module_type].label : "Bloque",
          icon: selected ? MODULE_REGISTRY[selected.module_type].Icon : LayersIcon,
        },
        ...PANELES_DOC.filter(
          (p) => p.id !== "guests" || invitation.rsvp_mode === "guest_list",
        ).map((p) => ({ id: p.id, label: p.label, icon: ICONO_PANEL[p.id] })),
      ].map((p) => {
        const Icon = p.icon;
        const activo = hojaMovil === p.id;
        return (
          <button
            key={p.id}
            type="button"
            aria-current={activo ? "true" : undefined}
            // Toca la activa y se cierra: asi se vuelve al lienzo entero
            // sin buscar una «X».
            onClick={() =>
              setHojaMovil((actual) => {
                if (actual === p.id) return null;
                if (p.id !== "secciones") setPanel(p.id as PanelId);
                return p.id;
              })
            }
            className={cn(
              // `min-h-11` = 44 px: el minimo tactil. Hoy 37 de 39
              // controles del editor estan por debajo, y esta medido que
              // NO es cosa del ancho (a 1400 px son los mismos 37).
              "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1",
              "text-[length:var(--ed-text-micro)] transition-colors",
              activo
                ? "font-(--ed-weight-semibold) text-foreground"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="max-w-full truncate">{p.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Velo de la hoja. Solo < 1024 y solo cuando hay una abierta: deja ver el
 * lienzo detras —que es el punto de todo esto— y cierra al tocarlo.
 */
export function VeloDeHoja() {
  const { hojaMovil, setHojaMovil } = useSeleccion();
  if (!hojaMovil) return null;
  return (
    <button
      type="button"
      aria-label="Cerrar panel"
      onClick={() => setHojaMovil(null)}
      className="fixed inset-0 z-30 bg-black/25 lg:hidden"
    />
  );
}
