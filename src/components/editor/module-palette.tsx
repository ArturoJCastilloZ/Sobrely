"use client";

import { MODULE_META, MODULE_TYPES, type ModuleType } from "@/lib/modules/types";
import { MODULE_REGISTRY } from "@/components/modules/registry";
import { SparkleIcon } from "lucide-react";
import { minimalPlanForModules } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Selector "Agregar sección".
 *
 * Marca los módulos de paga con el plan mínimo que los incluye, para que se vea
 * desde el editor qué desbloquea cada plan (el enforcement duro sigue estando
 * en la publicación). Free = sin marca.
 *
 * `trigger` existe porque este mismo menú se abre desde dos sitios: el botón de
 * la cabecera del riel, que agrega al final, y el `+` del gutter, que inserta
 * en una posición concreta. Es el mismo catálogo; cambia dónde cae lo elegido.
 */
export function ModulePalette({
  onAdd,
  trigger,
  align = "start",
  children,
}: {
  onAdd: (type: ModuleType) => void;
  trigger?: React.ReactElement;
  align?: "start" | "center" | "end";
  /** Contenido del disparador. Por defecto, la etiqueta de texto. */
  children?: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={trigger ?? <Button variant="outline" size="sm" />}
      >
        {children ?? "Agregar sección"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
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
                <span className="flex items-center gap-2">
                  {(() => {
                    const Icon = MODULE_REGISTRY[type].Icon;
                    return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
                  })()}
                  {MODULE_META[type].label}
                </span>
                {isPremium && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <SparkleIcon className="size-2.5" aria-hidden />
                    {plan!.name}
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
