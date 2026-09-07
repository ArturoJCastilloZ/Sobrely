import { describe, expect, it, vi } from "vitest";
import { parseConfig, defaultConfigFor } from "./types";

describe("parseConfig", () => {
  it("una config válida pasa intacta", () => {
    const c = parseConfig("hero", { title: "Ana & Carlos", subtitle: "Nos casamos" });
    expect(c.title).toBe("Ana & Carlos");
    expect(c.subtitle).toBe("Nos casamos");
  });

  it("rellena los campos que faltan con sus defaults", () => {
    const c = parseConfig("hero", { title: "Solo el título" });
    expect(c.title).toBe("Solo el título");
    expect(c).toHaveProperty("subtitle");
    expect(c).toHaveProperty("imageUrl");
  });

  it("UN campo roto NO se lleva por delante los demás", () => {
    // Este es el bug: antes esto devolvía los defaults COMPLETOS y el título
    // del usuario se perdía, sin aviso, para siempre al primer guardado.
    const c = parseConfig("hero", {
      title: "Ana & Carlos",
      subtitle: "Nos casamos",
      imageUrl: "no-es-una-url",
    });
    expect(c.title).toBe("Ana & Carlos");
    expect(c.subtitle).toBe("Nos casamos");
    expect(c.imageUrl).toBe(defaultConfigFor("hero").imageUrl);
  });

  it("reporta qué campo se descartó en vez de tragárselo", () => {
    const descartados: string[] = [];
    parseConfig("hero", { title: "Ok", imageUrl: 42 }, (c) => descartados.push(c));
    expect(descartados).toEqual(["imageUrl"]);
  });

  it("ignora campos que el esquema no conoce, sin romper", () => {
    const c = parseConfig("hero", { title: "Ok", campoInventado: "x" });
    expect(c.title).toBe("Ok");
    expect(c).not.toHaveProperty("campoInventado");
  });

  it("aguanta null, undefined y valores que no son objeto", () => {
    for (const raw of [null, undefined, 42, "cadena", []]) {
      expect(() => parseConfig("hero", raw)).not.toThrow();
    }
    expect(parseConfig("hero", null)).toEqual(defaultConfigFor("hero"));
  });

  it("conserva un arreglo válido y descarta solo el campo malo", () => {
    const c = parseConfig("itinerary", {
      title: "Programa",
      items: [{ time: "18:00", label: "Ceremonia" }],
    });
    expect(c.title).toBe("Programa");
    expect(c.items).toHaveLength(1);
  });

  it("no llama al reporte cuando todo valida", () => {
    const spy = vi.fn();
    parseConfig("welcome", { title: "Hola", message: "Bienvenidos" }, spy);
    expect(spy).not.toHaveBeenCalled();
  });
});
