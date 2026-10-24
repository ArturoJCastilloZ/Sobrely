import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModuleType } from "@/lib/modules/types";
import { parseTheme } from "@/lib/theme/theme";
import { precioParaPublicarPlantilla } from "@/lib/billing/precio-plantilla";
import type { PlantillaMarketplace } from "@/lib/templates/marketplace";
import { estiloDe } from "@/lib/templates/estilos";
import { resumenDeFicha, type ResumenFicha } from "@/lib/templates/resumen-ficha";
import { planDePagoRequerido } from "@/lib/billing/plan-requerido";

/**
 * Carga de la galería PÚBLICA de plantillas.
 *
 * Pide `modules_config` y `theme_config` —lo pesado— y los resuelve AQUÍ, en el
 * servidor, a un solo número (lo que cuesta publicar). Al navegador solo llega
 * `PlantillaMarketplace`: la galería de 65 no manda 65 configuraciones enteras
 * que el visitante nunca va a leer.
 *
 * Las plantillas activas son de lectura pública por RLS (`templates`), así que
 * no hace falta sesión ni llave de servicio.
 */
export type FilaPlantillaPublica = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  event_type: string | null;
  preview_image_url: string | null;
  modules_config: unknown;
  theme_config: unknown;
};

/** Módulos VISIBLES de una configuración de plantilla, tolerante a datos raros. */
export function modulosVisibles(modulesConfig: unknown): ModuleType[] {
  if (!Array.isArray(modulesConfig)) return [];
  return modulesConfig
    .filter(
      (m): m is { module_type: ModuleType; is_visible?: boolean } =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as { module_type?: unknown }).module_type === "string",
    )
    .filter((m) => m.is_visible !== false)
    .map((m) => m.module_type);
}

export function aPlantillaPublica(
  fila: FilaPlantillaPublica,
  ahora: Date = new Date(),
): PlantillaMarketplace {
  const precio = precioParaPublicarPlantilla(
    modulosVisibles(fila.modules_config),
    parseTheme(fila.theme_config).themePack,
    ahora,
  );
  return {
    id: fila.id,
    slug: fila.slug,
    name: fila.name ?? "Plantilla",
    description: fila.description,
    event_type: fila.event_type,
    preview_image_url: fila.preview_image_url,
    estilo: estiloDe(fila.slug),
    precio: precio
      ? { precio: precio.precio, precioRegular: precio.precioRegular }
      : null,
  };
}

const COLUMNAS =
  "id, slug, name, description, event_type, preview_image_url, modules_config, theme_config";

export async function cargarGaleriaPublica(
  supabase: SupabaseClient,
): Promise<PlantillaMarketplace[]> {
  const { data, error } = await supabase
    .from("templates")
    .select(COLUMNAS)
    .eq("is_active", true)
    .order("name", { ascending: true });
  // Sin catálogo no hay galería: se muestra el estado vacío, pero el error se
  // registra en el servidor en vez de tragarse (un 500 de Supabase y un
  // catálogo realmente vacío se leerían igual para el visitante).
  if (error) console.error("galería pública: no se pudo leer templates", error.message);
  return ((data ?? []) as FilaPlantillaPublica[]).map((f) => aPlantillaPublica(f));
}

/**
 * La ficha de una plantilla: lo mismo que la tarjeta de la galería más el
 * resumen de «qué incluye» (T12). El resumen solo se calcula aquí: en la
 * galería de 65 no se pide ni se manda.
 */
export type PlantillaFicha = PlantillaMarketplace & { incluye: ResumenFicha | null };

export async function cargarPlantillaPublica(
  supabase: SupabaseClient,
  slug: string,
): Promise<PlantillaFicha | null> {
  const { data } = await supabase
    .from("templates")
    .select(COLUMNAS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  const fila = data as FilaPlantillaPublica;
  const modulos = modulosVisibles(fila.modules_config);
  const plan = planDePagoRequerido({
    modulosVisibles: modulos,
    themePack: parseTheme(fila.theme_config).themePack,
    usaArtePropio: false,
  });
  return {
    ...aPlantillaPublica(fila),
    incluye: plan ? resumenDeFicha(modulos, plan.code) : null,
  };
}
