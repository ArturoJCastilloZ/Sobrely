import { describe, expect, it } from "vitest";
import {
  MODULE_TYPES,
  tieneComposicionDeSeccion,
  moduleConfigSchemas,
} from "@/lib/modules/types";

describe("qué módulos exponen composición de sección", () => {
  it("hay tipos de módulo que comprobar", () => {
    expect(MODULE_TYPES.length).toBe(12);
  });

  it("`hero` NO la tiene: compone con `variant`, no con `align`", () => {
    expect(tieneComposicionDeSeccion("hero")).toBe(false);
  });

  it("los otros 11 SÍ la tienen", () => {
    const sin = MODULE_TYPES.filter((t) => !tieneComposicionDeSeccion(t));
    expect(sin).toEqual(["hero"]);
  });

  it.each(MODULE_TYPES.filter((t) => t !== "hero").map((t) => [t] as const))(
    "%s: el esquema acepta align/bleed/frame de verdad",
    (tipo) => {
      // No basta con que la clave exista en el shape: tiene que PARSEAR. Si
      // sólo mirara el shape, un `align` mal tipado pasaría el detector y la UI
      // escribiría un valor que el renderer descarta.
      const leido = moduleConfigSchemas[tipo].parse({
        align: "end",
        bleed: "full",
        frame: "double",
      }) as { align: string; bleed: string; frame: string };
      expect(leido.align).toBe("end");
      expect(leido.bleed).toBe("full");
      expect(leido.frame).toBe("double");
    },
  );
});
