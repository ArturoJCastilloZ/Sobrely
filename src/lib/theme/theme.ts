import { z } from "zod";
import {
  deriveCta,
  deriveStatus,
  STATUS_SUCCESS_BASE,
  STATUS_DANGER_BASE,
} from "./contrast";
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
  // Imagen propia (.png sin fondo) para las partículas flotantes (B2, Premium
  // `custom_art`). Si está vacío, se usa el emoji `symbol`. Solo aplica al
  // variant "floating".
  imageUrl: z.string().default(""),
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
  // Par tipografico (Fase 11 · P4). OPCIONAL a proposito: cuando falta, titulos
  // y cuerpo usan `font`, que es exactamente lo que hacian las 50 plantillas
  // antes de esto — el render no se mueve un pixel. Se anade como par porque el
  // esquema NO tenia con que diferenciar: `font` es UNA familia para todo, y la
  // Fase 7 planeaba "emparejar" un campo que no existia.
  typography: z
    .object({
      heading: z.enum(FONT_KEYS),
      body: z.enum(FONT_KEYS),
    })
    .optional(),
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
        rounded: z.enum(["none", "soft", "circle"]).default("none"),
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
    imageUrl: "",
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

/**
 * Par tipografico efectivo: el declarado, o `font` para ambos.
 *
 * La retro-compatibilidad es el punto: un tema guardado antes de la Fase 11 no
 * trae `typography`, y tiene que renderizar IDENTICO. Por eso el defecto no es
 * un par "bonito" sino la familia unica de siempre.
 */
export function resolveTypography(theme: ThemeConfig): {
  heading: FontKey;
  body: FontKey;
} {
  return {
    heading: theme.typography?.heading ?? theme.font,
    body: theme.typography?.body ?? theme.font,
  };
}

/**
 * El parche que escribe el interruptor «titulares distintos del cuerpo».
 *
 * Extraído del componente para que tenga pruebas: el proyecto corre vitest en
 * `environment: "node"` y no puede renderizar UI.
 *
 * - Al ACTIVARLO se siembra el par desde `font`, así el render no se mueve en
 *   el momento de encenderlo: el usuario ve el mismo diseño y a partir de ahí
 *   cambia una mitad. Encenderlo con un par «bonito» le movería la invitación
 *   sin pedírselo.
 * - Al APAGARLO se escribe `undefined`, que es lo que el esquema espera para
 *   «sin par» (`typography` es `.optional()`), y `resolveTypography` vuelve a
 *   caer en `font`. El parche se fusiona con spread y `JSON.stringify` elimina
 *   la clave al guardar, así que no queda basura en la fila.
 */
export function parcheDeParTipografico(
  activo: boolean,
  font: FontKey,
  actual?: { heading: FontKey; body: FontKey },
): { typography?: { heading: FontKey; body: FontKey } } {
  if (!activo) return { typography: undefined };
  return { typography: actual ?? { heading: font, body: font } };
}

/**
 * `script` es una familia de DISPLAY: en un párrafo destruye la legibilidad.
 * Es la misma regla dura que gobierna los 20 theme packs, pero aquí sólo
 * AVISA — la invitación es del usuario y no se le bloquea su gusto.
 */
export function cuerpoIlegible(body: FontKey): boolean {
  return body === "script";
}

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

/**
 * Variables del CTA. `deriveCta` decide entre relleno solido y contorno segun
 * cuanto habria que oscurecer el primario: por encima del umbral, oscurecerlo
 * cumpliria AA a costa de destruir la identidad del pack (`kawaii` pasaria de
 * rosa pastel a malva), asi que ahi cambia de tratamiento en vez de color.
 */
function ctaVars(theme: ThemeConfig): Record<string, string> {
  const cta = deriveCta(
    theme.colors.primary,
    theme.colors.text,
    theme.colors.background,
  );
  return {
    "--inv-cta": cta.bg,
    "--inv-cta-fg": cta.fg,
    "--inv-cta-border": cta.kind === "outline" ? cta.border : "transparent",
    // Estado dentro de la invitacion. NO se usan los tokens del chrome: su
    // variante oscura la decide el tema de la APP, y la invitacion tiene su
    // propio modo. Ver `deriveStatus`.
    "--inv-success": deriveStatus(
      STATUS_SUCCESS_BASE,
      theme.colors.text,
      theme.colors.background,
    ),
    "--inv-danger": deriveStatus(
      STATUS_DANGER_BASE,
      theme.colors.text,
      theme.colors.background,
    ),
  };
}

/** Builds the inline CSS variables that ThemeScope applies. */
export function themeCssVars(theme: ThemeConfig): React.CSSProperties {
  const tipografia = resolveTypography(theme);
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
    // CTA legible, derivado — no guardado.
    //
    // Los tres botones de accion de la invitacion publica pintaban `text-white`
    // sobre `--inv-primary`, y ese color lo elige el ANFITRION via theme pack.
    // Medidos los 20 packs, 11 no llegaban a 4.5:1 (`boda-lujo`, el del plan
    // caro, se quedaba en 3.09). Se deriva en vez de guardarse para que no haya
    // dato que migrar y para que un pack corregido arregle a todas sus
    // invitaciones a la vez.
    ...ctaVars(theme),
    // Par tipografico (P4). `--inv-font-heading` lo consume la regla
    // `.inv-scope :is(h1..h6)` de globals.css, con `inherit` de reserva: si la
    // variable faltara, los titulos heredan del cuerpo — que es el
    // comportamiento de siempre.
    ["--inv-font-heading" as string]: FONT_STACKS[tipografia.heading],
    ["--inv-font-body" as string]: FONT_STACKS[tipografia.body],
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    // Sin `typography`, `tipografia.body === theme.font`, asi que esto es el
    // mismo valor que antes.
    fontFamily: FONT_STACKS[tipografia.body],
  };
}
