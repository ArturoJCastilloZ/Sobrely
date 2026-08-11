"use client";

import { MODULE_META, MODULE_TYPES, type ModuleType } from "@/lib/modules/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModulePalette({
  onAdd,
}: {
  onAdd: (type: ModuleType) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="w-full" />}
      >
        + Agregar módulo
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {MODULE_TYPES.map((type) => (
          <DropdownMenuItem
            key={type}
            onClick={() => onAdd(type)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="font-medium">
              {MODULE_META[type].icon} {MODULE_META[type].label}
            </span>
            <span className="text-xs text-muted-foreground">
              {MODULE_META[type].description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
