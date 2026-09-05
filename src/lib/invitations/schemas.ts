import { z } from "zod";
import {
  MODULE_TYPES,
  moduleConfigWriteSchemas,
  type ModuleType,
} from "@/lib/modules/types";
import { themeSchema } from "@/lib/theme/theme";

/** Slugify a string into a URL-safe invitation slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Permissive slugify for live typing: lowercases, strips accents and replaces
 * invalid chars with hyphens, but KEEPS a trailing hyphen so the user can type
 * "a-" then "b". Edge hyphens are cleaned by `slugify` at save time.
 */
export function liveSlugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}

export const invitationSettingsSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "El slug es obligatorio.")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones."),
  eventType: z.string().trim().max(40).optional().default(""),
  eventDate: z.string().optional().default(""), // ISO or ""
});

export const editorModuleSchema = z
  .object({
    id: z.string(),
    module_type: z.enum(MODULE_TYPES),
    sort_order: z.number().int().min(0),
    is_visible: z.boolean(),
    config: z.record(z.string(), z.unknown()),
  })
  .superRefine((mod, ctx) => {
    // Esquema de ESCRITURA: aquí sí se rechaza lo mal formado, porque hay
    // alguien enfrente a quien avisarle. Al leer se es tolerante.
    const schema = moduleConfigWriteSchemas[mod.module_type as ModuleType];
    const result = schema.safeParse(mod.config);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: `Configuración inválida en el módulo ${mod.module_type}.`,
        path: ["config"],
      });
    }
  });

export const saveEditorSchema = z.object({
  invitationId: z.string().uuid(),
  settings: invitationSettingsSchema,
  theme: themeSchema,
  modules: z.array(editorModuleSchema).max(50),
});

export type SaveEditorInput = z.infer<typeof saveEditorSchema>;
