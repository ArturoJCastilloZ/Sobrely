import { describe, expect, it } from "vitest";
import {
  MAX_ANSWER_LENGTH,
  describeAnswers,
  sanitizeAnswers,
} from "./rsvp-answers";
import { rsvpConfigSchema, type RsvpQuestion } from "./types";

const q = (over: Partial<RsvpQuestion> = {}): RsvpQuestion => ({
  id: "alergias",
  label: "¿Alguna alergia?",
  type: "text",
  options: [],
  required: false,
  ...over,
});

describe("sanitizeAnswers — el invitado es anónimo, nada se cree", () => {
  it("descarta llaves que no corresponden a ninguna pregunta", () => {
    const r = sanitizeAnswers([q()], {
      alergias: "maní",
      is_admin: true,
      loQueSea: "x",
    });
    expect(r.ok && r.answers).toEqual({ alergias: "maní" });
  });

  it("en choice solo acepta una de las opciones declaradas", () => {
    const menu = q({ id: "menu", type: "choice", options: ["Carne", "Vegetariano"] });
    expect(sanitizeAnswers([menu], { menu: "Vegetariano" })).toEqual({
      ok: true,
      answers: { menu: "Vegetariano" },
    });
    // Un valor inventado se descarta, no se guarda.
    expect(sanitizeAnswers([menu], { menu: "Langosta" })).toEqual({
      ok: true,
      answers: {},
    });
  });

  it("en boolean solo acepta booleanos reales, no cadenas", () => {
    const b = q({ id: "bus", type: "boolean" });
    expect(sanitizeAnswers([b], { bus: true })).toEqual({ ok: true, answers: { bus: true } });
    expect(sanitizeAnswers([b], { bus: false })).toEqual({ ok: true, answers: { bus: false } });
    expect(sanitizeAnswers([b], { bus: "true" })).toEqual({ ok: true, answers: {} });
  });

  it("recorta la respuesta libre y tira la que queda vacía", () => {
    const largo = "a".repeat(MAX_ANSWER_LENGTH + 50);
    const r = sanitizeAnswers([q()], { alergias: largo });
    expect(r.ok && (r.answers.alergias as string).length).toBe(MAX_ANSWER_LENGTH);
    expect(sanitizeAnswers([q()], { alergias: "   " })).toEqual({ ok: true, answers: {} });
  });

  it("una pregunta obligatoria sin responder corta y dice cuál falta", () => {
    const r = sanitizeAnswers([q({ required: true })], {});
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain("¿Alguna alergia?");
  });

  it("obligatoria en false explícito SÍ cuenta como respondida", () => {
    const b = q({ id: "bus", type: "boolean", required: true });
    expect(sanitizeAnswers([b], { bus: false }).ok).toBe(true);
  });

  it("aguanta basura en vez de un objeto", () => {
    for (const basura of [null, undefined, "texto", 42, ["a"]]) {
      expect(sanitizeAnswers([q()], basura)).toEqual({ ok: true, answers: {} });
    }
  });

  it("sin preguntas declaradas nunca guarda nada", () => {
    expect(sanitizeAnswers([], { loQueSea: "x" })).toEqual({ ok: true, answers: {} });
  });
});

describe("describeAnswers — para mostrarlas en el panel", () => {
  it("empareja cada respuesta con su pregunta vigente", () => {
    const qs = [q(), q({ id: "bus", label: "¿Transporte?", type: "boolean" })];
    expect(describeAnswers(qs, { alergias: "maní", bus: true })).toEqual([
      { label: "¿Alguna alergia?", value: "maní" },
      { label: "¿Transporte?", value: "Sí" },
    ]);
  });

  it("una respuesta cuya pregunta se borró no se muestra", () => {
    // El valor sigue en la base, pero suelto no significa nada.
    expect(describeAnswers([q()], { alergias: "maní", vieja: "algo" })).toEqual([
      { label: "¿Alguna alergia?", value: "maní" },
    ]);
  });

  it("omite las vacías y aguanta basura", () => {
    expect(describeAnswers([q()], { alergias: "" })).toEqual([]);
    expect(describeAnswers([q()], null)).toEqual([]);
  });
});

describe("rsvpConfigSchema — las preguntas son opcionales y acotadas", () => {
  it("una config vieja sin preguntas sigue siendo válida", () => {
    const c = rsvpConfigSchema.parse({});
    expect(c.questions).toEqual([]);
  });

  it("rechaza más preguntas de las permitidas", () => {
    const seis = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`,
      label: `Pregunta ${i}`,
    }));
    expect(rsvpConfigSchema.safeParse({ questions: seis }).success).toBe(false);
  });

  it("rechaza un id que no sirve como llave", () => {
    const malo = [{ id: "con espacio", label: "x" }];
    expect(rsvpConfigSchema.safeParse({ questions: malo }).success).toBe(false);
  });
});

describe("lo obligatorio solo se le exige a quien confirma", () => {
  const menu = q({
    id: "menu",
    label: "Elige tu menú",
    type: "choice",
    options: ["Carne", "Vegetariano"],
    required: true,
  });

  it("al DECLINAR no se exige, aunque no llegue nada", () => {
    // El formulario ni siquiera manda respuestas al declinar; exigirlas dejaba
    // al invitado sin poder decir que no.
    const r = sanitizeAnswers([menu], undefined, { enforceRequired: false });
    expect(r).toEqual({ ok: true, answers: {} });
  });

  it("al CONFIRMAR sí se exige (comportamiento por defecto)", () => {
    expect(sanitizeAnswers([menu], {}).ok).toBe(false);
    expect(sanitizeAnswers([menu], {}, { enforceRequired: true }).ok).toBe(false);
  });

  it("lo que el invitado sí contestó se guarda aunque no se le exija", () => {
    const r = sanitizeAnswers([menu], { menu: "Carne" }, { enforceRequired: false });
    expect(r).toEqual({ ok: true, answers: { menu: "Carne" } });
  });

  it("sin preguntas obligatorias, exigir o no da lo mismo", () => {
    const libre = q({ required: false });
    expect(sanitizeAnswers([libre], {}, { enforceRequired: true })).toEqual({
      ok: true,
      answers: {},
    });
  });
});

describe("una pregunta de opciones necesita opciones", () => {
  it("el esquema rechaza `choice` sin opciones", () => {
    const r = rsvpConfigSchema.safeParse({
      questions: [{ id: "menu", label: "Elige tu menú", type: "choice", options: [] }],
    });
    expect(r.success).toBe(false);
  });

  it("la trampa completa: obligatoria y sin opciones, imposible de responder", () => {
    // Antes se podía guardar, y entonces `q.options.includes(...)` no casaba
    // con NADA: el invitado no podía confirmar jamás.
    const r = rsvpConfigSchema.safeParse({
      questions: [
        { id: "menu", label: "Elige tu menú", type: "choice", options: [], required: true },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("con al menos una opción sí se acepta", () => {
    const r = rsvpConfigSchema.safeParse({
      questions: [
        { id: "menu", label: "Elige tu menú", type: "choice", options: ["Carne"] },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("los otros tipos no necesitan opciones", () => {
    for (const type of ["text", "boolean"] as const) {
      const r = rsvpConfigSchema.safeParse({
        questions: [{ id: "x", label: "¿Algo?", type, options: [] }],
      });
      expect(r.success, type).toBe(true);
    }
  });
});
