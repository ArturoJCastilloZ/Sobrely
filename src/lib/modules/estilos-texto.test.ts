import { describe, expect, it } from "vitest";

import {
  COUNTDOWN_VARIANTS,
  defaultConfigFor,
  moduleConfigSchemas,
} from "@/lib/modules/types";

describe("estilos de texto de portada", () => {
  it("no altera las portadas existentes: todos los overrides empiezan vacíos", () => {
    expect((defaultConfigFor("hero") as { textStyles: unknown }).textStyles).toEqual({
      title: {},
      subtitle: {},
      cta: {},
    });
  });

  it("conserva un override por bloque sin aplicarlo a los demás", () => {
    const result = moduleConfigSchemas.hero.safeParse({
      textStyles: {
        title: {
          font: "script",
          color: "#a21caf",
          size: 3.2,
          weight: "bold",
          letterSpacing: 0.12,
          lineHeight: 1.4,
          transform: "uppercase",
        },
      },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.textStyles.title).toEqual({
      font: "script",
      color: "#a21caf",
      size: 3.2,
      weight: "bold",
      letterSpacing: 0.12,
      lineHeight: 1.4,
      transform: "uppercase",
    });
    expect(result.data.textStyles.subtitle).toEqual({});
  });

  it("descarta solo el override inválido en vez de perder la portada completa", () => {
    const result = moduleConfigSchemas.hero.safeParse({
      title: "Fiesta de prueba",
      textStyles: { title: { color: "no-es-un-color" } },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("Fiesta de prueba");
    expect(result.data.textStyles.title).toEqual({});
  });

  it("permite un override por índice en las secciones modulares", () => {
    const result = moduleConfigSchemas.welcome.safeParse({
      textStyles: { "0": { font: "elegant", align: "left" } },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.textStyles).toEqual({
      "0": { font: "elegant", align: "left" },
    });
  });

  it("ofrece varias composiciones de cuenta regresiva y conserva tarjetas como defecto", () => {
    expect(COUNTDOWN_VARIANTS).toEqual([
      "cards",
      "outline",
      "minimal",
      "circles",
      "poster",
      "timeline",
      "split",
      "pill",
      "ribbon",
      "stamp",
    ]);
    expect((defaultConfigFor("countdown") as { variant: string }).variant).toBe("cards");
  });
});
