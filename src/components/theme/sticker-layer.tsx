import type { ThemeConfig } from "@/lib/theme/theme";

type Sticker = ThemeConfig["stickers"][number];

/** Border-radius per rounding option (fraction of the sticker box). */
export const STICKER_RADIUS: Record<Sticker["rounded"], string> = {
  none: "0",
  soft: "14%",
  circle: "50%",
};

/**
 * Read-only decorative sticker layer for a published invitation. Stickers are
 * positioned by fraction (0–1) of the invitation box and sized by fraction of
 * its width, so they stay proportional across viewport widths. The layer is
 * pointer-transparent so it never blocks the RSVP or links underneath.
 */
export function StickerLayer({ stickers }: { stickers: Sticker[] }) {
  if (stickers.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {stickers.map((s) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.id}
          src={s.url}
          alt=""
          aria-hidden
          className="absolute select-none"
          style={{
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            width: `${s.scale * 100}%`,
            transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
            borderRadius: STICKER_RADIUS[s.rounded],
          }}
        />
      ))}
    </div>
  );
}
