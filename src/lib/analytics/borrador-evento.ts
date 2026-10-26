import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registrarEvento } from "./embudo";
import {
  faltantesSinNombres,
  leerPortadaDePlantilla,
  nombresPersonalizados,
  type PortadaBase,
} from "./borrador-completo";

/**
 * Registra `complete_draft` cuando, tras un guardado, el borrador cumple el
 * criterio (ver `borrador-completo.ts`). Mejor esfuerzo: nunca lanza.
 *
 * Se llama en CADA guardado del editor, así que el camino común tiene que ser
 * barato: lo que sale de la propia petición (fecha, lugar, foto) se comprueba
 * primero y solo si pasa se hace UNA consulta para comparar el título con el de
 * la plantilla de origen. Las invitaciones ya registradas en este proceso se
 * saltan; la unicidad real la da la clave del evento (una por invitación).
 */
const yaRegistradas = new Set<string>();

type ModuloGuardado = {
  module_type: string;
  is_visible: boolean;
  config: Record<string, unknown>;
};

export async function registrarBorradorCompleto(datos: {
  supabase: SupabaseClient;
  invitationId: string;
  fechaDelEvento: string | null | undefined;
  modulos: ModuloGuardado[];
}): Promise<void> {
  const { supabase, invitationId, fechaDelEvento, modulos } = datos;
  try {
    if (yaRegistradas.has(invitationId)) return;
    if (faltantesSinNombres({ fechaDelEvento, modulos }).length > 0) return;

    const { data: inv } = await supabase
      .from("invitations")
      .select("template_id")
      .eq("id", invitationId)
      .maybeSingle();
    let portadaBase: PortadaBase | null = null;
    let slug: string | undefined;
    if (inv?.template_id) {
      const { data: tpl } = await supabase
        .from("templates")
        .select("slug, modules_config")
        .eq("id", inv.template_id as string)
        .maybeSingle();
      slug = (tpl?.slug as string | undefined) ?? undefined;
      portadaBase = leerPortadaDePlantilla(tpl?.modules_config);
    }

    if (!nombresPersonalizados(modulos, portadaBase)) return;

    await registrarEvento("complete_draft", invitationId, {
      template_slug: slug,
      modules_count: modulos.filter((m) => m.is_visible).length,
    });
    yaRegistradas.add(invitationId);
  } catch (e) {
    console.error("[embudo] complete_draft no evaluado", e instanceof Error ? e.message : e);
  }
}
