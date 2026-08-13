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
  return (
    <div
      // `dark` here scopes the invitation to its own mode so the modules'
      // `dark:` niceties (card tints) match its surface — independent of the
      // viewer's app theme.
      className={cn(theme.mode === "dark" && "dark", className)}
      style={themeCssVars(theme)}
    >
      {children}
    </div>
  );
}
