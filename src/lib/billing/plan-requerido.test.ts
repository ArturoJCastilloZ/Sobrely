import { describe, expect, it } from "vitest";
import { getPlan, getActivePlans } from "@/lib/billing/plans";
import {
  planCubreContenido,
  planDePagoRequerido,
  type ContenidoPublicable,
} from "@/lib/billing/plan-requerido";

const base: ContenidoPublicable = { modulosVisibles: ["hero", "rsvp"], usaArtePropio: false };
const con = (c: Partial<ContenidoPublicable>): ContenidoPublicable => ({ ...base, ...c });

describe("planDePagoRequerido", () => {
  it("contenido de módulos gratis exige el plan de pago MÁS BARATO, nunca Free", () => {
    const p = planDePagoRequerido(base);
    expect(p?.code).toBe("esencial");
    expect(p?.billingType).toBe("per_event");
  });

  it("sin módulos visibles sigue siendo un plan de pago", () => {
    expect(planDePagoRequerido(con({ modulosVisibles: [] }))?.code).toBe("esencial");
  });

  it("un módulo de Celebración sube el plan", () => {
    expect(planDePagoRequerido(con({ modulosVisibles: ["hero", "gallery"] }))?.code).toBe("celebracion");
  });

  it("un módulo solo de Premium sube el plan", () => {
    expect(planDePagoRequerido(con({ modulosVisibles: ["hero", "video"] }))?.code).toBe("premium");
  });

  it("un theme pack premium exige personalización avanzada aunque los módulos sean básicos", () => {
    const sin = planDePagoRequerido(base)!;
    const conPack = planDePagoRequerido(con({ themePack: "boda-lujo" }))!;
    expect(conPack.priceRegular).toBeGreaterThan(sin.priceRegular);
    expect(conPack.features).toContain("advanced_personalization");
  });

  it("un pack que NO es premium no cambia el plan", () => {
    expect(planDePagoRequerido(con({ themePack: "baby-neutro" }))?.code).toBe("esencial");
  });

  it("arte propio exige `custom_art`", () => {
    const p = planDePagoRequerido(con({ usaArtePropio: true }))!;
    expect(p.features).toContain("custom_art");
    expect(p.code).not.toBe("esencial");
  });

  it("módulos + pack + arte: el plan debe cubrir LOS TRES a la vez, no solo uno", () => {
    const p = planDePagoRequerido({
      modulosVisibles: ["hero", "video"],
      themePack: "boda-lujo",
      usaArtePropio: true,
    })!;
    expect(planCubreContenido(p, { modulosVisibles: ["hero", "video"], themePack: "boda-lujo", usaArtePropio: true })).toBe(true);
  });

  it("un pack que no existe se ignora en vez de romper", () => {
    expect(planDePagoRequerido(con({ themePack: "no-existe" }))?.code).toBe("esencial");
  });
});

describe("planCubreContenido", () => {
  it("el plan que devuelve planDePagoRequerido SIEMPRE cubre, y ninguno más barato cubre", () => {
    const casos: ContenidoPublicable[] = [
      base,
      con({ modulosVisibles: ["hero", "map", "gifts"] }),
      con({ modulosVisibles: ["hero", "gallery", "music"] }),
      con({ modulosVisibles: ["hero", "video"] }),
      con({ themePack: "xv-glam" }),
      con({ usaArtePropio: true }),
      { modulosVisibles: ["hero", "video"], themePack: "xv-glam", usaArtePropio: true },
    ];
    for (const c of casos) {
      const elegido = planDePagoRequerido(c)!;
      expect(planCubreContenido(elegido, c), JSON.stringify(c)).toBe(true);
      const masBaratos = getActivePlans().filter(
        (p) => p.billingType === "per_event" && p.priceRegular < elegido.priceRegular,
      );
      for (const barato of masBaratos) {
        expect(planCubreContenido(barato, c), `${barato.code} no debería cubrir ${JSON.stringify(c)}`).toBe(false);
      }
    }
  });

  it("Free puede cubrir módulos gratis (la regla de gate), pero NO es un plan de pago", () => {
    expect(planCubreContenido(getPlan("free")!, base)).toBe(true);
    expect(planDePagoRequerido(base)?.code).not.toBe("free");
  });

  it("un plan que no incluye un módulo visible no cubre", () => {
    expect(planCubreContenido(getPlan("esencial")!, con({ modulosVisibles: ["video"] }))).toBe(false);
  });
});
