"use client";

import { MODULE_META, MODULE_TYPES, type ModuleType } from "@/lib/modules/types";
import { minimalPlanForModules } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Selector "Agregar módulo". Marca los módulos de paga con ⭐ + el plan mínimo
 * que los incluye, para que el usuario sepa desde el editor qué desbloquea cada
 * plan (el enforcement duro sigue en la publicación). Free = sin marca.
 */
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
        {MODULE_TYPES.map((type) => {
          // Plan mínimo que incluye este módulo; si no es Free, es premium.
          const plan = minimalPlanForModules([type]);
          const isPremium = !!plan && plan.code !== "free";
          return (
            <DropdownMenuItem
              key={type}
              onClick={() => onAdd(type)}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="flex w-full items-center justify-between gap-2 font-medium">
                <span>
                  {MODULE_META[type].icon} {MODULE_META[type].label}
                </span>
                {isPremium && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    ⭐ {plan!.name}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {MODULE_META[type].description}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
