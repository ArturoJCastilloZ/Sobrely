import {
  FONT_KEYS,
  FONT_LABELS,
  FONT_STACKS,
  type FontKey,
} from "@/lib/theme/theme";
import { SelectItem, SelectValue } from "@/components/ui/select";

/** Una opción que enseña la familia, no sólo su nombre técnico. */
export function FontPreviewValue({ font }: { font: FontKey }) {
  return (
    <span className="block truncate" style={{ fontFamily: FONT_STACKS[font] }}>
      {FONT_LABELS[font]}
    </span>
  );
}

/** Valor visible del selector, renderizado con la familia elegida. */
export function FontPreviewTrigger({
  font,
  globalLabel,
}: {
  font?: FontKey;
  globalLabel?: string;
}) {
  return (
    <>
      {/* Mantiene el valor accesible de Radix sin dejar que muestre el slug. */}
      <SelectValue className="sr-only" />
      {font ? (
        <FontPreviewValue font={font} />
      ) : (
        <span className="block truncate">{globalLabel ?? "Diseño global"}</span>
      )}
    </>
  );
}

/** Opciones reutilizadas por el tema global y los overrides por bloque. */
export function FontPreviewOptions() {
  return (
    <>
      {FONT_KEYS.map((font) => (
        <SelectItem key={font} value={font}>
          <span className="flex min-w-52 items-baseline justify-between gap-5">
            <span style={{ fontFamily: FONT_STACKS[font] }}>
              {FONT_LABELS[font]}
            </span>
            <span
              aria-hidden
              className="shrink-0 text-base text-muted-foreground"
              style={{ fontFamily: FONT_STACKS[font] }}
            >
              Aa
            </span>
          </span>
        </SelectItem>
      ))}
    </>
  );
}
