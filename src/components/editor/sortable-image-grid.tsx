"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Editable grid of gallery images with drag-to-reorder (dnd-kit). Ids are
 * positional — stable within a render, which is all a single drag needs.
 */
export function SortableImageGrid({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(arrayMove(images, Number(active.id), Number(over.id)));
  }

  return (
    <DndContext
      id="gallery-images-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={images.map((_, i) => i)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            <SortableThumb
              key={i}
              id={i}
              src={src}
              onRemove={() => onChange(images.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableThumb({
  id,
  src,
  onRemove,
}: {
  id: number;
  src: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? "z-10 opacity-70" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Foto"
        {...attributes}
        {...listeners}
        className="aspect-square w-full cursor-grab touch-none rounded-md object-cover active:cursor-grabbing"
      />
      <button
        type="button"
        aria-label="Quitar foto"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
      >
        ✕
      </button>
    </div>
  );
}
