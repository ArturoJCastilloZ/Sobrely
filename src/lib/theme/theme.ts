import { z } from "zod";
import {
  animationConfigSchema,
  SYSTEM_DEFAULT_ANIMATION,
} from "@/lib/animation/schema";

/** Per-invitation theme configuration (stored in invitations.theme_config). */

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color inválido.");

export const FONT_KEYS = ["sans", "serif", "elegant", "script"] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export const SPACING_KEYS = ["compact", "normal", "relaxed"] as const;
export type SpacingKey = (typeof SPACING_KEYS)[number];

export const DECORATION_VARIANTS = [
  "floating",
  "sparkle",
  "ambient-gradient",
] as const;
export type DecorationVariantKey = (typeof DECORATION_VARIANTS)[number];

export const decorationSchema = z.object({
  enabled: z.boolean().default(false),
  variant: z.enum(DECORATION_VARIANTS).default("floating"),
  symbol: z.string().max(4).default("❀"),
});
export type DecorationConfig = z.infer<typeof decorationSchema>;

export const DECORATION_LABELS: Record<DecorationVariantKey, string> = {
  floating: "Flotantes",
  sparkle: "Destellos",
  "ambient-gradient": "Gradiente ambiental",
};

export const themeSchema = z.object({
  colors: z
    .object({
      primary: hexColor.default("#8a6d3b"),
      secondary: hexColor.default("#b08d57"),
      background: hexColor.default("#ffffff"),
      text: hexColor.default("#1f2937"),
    })
    .default({
      primary: "#8a6d3b",
      secondary: "#b08d57",
      background: "#ffffff",
      text: "#1f2937",
    }),
  font: z.enum(FONT_KEYS).default("sans"),
  spacing: z.enum(SPACING_KEYS).default("normal"),
  // Light/dark surface of the invitation (independent of the viewer's app
  // theme). Retro-compatible: themes saved before this field parse as "light".
  mode: z.enum(["light", "dark"]).default("light"),
  // Arte propio del usuario (B2, Premium): imagen de fondo de toda la
  // invitación. `overlay` (0–1) es cuánto se atenúa con el color de fondo para
  // mantener el texto legible. Retro-compat: vacío = sin fondo de imagen.
  backgroundImage: z
    .object({
      url: z.string().default(""),
      overlay: z.number().min(0).max(1).default(0.45),
    })
    .default({ url: "", overlay: 0.45 }),
  // Stickers/decoración colocable (B2.2, Premium `custom_art`). Posición y
  // tamaño como fracción (0–1) del contenedor para ser responsive; el orden en
  // el arreglo es el z-index (último = encima). Retro-compat: vacío = sin stickers.
  stickers: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        x: z.number().min(0).max(1).default(0.5),
        y: z.number().min(0).max(1).default(0.3),
        scale: z.number().min(0.03).max(0.9).default(0.18),
        rotation: z.number().min(-180).max(180).default(0),
      }),
    )
    .default([]),
  // Master on/off switch for all animations (invitation-level).
  animations: z.boolean().default(true),
  // Global default animation config; per-module overrides added in 5.4.
  animation: animationConfigSchema.default(SYSTEM_DEFAULT_ANIMATION),
  // Ambient decoration layer for the whole invitation (5.5).
  decoration: decorationSchema.default({
    enabled: false,
    variant: "floating",
    symbol: "❀",
  }),
  // Last applied style preset (for display in the editor). Stored as a plain
  // string to avoid a circular import with the style-presets module.
  stylePreset: z.string().optional(),
  // Last applied theme pack (for display/highlight in the editor). Optional and
  // retro-compatible: a theme_config saved before theme packs existed parses
  // fine (the field is simply absent). Stored as a plain string, same rationale
  // as stylePreset, to avoid a circular import with the theme-packs module.
  themePack: z.string().optional(),
});

export type ThemeConfig = z.infer<typeof themeSchema>;

export function defaultTheme(): ThemeConfig {
  return themeSchema.parse({});
}

/** Normalizes stored theme_config, filling defaults for missing fields. */
export function parseTheme(raw: unknown): ThemeConfig {
  const result = themeSchema.safeParse(raw ?? {});
  return result.success ? result.data : defaultTheme();
}

/** Font-family stacks. `elegant`/`script` map to fonts loaded in the layout. */
export const FONT_STACKS: Record<FontKey, string> = {
  sans: "var(--font-geist-sans), system-ui, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
  elegant: 'var(--font-playfair), Georgia, serif',
  script: 'var(--font-dancing), "Segoe Script", cursive',
};

export const FONT_LABELS: Record<FontKey, string> = {
  sans: "Moderna (Sans)",
  serif: "Clásica (Serif)",
  elegant: "Elegante (Playfair)",
  script: "Manuscrita (Dancing)",
};

/** Vertical padding per section for each spacing option. */
export const SPACING_VALUES: Record<SpacingKey, string> = {
  compact: "1.75rem",
  normal: "2.5rem",
  relaxed: "3.5rem",
};

export const SPACING_LABELS: Record<SpacingKey, string> = {
  compact: "Compacto",
  normal: "Normal",
  relaxed: "Amplio",
};

/** Sensible background/text pair applied when switching the invitation mode. */
export const MODE_PRESETS = {
  light: { background: "#ffffff", text: "#1f2937" },
  dark: { background: "#161310", text: "#f4efe6" },
} as const;

/** Builds the inline CSS variables that ThemeScope applies. */
export function themeCssVars(theme: ThemeConfig): React.CSSProperties {
  return {
    // Custom properties consumed by the module previews.
    ["--inv-primary" as string]: theme.colors.primary,
    ["--inv-secondary" as string]: theme.colors.secondary,
    ["--inv-bg" as string]: theme.colors.background,
    ["--inv-text" as string]: theme.colors.text,
    // Card/tile tint that follows the invitation's own mode (not the viewer's
    // app theme), so a light invitation keeps light cards even if the owner's
    // dashboard is in dark mode.
    ["--inv-card" as string]:
      theme.mode === "dark" ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.7)",
    ["--inv-space" as string]: SPACING_VALUES[theme.spacing],
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: FONT_STACKS[theme.font],
  };
}
