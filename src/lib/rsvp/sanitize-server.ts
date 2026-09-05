import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { rsvpConfigSchema } from "@/lib/modules/types";
import { sanitizeAnswers, type RsvpAnswers } from "@/lib/modules/rsvp-answers";

/**
 * Saneado de las respuestas del RSVP contra las preguntas que la invitación
 * declara DE VERDAD, leídas de la base.
 *
 * Vive en el servidor y aparte de las server actions porque lo usan los DOS
 * modos de RSVP (enlace público y lista nominal por token), que entran por
 * archivos distintos.
 *
 * Por qué no se confía en el cliente: el visitante es anónimo. Si la lista de
 * preguntas viajara desde el navegador, sería el propio visitante quien define
 * qué respuestas son válidas — podría inventar campos o saltarse una pregunta
 * obligatoria. La verdad de qué se preguntó está en el `config` del módulo.
 */
export type SanitizeResult =
  | { ok: true; answers: RsvpAnswers }
  | { ok: false; error: string };

/**
 * Mismo alias laxo que usa `billing/entitlements`: el cliente admin y el de
 * sesión tienen genéricos distintos y aquí solo se hace un `select`.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

export async function sanitizeRsvpAnswers(
  admin: AnyClient,
  invitationId: string,
  raw: unknown,
  /**
   * Lo obligatorio solo se exige a quien CONFIRMA. Ver `sanitizeAnswers`.
   */
  opts: { enforceRequired?: boolean } = {},
): Promise<SanitizeResult> {
  // Cliente admin a propósito: el anónimo no puede leer `invitation_modules`
  // por RLS, y necesitamos las preguntas para saber qué es válido.
  const { data } = await admin
    .from("invitation_modules")
    .select("config")
    .eq("invitation_id", invitationId)
    .eq("module_type", "rsvp")
    .maybeSingle();

  const parsed = rsvpConfigSchema.safeParse(data?.config ?? {});
  // Config ilegible o módulo ausente = no hay preguntas que responder. No se
  // guarda nada, en vez de aceptar lo que venga.
  const questions = parsed.success ? parsed.data.questions : [];
  return sanitizeAnswers(questions, raw, opts);
}
