"use client";

import type { RsvpQuestion } from "@/lib/modules/types";
import { MAX_ANSWER_LENGTH, type RsvpAnswers } from "@/lib/modules/rsvp-answers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Preguntas personalizadas dentro del formulario de confirmación.
 *
 * Compartido por los dos modos de RSVP (enlace público y lista nominal), que
 * son formularios distintos pero deben preguntar exactamente lo mismo.
 *
 * Los valores viven en el estado del formulario y no en el DOM: una pregunta
 * de sí/no no tiene representación natural en `FormData` (un checkbox sin
 * marcar simplemente no viaja, y eso es indistinguible de "respondió que no").
 */
export function RsvpQuestionFields({
  questions,
  values,
  onChange,
  labelClassName = "",
  inputClassName = "",
}: {
  questions: readonly RsvpQuestion[];
  values: RsvpAnswers;
  onChange: (next: RsvpAnswers) => void;
  labelClassName?: string;
  inputClassName?: string;
}) {
  if (questions.length === 0) return null;

  function set(id: string, v: string | boolean) {
    onChange({ ...values, [id]: v });
  }

  return (
    <>
      {questions.map((q) => {
        const id = `rsvp-q-${q.id}`;
        return (
          <div key={q.id} className="space-y-1.5">
            <Label htmlFor={id} className={labelClassName}>
              {q.label}
              {q.required && <span aria-hidden> *</span>}
            </Label>

            {q.type === "boolean" ? (
              <div className="flex gap-2">
                {[
                  { label: "Sí", v: true },
                  { label: "No", v: false },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => set(q.id, opt.v)}
                    aria-pressed={values[q.id] === opt.v}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
                      values[q.id] === opt.v
                        ? "border-current font-medium"
                        : "opacity-70"
                    } ${inputClassName}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : q.type === "choice" ? (
              <select
                id={id}
                value={typeof values[q.id] === "string" ? (values[q.id] as string) : ""}
                onChange={(e) => set(q.id, e.target.value)}
                className={`h-9 w-full rounded-md border px-2 text-sm ${inputClassName}`}
              >
                <option value="">Elige una opción</option>
                {q.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={id}
                value={typeof values[q.id] === "string" ? (values[q.id] as string) : ""}
                onChange={(e) => set(q.id, e.target.value)}
                maxLength={MAX_ANSWER_LENGTH}
                className={inputClassName}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
