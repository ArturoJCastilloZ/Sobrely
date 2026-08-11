import type { ThemeConfig } from "@/lib/theme/theme";
import { themeCssVars } from "@/lib/theme/theme";

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
    <div className={className} style={themeCssVars(theme)}>
      {children}
    </div>
  );
}
