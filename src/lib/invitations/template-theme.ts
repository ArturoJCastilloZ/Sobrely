import { parseTheme, type ThemeConfig } from "@/lib/theme/theme";
import { applyThemePack } from "@/lib/theme/theme-packs";

/**
 * Resuelve el `theme_config` de una plantilla al que se guarda en la invitación.
 *
 * Las plantillas temáticas guardan SOLO la clave del pack
 * (`{"themePack":"boda-lujo"}`) y no su paleta, a propósito: el pack es la
 * fuente de los colores, y copiarlos al seed los congelaría el día que el pack
 * cambie en código.
 *
 * El problema era que nada expandía esa clave. `applyThemePack` se llamaba
 * únicamente desde el selector del editor, y `createFromTemplate` copiaba
 * `theme_config` tal cual, así que una invitación creada desde una plantilla
 * temática nacía con la paleta POR DEFECTO en vez de la de su temática. El
 * usuario elegía "Boda de lujo" y obtenía el dorado genérico.
 *
 * Si el pack no existe —una plantilla sembrada antes de que su código se
 * despliegue— `applyThemePack` devuelve el theme intacto: se degrada a los
 * colores base en lugar de fallar.
 */
export function resolveTemplateTheme(raw: unknown): ThemeConfig {
  const theme = parseTheme(raw);
  return theme.themePack ? applyThemePack(theme, theme.themePack) : theme;
}
