import { describe, expect, it } from "vitest";
import {
  MAX_ANSWER_LENGTH,
  describeAnswers,
  sanitizeAnswers,
} from "./rsvp-answers";
import {
  moduleConfigWriteSchemas,
  parseConfig,
  rsvpConfigSchema,
  type RsvpQuestion,
} from "./types";

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
  const rota = {
    id: "menu",
    label: "Elige tu menú",
    type: "choice" as const,
    options: [] as string[],
    required: true,
  };

  it("al GUARDAR se rechaza: no sirve de nada y bloquearía al invitado", () => {
    const r = moduleConfigWriteSchemas.rsvp.safeParse({ questions: [rota] });
    expect(r.success).toBe(false);
  });

  it("al LEER se tolera, y el resto de la config SOBREVIVE", () => {
    // Esta es la trampa que costó un hallazgo: si el esquema de lectura
    // rechazara, `parseConfig` tiraría la config ENTERA y la página pública
    // perdería título, descripción y fecha límite en silencio.
    const cfg = parseConfig("rsvp", {
      title: "Confirma antes del viernes",
      description: "Nos ayuda a planear",
      deadline: "2026-10-01T00:00:00.000Z",
      questions: [rota],
    }) as { title: string; description: string; deadline: string };
    expect(cfg.title).toBe("Confirma antes del viernes");
    expect(cfg.description).toBe("Nos ayuda a planear");
    expect(cfg.deadline).toBe("2026-10-01T00:00:00.000Z");
  });

  it("una pregunta imposible NO bloquea al invitado aunque sea obligatoria", () => {
    // Sin opciones no hay valor que aceptar; exigirla dejaría a la persona
    // sin poder confirmar nunca. El error del anfitrión no lo paga el invitado.
    const r = sanitizeAnswers([rota], {});
    expect(r).toEqual({ ok: true, answers: {} });
  });

  it("con al menos una opción sí se guarda y sí se exige", () => {
    const buena = { ...rota, options: ["Carne"] };
    expect(moduleConfigWriteSchemas.rsvp.safeParse({ questions: [buena] }).success).toBe(true);
    expect(sanitizeAnswers([buena], {}).ok).toBe(false);
    expect(sanitizeAnswers([buena], { menu: "Carne" })).toEqual({
      ok: true,
      answers: { menu: "Carne" },
    });
  });

  it("los otros tipos no necesitan opciones", () => {
    for (const type of ["text", "boolean"] as const) {
      const r = moduleConfigWriteSchemas.rsvp.safeParse({
        questions: [{ id: "x", label: "¿Algo?", type, options: [] }],
      });
      expect(r.success, type).toBe(true);
    }
  });
});
