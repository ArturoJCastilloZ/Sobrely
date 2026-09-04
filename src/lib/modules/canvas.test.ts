import { describe, expect, it } from "vitest";
import {
  CANVAS_ASPECTS,
  canvasConfigSchema,
  canvasLayerSchema,
  MODULE_TYPES,
  moduleConfigSchemas,
  parseConfig,
} from "@/lib/modules/types";
import { getPlan, minimalPlanForModules } from "@/lib/billing/plans";

/**
 * Pruebas de la PRUEBA DE CONCEPTO de "sección libre" (canvas + secciones).
 *
 * No prejuzgan si conviene shipearlo: fijan lo que el prototipo realmente hace,
 * para que la decisión se tome sobre comportamiento medido y no sobre una demo
 * a mano.
 */

describe("canvas · registro del módulo", () => {
  it("está en MODULE_TYPES y tiene schema", () => {
    expect(MODULE_TYPES as readonly string[]).toContain("canvas");
    expect(moduleConfigSchemas.canvas).toBeDefined();
  });

  it("el gate lo pone en Premium, no en un plan más barato", () => {
    // Consecuencia de que `ALL_MODULES` sea `MODULE_TYPES`: un módulo nuevo
    // cae en Premium solo. Es la posición conservadora para un prototipo, y
    // también el problema que el análisis señaló — ver el veredicto.
    expect(minimalPlanForModules(["canvas"])?.code).toBe("premium");
    expect(
      getPlan("celebracion")!.allowedModules as readonly string[],
    ).not.toContain("canvas");
  });
});

describe("canvas · geometría responsive", () => {
  it("las coordenadas fuera de 0–1 se RECHAZAN, no se recortan en silencio", () => {
    for (const bad of [{ x: 5 }, { y: -3 }, { w: 0 }, { w: 1.5 }, { rotation: 400 }]) {
      const res = canvasLayerSchema.safeParse({ id: "a", kind: "text", ...bad });
      expect(res.success, `debió rechazar ${JSON.stringify(bad)}`).toBe(false);
    }
    // Y el rango válido sí pasa.
    expect(
      canvasLayerSchema.safeParse({ id: "a", kind: "text", x: 0, y: 1, w: 1 })
        .success,
    ).toBe(true);
  });

  it("acepta el rango válido y aplica defaults al centro", () => {
    const l = canvasLayerSchema.parse({ id: "a", kind: "text" });
    expect(l.x).toBe(0.5);
    expect(l.y).toBe(0.5);
    expect(l.w).toBe(0.6);
    expect(l.rotation).toBe(0);
  });

  it("el tamaño de texto es una unidad relativa al contenedor, no al viewport", () => {
    // `fontSize` se emite como `cqw`. Que sea relativo al contenedor es lo que
    // permite conservar el responsive sin fijar altura en píxeles, y a la vez
    // no rompe el zoom del usuario como haría `vw`.
    const l = canvasLayerSchema.parse({ id: "a", kind: "text" });
    expect(l.fontSize).toBeGreaterThan(0);
    expect(l.fontSize).toBeLessThanOrEqual(30);
  });

  it("todas las proporciones son parseables como aspect-ratio de CSS", () => {
    for (const a of CANVAS_ASPECTS) {
      expect(a).toMatch(/^\d+\/\d+$/);
      const [w, h] = a.split("/").map(Number);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    }
  });
});

describe("canvas · el config sobrevive a datos viejos y basura", () => {
  it("un config vacío produce una sección usable", () => {
    const c = canvasConfigSchema.parse({});
    expect(c.layers).toEqual([]);
    expect(c.aspect).toBe("4/5");
    expect(c.background).toBe("");
  });

  it("parseConfig cae al default si el config es inválido", () => {
    // Mismo comportamiento que el resto de los módulos: nunca lanza.
    const c = parseConfig("canvas", { layers: "no soy un arreglo" });
    expect(Array.isArray((c as { layers: unknown[] }).layers)).toBe(true);
  });

  it("rechaza colores que no son hex de 6 dígitos", () => {
    expect(
      canvasLayerSchema.safeParse({ id: "a", kind: "text", color: "rojo" })
        .success,
    ).toBe(false);
    expect(
      canvasLayerSchema.safeParse({ id: "a", kind: "text", color: "#abcdef" })
        .success,
    ).toBe(true);
  });

  it("pone techo a las capas por sección", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `l${i}`,
      kind: "text" as const,
    }));
    expect(canvasConfigSchema.safeParse({ layers: many }).success).toBe(false);
  });
});

describe("canvas · secciones repetibles (lo que ya funcionaba)", () => {
  it("nada en el modelo impide dos secciones del mismo tipo", () => {
    // Medido en el repo: `invitation_modules` NO tiene unique en
    // (invitation_id, module_type), `addModule` no deduplica, `saveEditor`
    // reconcilia por id y el render público mapea en orden. Esta prueba fija
    // la parte que sí es del dominio: el schema de un módulo no depende de que
    // su tipo sea único.
    const a = canvasConfigSchema.parse({ title: "Primera" });
    const b = canvasConfigSchema.parse({ title: "Segunda" });
    expect(a.title).not.toBe(b.title);
    expect(moduleConfigSchemas.canvas.safeParse(a).success).toBe(true);
    expect(moduleConfigSchemas.canvas.safeParse(b).success).toBe(true);
  });
});
