import { describe, expect, it } from "vitest";
import { MODULE_TYPES, MODULE_META } from "@/lib/modules/types";
import { MODULE_REGISTRY, MODULE_REGISTRY_IS_COMPLETE } from "./registry";

/**
 * El `Record<ModuleType, …>` ya obliga a cubrir todos los tipos en compilación.
 * Estas pruebas cubren lo que el tipo NO puede: que nadie meta una entrada con
 * un `as never` o un cast y la deje a medias, y que el registro y los
 * metadatos no se desincronicen.
 */
describe("registro de módulos", () => {
  it("cubre los 12 tipos, sin sobrar ni faltar", () => {
    expect(MODULE_REGISTRY_IS_COMPLETE).toBe(true);
    expect(Object.keys(MODULE_REGISTRY).sort()).toEqual([...MODULE_TYPES].sort());
  });

  it("cada tipo trae icono, editor y render", () => {
    for (const t of MODULE_TYPES) {
      const e = MODULE_REGISTRY[t];
      expect(e.Icon, `${t}: falta Icon`).toBeTruthy();
      expect(typeof e.Editor, `${t}: falta Editor`).toBe("function");
      expect(typeof e.Preview, `${t}: falta Preview`).toBe("function");
    }
  });

  it("el icono ya NO es un emoji: es un componente", () => {
    // La regresión que esto atrapa: volver a poner una cadena como icono.
    for (const t of MODULE_TYPES) {
      expect(typeof MODULE_REGISTRY[t].Icon, `${t}`).not.toBe("string");
    }
  });

  it("MODULE_META ya no declara icono, para que no haya dos fuentes", () => {
    for (const t of MODULE_TYPES) {
      expect(MODULE_META[t]).not.toHaveProperty("icon");
      expect(MODULE_META[t].label.length).toBeGreaterThan(0);
    }
  });
});
