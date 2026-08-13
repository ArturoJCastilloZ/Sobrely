import type { ThemeConfig } from "@/lib/theme/theme";
import { themeCssVars } from "@/lib/theme/theme";
import { cn } from "@/lib/utils";

/**
 * Applies a per-invitation theme (colors, font, spacing) as CSS variables to
 * its subtree. Module previews read these variables (--inv-*) for accents,
 * background and text color.
 */
export function ThemeScope({
  theme,
  className,
  children,
}: {
  theme: ThemeConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const bgImage = theme.backgroundImage?.url;

  return (
    <div
      // `dark` here scopes the invitation to its own mode so the modules'
      // `dark:` niceties (card tints) match its surface — independent of the
      // viewer's app theme. `relative` anchors the optional background-image
      // layers below the content.
      className={cn("relative", theme.mode === "dark" && "dark", className)}
      style={themeCssVars(theme)}
    >
      {bgImage && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${bgImage}")` }}
          />
          {/* Overlay of the surface color keeps text legible over the photo. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundColor: theme.colors.background,
              opacity: theme.backgroundImage.overlay,
            }}
          />
        </>
      )}
      {children}
    </div>
  );
}
