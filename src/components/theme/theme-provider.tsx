"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-level light/dark provider (next-themes). Sets `.dark` on <html>, which
 * drives the shadcn tokens defined in globals.css. Only affects the app chrome
 * (dashboard/admin/auth/marketing); public invitations render their own theme
 * via ThemeScope and are kept independent of the viewer's preference.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
