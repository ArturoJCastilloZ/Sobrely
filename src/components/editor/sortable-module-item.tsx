"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MODULE_META } from "@/lib/modules/types";
import type { EditorModule } from "@/lib/invitations/editor-types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function SortableModuleItem({
  module,
  selected,
  onSelect,
  onToggleVisible,
  onDelete,
}: {
  module: EditorModule;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: (visible: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id });

  const meta = MODULE_META[module.module_type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-card p-2 ${
        selected ? "ring-2 ring-primary" : ""
      } ${isDragging ? "opacity-60 shadow-lg" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none px-1 text-muted-foreground active:cursor-grabbing"
        aria-label="Reordenar"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left"
      >
        <span className="text-sm font-medium">
          {meta.icon} {meta.label}
        </span>
        {!module.is_visible && (
          <span className="ml-2 text-xs text-muted-foreground">(oculto)</span>
        )}
      </button>

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
        🗑
      </Button>
    </div>
  );
}
