"use client";

export type DecorationVariant = "floating" | "sparkle" | "ambient-gradient";

/** Deterministic pseudo-random in [0,1) — same on server and client (no
 *  Math.random, so no hydration mismatch). */
function rand(i: number, seed: number): number {
  const x = Math.sin((i + 1) * seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Ambient decorative overlay for a section/hero. Absolutely positioned, never
 * captures pointer events, and all motion is CSS (disabled under reduced
 * motion). Purely decorative — safe to omit for accessibility/performance.
 */
export function DecorationLayer({
  variant = "floating",
  count = 8,
  symbol = "❀",
  imageUrl = "",
  enabled = true,
}: {
  variant?: DecorationVariant;
  count?: number;
  symbol?: string;
  /** Custom PNG for the floating particles; overrides `symbol` when set. */
  imageUrl?: string;
  enabled?: boolean;
}) {
  if (!enabled) return null;

  if (variant === "ambient-gradient") {
    return <div className="inv-decor inv-ambient-gradient" aria-hidden />;
  }

  const items = Array.from({ length: Math.min(count, 24) }, (_, i) => i);

  return (
    <div className="inv-decor" aria-hidden>
      {items.map((i) => {
        const left = `${Math.round(rand(i, 12.9898) * 100)}%`;
        const top = `${Math.round(rand(i, 78.233) * 100)}%`;
        const dur = `${4 + Math.round(rand(i, 45.164) * 5)}s`;
        const delay = `${(rand(i, 3.14) * 4).toFixed(2)}s`;

        if (variant === "sparkle") {
          return (
            <span
              key={i}
              className="inv-decor__sparkle"
              style={{ left, top, animationDuration: dur, animationDelay: delay }}
            />
          );
        }
        const size = 18 + Math.round(rand(i, 9.7) * 16);
        if (imageUrl) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={imageUrl}
              alt=""
              aria-hidden
              className="inv-decor__item"
              style={{
                left,
                top,
                width: `${size}px`,
                animationDuration: dur,
                animationDelay: delay,
              }}
            />
          );
        }
        return (
          <span
            key={i}
            className="inv-decor__item"
            style={{
              left,
              top,
              fontSize: `${size}px`,
              animationDuration: dur,
              animationDelay: delay,
            }}
          >
            {symbol}
          </span>
        );
      })}
    </div>
  );
}
