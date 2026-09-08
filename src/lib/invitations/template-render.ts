import { MODULE_TYPES, parseConfig, type ModuleType } from "@/lib/modules/types";
import { resolveTemplateTheme } from "@/lib/invitations/template-theme";
import type { ThemeConfig } from "@/lib/theme/theme";

/** Un módulo normalizado a partir de `templates.modules_config`. */
export type TemplateModule = {
  module_type: ModuleType;
  sort_order: number;
  is_visible: boolean;
  config: Record<string, unknown>;
};

/**
 * Convierte una fila de `templates` en el documento que se va a renderizar:
 * el tema con su pack ya expandido, y los módulos normalizados.
 *
 * Por qué existe como función compartida y no inline. Esta lógica vivía dentro
 * de `createFromTemplate`, y las miniaturas de la galería (Fase 4) necesitan
 * exactamente la misma. Duplicarla haría que la miniatura y la invitación que
 * el usuario recibe de esa plantilla puedan DIVERGIR en cuanto una de las dos
 * copias cambie — y una galería que muestra algo distinto de lo que entrega es
 * peor que una galería sin miniaturas: la primera miente, la segunda solo está
 * incompleta. Con una sola función, la miniatura es correcta por construcción.
 */
export function templateToDocument(template: {
  theme_config: unknown;
  modules_config: unknown;
}): { theme: ThemeConfig; modules: TemplateModule[] } {
  // La plantilla guarda solo la CLAVE del pack; aquí se expande a su paleta.
  // Sin esto la invitación nacía con los colores por defecto.
  const theme = resolveTemplateTheme(template.theme_config);

  const raw = Array.isArray(template.modules_config)
    ? (template.modules_config as unknown[])
    : [];

  const modules = raw
    .map((entrada, index) => {
      const m = (entrada ?? {}) as Record<string, unknown>;
      const type = m.module_type as ModuleType;
      // Un tipo desconocido se DESCARTA en vez de romper la plantilla entera:
      // un seed viejo con un módulo que ya no existe sigue siendo usable.
      if (!MODULE_TYPES.includes(type)) return null;
      return {
        module_type: type,
        sort_order: typeof m.sort_order === "number" ? m.sort_order : index,
        is_visible: m.is_visible !== false,
        config: parseConfig(type, m.config),
      };
    })
    .filter((m): m is TemplateModule => m !== null)
    // Este `sort` NO estaba en el código inline del que se extrajo esto: es un
    // añadido deliberado, dicho aquí para que no sea un cambio silencioso en
    // un refactor. Medido contra la BD antes de dejarlo: de las 50 plantillas
    // activas, **0** traen los `sort_order` desordenados respecto al array, así
    // que hoy es un no-op — riesgo latente, no activo. Se queda porque el
    // camino de las miniaturas necesita un orden determinista para que dos
    // capturas de la misma plantilla salgan idénticas.
    .sort((a, b) => a.sort_order - b.sort_order);

  return { theme, modules };
}
