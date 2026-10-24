import { describe, expect, it } from "vitest";
import { construirResumen, leerVentana, topPlantillas } from "./embudo-resumen";

describe("construirResumen", () => {
  it("calcula el porcentaje contra el paso anterior y no inventa cuando el anterior es 0", () => {
    const r = construirResumen({
      view_category: 200, view_template: 100, start_customization: 25, sign_up: 0, complete_draft: 5,
    });
    expect(r[0].porcentajeDelAnterior).toBeNull();
    expect(r[1].porcentajeDelAnterior).toBe(50);
    expect(r[2].porcentajeDelAnterior).toBe(25);
    expect(r[3].total).toBe(0);
    expect(r[4].porcentajeDelAnterior).toBeNull();
  });

  it("sin datos devuelve todos los pasos en 0 y sin porcentajes", () => {
    const r = construirResumen({});
    expect(r).toHaveLength(8);
    expect(r.every((f) => f.total === 0 && f.porcentajeDelAnterior === null)).toBe(true);
  });

  it("redondea a un decimal", () => {
    const r = construirResumen({ view_category: 3, view_template: 1 });
    expect(r[1].porcentajeDelAnterior).toBe(33.3);
  });
});

describe("topPlantillas", () => {
  it("ordena por vistas, desempata por nombre y respeta el límite", () => {
    const filas = ["b", "a", "a", "c", "b", "a"].map((template_slug) => ({ template_slug }));
    expect(topPlantillas(filas, 2)).toEqual([
      { slug: "a", vistas: 3 },
      { slug: "b", vistas: 2 },
    ]);
  });

  it("ignora filas sin plantilla", () => {
    expect(topPlantillas([{}, { template_slug: 5 }, { template_slug: "x" }])).toEqual([
      { slug: "x", vistas: 1 },
    ]);
  });
});

describe("leerVentana", () => {
  it("acepta 7, 30, 90 y 0; todo lo demás es 30", () => {
    expect(leerVentana("7")).toBe(7);
    expect(leerVentana("0")).toBe(0);
    expect(leerVentana("90")).toBe(90);
    for (const x of [undefined, "", "15", "abc", "-1"]) expect(leerVentana(x)).toBe(30);
  });
});
