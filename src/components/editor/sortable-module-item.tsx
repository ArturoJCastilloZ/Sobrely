"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MODULE_META } from "@/lib/modules/types";
import { MODULE_REGISTRY } from "@/components/modules/registry";
import { ChevronRightIcon, GripVerticalIcon, Trash2Icon } from "lucide-react";
import type { EditorModule } from "@/lib/invitations/editor-types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export type CapaDeModulo = { id: string; etiqueta: string };

export function SortableModuleItem({
  module,
  selected,
  capas,
  bloqueSeleccionado,
  onSelect,
  onSelectBloque,
  onToggleVisible,
  onDelete,
}: {
  module: EditorModule;
  selected: boolean;
  /** Sólo capas presentes en el DOM real del lienzo, no una lista supuesta. */
  capas: CapaDeModulo[];
  bloqueSeleccionado: string | null;
  onSelect: () => void;
  onSelectBloque: (bloque: string) => void;
  onToggleVisible: (visible: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id });

  const meta = MODULE_META[module.module_type];
  const Icon = MODULE_REGISTRY[module.module_type].Icon;
  const [abiertoManual, setAbiertoManual] = useState(false);
  // Elegir un texto desde el lienzo revela su sitio en el árbol sin un efecto
  // que cause un segundo render. El estado manual conserva expansiones que el
  // usuario abrió por cuenta propia.
  const abierto = abiertoManual || Boolean(bloqueSeleccionado);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border bg-card ${
        selected ? "ring-2 ring-primary" : ""
      } ${isDragging ? "opacity-60 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="cursor-grab touch-none px-1 text-muted-foreground active:cursor-grabbing"
          aria-label="Reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{meta.label}</span>
          </span>
          {!module.is_visible && (
            <span className="ml-2 text-xs text-muted-foreground">(oculto)</span>
          )}
        </button>

        {capas.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={abierto ? `Ocultar capas de ${meta.label}` : `Mostrar capas de ${meta.label}`}
            aria-expanded={abierto}
            aria-controls={`capas-${module.id}`}
            onClick={() => setAbiertoManual((actual) => !actual)}
          >
            <ChevronRightIcon
              className={`transition-transform duration-(--ed-fast) ${abierto ? "rotate-90" : ""}`}
              aria-hidden
            />
          </Button>
        )}

        <Switch
          checked={module.is_visible}
          onCheckedChange={onToggleVisible}
          aria-label="Visibilidad"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Eliminar módulo"
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" aria-hidden />
        </Button>
      </div>

      {abierto && capas.length > 0 && (
        <div id={`capas-${module.id}`} className="border-t px-2 py-1.5">
          {capas.map((capa) => {
            const activo = bloqueSeleccionado === capa.id;
            return (
              <button
                key={capa.id}
                type="button"
                aria-current={activo ? "true" : undefined}
                onClick={() => onSelectBloque(capa.id)}
                className={`flex h-8 w-full items-center rounded-[var(--ed-radius-sm)] pl-8 pr-2 text-left text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
                  activo
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {capa.etiqueta}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
