"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LayersIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ModulePalette } from "@/components/editor/module-palette";
import { SortableModuleItem } from "@/components/editor/sortable-module-item";
import { useDocumento } from "@/lib/editor/contexto-documento";
import { PANELES_DOC, useSeleccion } from "@/lib/editor/contexto-seleccion";
import type { EditorModule } from "@/lib/invitations/editor-types";
import { MODULE_META, type ModuleType } from "@/lib/modules/types";
import { cn } from "@/lib/utils";

import { ICONO_PANEL } from "./iconos-panel";

/** Franja entre dos secciones con el `+` que inserta ahi. */
function Gutter({
  indice,
  onAdd,
}: {
  indice: number;
  onAdd: (type: ModuleType, index: number) => void;
}) {
  return (
    <div className="group/gutter relative flex h-3 items-center focus-within:h-7 hover:h-7">
      <div className="h-px flex-1 bg-primary/40 opacity-0 transition-opacity duration-(--ed-fast) group-focus-within/gutter:opacity-100 group-hover/gutter:opacity-100" />
      <ModulePalette
        align="start"
        onAdd={(type) => onAdd(type, indice)}
        trigger={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Insertar sección en la posición ${indice + 1}`}
            className="ml-1 rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity duration-(--ed-fast) group-focus-within/gutter:opacity-100 group-hover/gutter:opacity-100 hover:bg-primary focus-visible:opacity-100"
          />
        }
      >
        <PlusIcon />
      </ModulePalette>
    </div>
  );
}

/**
 * Riel: que hay en la invitacion.
 *
 * Consume documento Y seleccion, y esta bien que asi sea: es justo la pieza
 * cuyo aspecto depende de que hay elegido. Lo que NO puede pasar es que el
 * lienzo comparta esa suscripcion — ver la nota de `canvas-area.tsx`.
 *
 * La confirmacion de borrado vive AQUI y no en un contenedor de dialogos: su
 * estado (`porBorrar`) solo lo produce esta lista, y sacarlo obligaria a
 * subirlo a un sitio que repintaria mas.
 */
export function RielSecciones() {
  const { modules, invitation, aplicar } = useDocumento();
  const { moduloId, seleccionar, panel, irAPanel, hojaMovil } = useSeleccion();

  /** Modulo pendiente de confirmar borrado. Antes se borraba a un clic. */
  const [porBorrar, setPorBorrar] = useState<EditorModule | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    aplicar({ type: "reorder", activeId: String(active.id), overId: String(over.id) });
  }

  function addModule(type: ModuleType, index?: number) {
    // El id se genera AQUI y no en el reducer: un reducer con `crypto.randomUUID()`
    // dentro no es una funcion pura y deja de ser reproducible en pruebas.
    const id = `tmp-${crypto.randomUUID()}`;
    aplicar({ type: "addModule", moduleType: type, id, index });
    seleccionar(id);
    irAPanel("module");
  }

  function deleteModule(id: string) {
    aplicar({ type: "deleteModule", id });
    if (moduloId === id) seleccionar(null);
  }

  return (
    <nav
      aria-label="Secciones de la invitación"
      data-hoja={hojaMovil === "secciones" ? "abierta" : "cerrada"}
      className={cn(
        "flex shrink-0 flex-col gap-3 border-b p-3 lg:w-(--ed-sidebar-w) lg:overflow-y-auto lg:border-r lg:border-b-0",
        // < 1024: deja de ser el primer hijo del flujo —que es lo que
        // empujaba el lienzo— y pasa a ser una hoja sobre la barra.
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-(--ed-barra-movil) max-lg:z-40",
        "max-lg:max-h-[60svh] max-lg:overflow-y-auto max-lg:rounded-t-2xl",
        "max-lg:border max-lg:bg-background max-lg:shadow-2xl",
        "max-lg:transition-transform max-lg:duration-200 max-lg:ease-out",
        "max-lg:data-[hoja=cerrada]:pointer-events-none max-lg:data-[hoja=cerrada]:translate-y-[calc(100%+var(--ed-barra-movil))]",
      )}
    >
      {/*
        Confirmacion de borrado. Antes un clic en un boton de 28px destruia el
        modulo y su config sin preguntar y sin retorno — no habia undo en todo
        el producto. Ahora hay las dos cosas, y el dialogo lo dice.
      */}
      <AlertDialog
        open={porBorrar !== null}
        onOpenChange={(abierto) => !abierto && setPorBorrar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar «{porBorrar ? MODULE_META[porBorrar.module_type].label : ""}»?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se quita la sección y todo lo que escribiste en ella. Puedes
              recuperarla con Deshacer mientras no cierres el editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel />
            <AlertDialogAction
              onClick={() => {
                if (porBorrar) deleteModule(porBorrar.id);
                setPorBorrar(null);
              }}
            >
              Eliminar sección
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[length:var(--ed-text-micro)] font-(--ed-weight-medium) tracking-(--ed-tracking-micro) text-muted-foreground uppercase">
          Secciones
        </span>
        <ModulePalette onAdd={addModule} />
      </div>

      {modules.length === 0 ? (
        <EmptyState
          icon={<LayersIcon />}
          title="Tu invitación está vacía"
          description="Agrega la primera sección para empezar."
          className="py-8"
        />
      ) : (
        <DndContext
          id="modules-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={modules.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            {/*
              Gutter con `+` ENTRE secciones, patron de Notion. Antes solo
              existia un "Agregar modulo" global que siempre empujaba al
              final: si querias una seccion en medio, la agregabas abajo y
              la arrastrabas. El `+` inserta donde apuntas.

              Aparece al pasar el cursor sobre su franja, no siempre: cinco
              botones permanentes entre cuatro secciones convierten una
              lista en ruido. `focus-within` lo mantiene visible cuando se
              llega por teclado, que si no seria inalcanzable.
            */}
            <div>
              {modules.map((m, i) => (
                <div key={m.id}>
                  <Gutter indice={i} onAdd={addModule} />
                  <SortableModuleItem
                    module={m}
                    selected={panel === "module" && m.id === moduloId}
                    onSelect={() => {
                      seleccionar(m.id);
                      // En móvil, elegir una sección lleva DIRECTO a sus
                      // propiedades: quedarse en la lista obligaría a un
                      // segundo toque a ciegas.
                      irAPanel("module");
                    }}
                    onToggleVisible={(v) =>
                      aplicar({ type: "toggleVisible", id: m.id, visible: v })
                    }
                    onDelete={() => setPorBorrar(m)}
                  />
                </div>
              ))}
              <Gutter indice={modules.length} onAdd={addModule} />
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/*
        Nivel de DOCUMENTO, separado del nivel de bloque por un filete. No
        son hermanos de "Secciones": cambian la invitacion entera.
      */}
      <div className="mt-auto space-y-0.5 border-t pt-3">
        {PANELES_DOC.filter(
          (p) => p.id !== "guests" || invitation.rsvp_mode === "guest_list",
        ).map((p) => {
          const Icon = ICONO_PANEL[p.id];
          const activo = panel === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => irAPanel(p.id)}
              aria-current={activo ? "true" : undefined}
              className={cn(
                "flex h-11 w-full items-center gap-2.5 rounded-[var(--ed-radius-sm)] px-2.5 text-left",
                "text-[length:var(--ed-text-sm)] tracking-(--ed-tracking-sm)",
                "transition-colors duration-(--ed-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                activo
                  ? "bg-muted font-(--ed-weight-medium) text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {p.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
