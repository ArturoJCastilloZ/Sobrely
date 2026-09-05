/**
 * Respuestas a las preguntas personalizadas del RSVP — lógica pura.
 *
 * Vive aparte del schema porque el invitado es ANÓNIMO: lo que teclea nunca es
 * de fiar. Se valida contra las preguntas realmente declaradas y se descarta
 * todo lo demás, en vez de guardar el objeto tal como llegó.
 */
import type { RsvpQuestion } from "./types";

/** Valor de una respuesta, ya saneado. */
export type RsvpAnswerValue = string | boolean;
export type RsvpAnswers = Record<string, RsvpAnswerValue>;

export type AnswersResult =
  | { ok: true; answers: RsvpAnswers }
  | { ok: false; error: string };

/** Tope de caracteres de una respuesta libre. */
export const MAX_ANSWER_LENGTH = 300;

/**
 * Sanea lo que mandó el invitado contra las preguntas declaradas.
 *
 * Reglas:
 *  * una llave que no corresponde a ninguna pregunta se DESCARTA — el
 *    invitado no puede inventar campos;
 *  * en `choice`, un valor fuera de las opciones declaradas se descarta;
 *  * en `boolean`, solo se aceptan booleanos reales;
 *  * una pregunta `required` sin respuesta corta el envío con el nombre de la
 *    pregunta, para que el invitado sepa cuál le falta;
 *  * las respuestas vacías no se guardan: `{}` es "no contestó".
 */
export function sanitizeAnswers(
  questions: readonly RsvpQuestion[],
  raw: unknown,
): AnswersResult {
  const entrada: Record<string, unknown> =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const answers: RsvpAnswers = {};

  for (const q of questions) {
    const valor = entrada[q.id];

    if (q.type === "boolean") {
      if (typeof valor === "boolean") answers[q.id] = valor;
    } else if (q.type === "choice") {
      // Solo una de las opciones declaradas. Nada más.
      if (typeof valor === "string" && q.options.includes(valor.trim())) {
        answers[q.id] = valor.trim();
      }
    } else {
      if (typeof valor === "string") {
        const limpio = valor.trim().slice(0, MAX_ANSWER_LENGTH);
        if (limpio) answers[q.id] = limpio;
      }
    }

    if (q.required && answers[q.id] === undefined) {
      return { ok: false, error: `Falta responder: ${q.label}` };
    }
  }

  return { ok: true, answers };
}

/**
 * Empareja respuestas guardadas con las preguntas vigentes, para mostrarlas.
 *
 * Una respuesta cuya pregunta ya se borró NO se pierde en la base, pero
 * tampoco se muestra: sin la pregunta, el valor suelto no significa nada.
 */
export function describeAnswers(
  questions: readonly RsvpQuestion[],
  answers: unknown,
): { label: string; value: string }[] {
  const guardadas: Record<string, unknown> =
    answers !== null && typeof answers === "object" && !Array.isArray(answers)
      ? (answers as Record<string, unknown>)
      : {};

  const salida: { label: string; value: string }[] = [];
  for (const q of questions) {
    const v = guardadas[q.id];
    if (v === undefined || v === null || v === "") continue;
    salida.push({
      label: q.label,
      value: typeof v === "boolean" ? (v ? "Sí" : "No") : String(v),
    });
  }
  return salida;
}
