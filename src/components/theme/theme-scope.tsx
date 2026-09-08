import type { ThemeConfig } from "@/lib/theme/theme";
import { themeCssVars } from "@/lib/theme/theme";
import { cn } from "@/lib/utils";

/**
 * Applies a per-invitation theme (colors, font, spacing) as CSS variables to
 * its subtree. Module previews read these variables (--inv-*) for accents,
 * background and text color.
 *
 * The optional background image behaves like a BACKDROP: it stays put at
 * viewport height while the content scrolls past it, and peeks through in
 * every section that has no background of its own. It is deliberately NOT
 * `background-attachment: fixed` — that breaks in Safari on iOS, and in the
 * editor the scrolling happens inside a panel rather than the window.
 */
export function ThemeScope({
  theme,
  className,
  /**
   * Height of the backdrop layer. Defaults to the small viewport height, which
   * is what the public page wants (the window is the scrollport). A caller
   * whose scrollport is a panel rather than the window passes its own length.
   */
  backdropHeight = "100svh",
  children,
}: {
  theme: ThemeConfig;
  className?: string;
  backdropHeight?: string;
  children: React.ReactNode;
}) {
  const bgImage = theme.backgroundImage?.url;

  return (
    <div
      // `dark` here scopes the invitation to its own mode so the modules'
      // `dark:` niceties (card tints) match its surface — independent of the
      // viewer's app theme. `relative` is the containing block the backdrop
      // slides within.
      //
      // `overflow-x-clip` and NOT `overflow-x-hidden`: `hidden` makes this a
      // scroll container, and a `sticky` child of a scroll container that never
      // scrolls internally never moves — measured, the backdrop scrolled away
      // with the content (top went to -1500 after a 1500 scroll). `clip`
      // recorta exactly the same (same scrollWidth/clientWidth, no horizontal
      // scroll on the page) without creating that scroll container.
      //
      // ⚠️ This clip is NOT safe from callers, and it cannot be made safe here.
      // Measured: tailwind-merge puts `overflow-x-clip` and `overflow-hidden`
      // in the SAME group, so `cn("overflow-x-clip", "overflow-hidden")`
      // collapses to `overflow-hidden` — a caller does not compete with this
      // class, it DELETES it. Moving the clip to an inline `style` does not
      // save it either: a caller's `overflow-hidden` would still set
      // `overflow-y: hidden`, which makes this a scroll container just the
      // same. So the guard is mechanical instead of stylistic —
      // `backdrop-contract.test.ts` scans every file that renders
      // <ThemeScope> and fails if any of them passes an `overflow-*-hidden`.
      className={cn(
        "relative overflow-x-clip",
        theme.mode === "dark" && "dark",
        className,
      )}
      style={themeCssVars(theme)}
    >
      {bgImage && (
        // The sticky wrapper is zero-height on purpose, so the backdrop takes
        // no space in the flow (the previous `absolute` layers took none
        // either, and the content must not be pushed down). Sticky still
        // slides within the scope because the scope is the containing block.
        <div
          aria-hidden
          data-testid="inv-backdrop"
          className="pointer-events-none sticky top-0 z-0 h-0"
        >
          <div
            className="absolute top-0 left-0 w-full bg-cover bg-center"
            style={{
              backgroundImage: `url("${bgImage}")`,
              height: backdropHeight,
            }}
          />
          {/* Overlay of the surface color keeps text legible over the photo. */}
          <div
            className="absolute top-0 left-0 w-full"
            style={{
              backgroundColor: theme.colors.background,
              opacity: theme.backgroundImage.overlay,
              height: backdropHeight,
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
