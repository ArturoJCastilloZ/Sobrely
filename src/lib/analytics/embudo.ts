import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  claveOpaca,
  filtrarParametros,
  type EventoEmbudo,
} from "./embudo-regla";

/**
 * Registra un evento del embudo (T05). Es **mejor esfuerzo**: nunca lanza y no
 * espera nada que pueda frenar la acción de la persona. Si la base falla, la
 * analítica pierde un punto; el pago, el registro o la plantilla no se enteran.
 *
 * @param clave  id que vuelve idempotente el evento (p. ej. el id de la orden).
 *               Un segundo registro con la misma clave se ignora.
 */
export async function registrarEvento(
  evento: EventoEmbudo,
  clave: string,
  parametros?: Record<string, unknown>,
): Promise<void> {
  try {
    const params = filtrarParametros(evento, parametros);
    if (!params || !clave) return;
    const admin = createAdminClient();
    // filas-no-verificadas: un evento repetido se ignora A PROPÓSITO (clave de
    // idempotencia), así que 0 filas insertadas es el resultado esperado y no un
    // fallo; y la analítica no debe frenar la acción de la persona.
    const { error } = await admin.from("funnel_events").upsert(
      { event: evento, event_key: claveOpaca(evento, clave), params },
      { onConflict: "event,event_key", ignoreDuplicates: true },
    );
    if (error) console.error("[embudo] no se pudo registrar", evento, error.message);
  } catch (e) {
    console.error("[embudo] error inesperado", evento, e instanceof Error ? e.message : e);
  }
}
