import { describe, expect, it } from "vitest";
import { initialsFrom } from "./avatar";

describe("initialsFrom", () => {
  it("toma la primera y la última palabra, no las dos primeras", () => {
    // "Arturo de Jesús Castillo" -> AC, no AD.
    expect(initialsFrom("Arturo de Jesús Castillo")).toBe("AC");
    expect(initialsFrom("Ana López")).toBe("AL");
  });

  it("con una sola palabra usa sus dos primeras letras", () => {
    expect(initialsFrom("Sobrely")).toBe("SO");
  });

  it("aguanta lo que la BD devuelve de verdad", () => {
    // `profiles.display_name` es nullable, y hay perfiles sin nombre.
    expect(initialsFrom(null)).toBe("?");
    expect(initialsFrom(undefined)).toBe("?");
    expect(initialsFrom("")).toBe("?");
    expect(initialsFrom("   ")).toBe("?");
  });

  it("normaliza espacios de más", () => {
    expect(initialsFrom("  Ana   López  ")).toBe("AL");
  });

  it("respeta el respaldo que se le pase", () => {
    expect(initialsFrom(null, "SB")).toBe("SB");
  });

  it("conserva el acento en mayúscula", () => {
    expect(initialsFrom("Ángel Ñuñez")).toBe("ÁÑ");
  });
});
