"use client";

import {
  THEME_PACK_CATEGORIES,
  THEME_PACK_CATEGORY_LABELS,
  THEME_PACK_LIST,
  type ThemePack,
} from "@/lib/theme/theme-packs";
import { FONT_STACKS } from "@/lib/theme/theme";
import { minimalPlanForFeature } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Selector de temáticas (theme packs). Aplica un tema completo con 1 clic desde
 * el tab "Tema" del editor. Como el ModulePalette, marca los packs premium con
 * ⭐ + el plan mínimo que los desbloquea (informativo): aplicar y ver el preview
 * es libre; el enforcement duro ocurre al publicar (`canPublishInvitation`).
 *
 * MVP: sin `previewImageUrl`, la tarjeta usa un swatch generado de la paleta +
 * la fuente del pack como preview. Imágenes reales = V2.
 */

// Plan que desbloquea los packs premium (Celebración+). Se resuelve una vez.
const PREMIUM_PLAN = minimalPlanForFeature("advanced_personalization");

function PackSwatch({ pack }: { pack: ThemePack }) {
  const c = pack.theme.colors;
  return (
    <div
      className="flex h-14 w-full items-center justify-between rounded-md border px-2"
      style={{ backgroundColor: c.background }}
    >
      <span
        className="text-lg font-semibold leading-none"
        style={{ color: c.text, fontFamily: FONT_STACKS[pack.theme.font] }}
      >
        Aa
      </span>
      <span className="flex gap-1">
        <span
          className="h-4 w-4 rounded-full border border-black/10"
          style={{ backgroundColor: c.primary }}
        />
        <span
          className="h-4 w-4 rounded-full border border-black/10"
          style={{ backgroundColor: c.secondary }}
        />
      </span>
    </div>
  );
}

export function ThemePackPicker({
  value,
  onSelect,
}: {
  /** `theme.themePack` actual (para resaltar el aplicado). */
  value: string | undefined;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <Label>Temática</Label>
        <p className="text-xs text-muted-foreground">
          Aplica una temática completa (paleta, tipografía y decoración) con un
          clic. Puedes ajustar todo después.
        </p>
      </div>

      {THEME_PACK_CATEGORIES.map((category) => {
        const packs = THEME_PACK_LIST.filter((p) => p.category === category);
        if (packs.length === 0) return null;
        return (
          <div key={category} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {THEME_PACK_CATEGORY_LABELS[category]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {packs.map((pack) => {
                const selected = value === pack.key;
                return (
                  <button
                    key={pack.key}
                    type="button"
                    onClick={() => onSelect(pack.key)}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors",
                      selected
                        ? "border-primary ring-1 ring-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    <PackSwatch pack={pack} />
                    <span className="flex items-start justify-between gap-1">
                      <span className="text-xs font-medium leading-tight">
                        {pack.label}
                      </span>
                      {pack.isPremium && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          ⭐{PREMIUM_PLAN ? ` ${PREMIUM_PLAN.name}` : ""}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
