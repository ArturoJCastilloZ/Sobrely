import { describe, expect, it } from "vitest";
import { getEffectivePrice, getPlan } from "@/lib/billing/plans";
import { precioParaPublicarPlantilla } from "@/lib/billing/precio-plantilla";

/**
 * Los precios se comparan contra `getEffectivePrice(plan)` y no contra
 * literales: la campaña de lanzamiento los mueve por variable de entorno, y una
 * prueba con «199» pasaría o fallaría según el entorno en que corra, sin decir
 * nada del cálculo que de verdad se quiere demostrar (QUÉ PLAN, no cuántos $).
 */
const AHORA = new Date("2026-10-22T12:00:00");
const precioDe = (code: "esencial" | "celebracion" | "premium") =>
  getEffectivePrice(getPlan(code)!, AHORA);

describe("precioParaPublicarPlantilla", () => {
  it("módulos del plan gratis NO resultan en Free: publicar siempre cuesta", () => {
    const r = precioParaPublicarPlantilla(["hero", "welcome", "rsvp"], undefined, AHORA);
    expect(r?.planCode).toBe("esencial");
    expect(r?.precio).toBe(precioDe("esencial"));
  });

  it("un módulo que solo trae Celebración sube el plan", () => {
    const r = precioParaPublicarPlantilla(["hero", "gallery"], undefined, AHORA);
    expect(r?.planCode).toBe("celebracion");
    expect(r?.precio).toBe(precioDe("celebracion"));
  });

  it("un módulo que solo trae Premium sube el plan", () => {
    const r = precioParaPublicarPlantilla(["hero", "video"], undefined, AHORA);
    expect(r?.planCode).toBe("premium");
    expect(r?.precio).toBe(precioDe("premium"));
  });

  it("un theme pack premium exige personalización avanzada aunque los módulos sean básicos", () => {
    const sinPack = precioParaPublicarPlantilla(["hero", "rsvp"], undefined, AHORA);
    const conPack = precioParaPublicarPlantilla(["hero", "rsvp"], "boda-lujo", AHORA);
    expect(sinPack?.planCode).toBe("esencial");
    expect(conPack?.planCode).not.toBe("esencial");
    expect(conPack?.precio).toBeGreaterThan(sinPack!.precio);
  });

  it("un pack NO premium no cambia el precio", () => {
    const base = precioParaPublicarPlantilla(["hero", "rsvp"], undefined, AHORA);
    const conPack = precioParaPublicarPlantilla(["hero", "rsvp"], "baby-neutro", AHORA);
    expect(conPack?.planCode).toBe(base?.planCode);
  });

  it("un pack que no existe se ignora en vez de romper", () => {
    const r = precioParaPublicarPlantilla(["hero"], "pack-que-no-existe", AHORA);
    expect(r?.planCode).toBe("esencial");
  });

  it("sin módulos visibles sigue siendo el plan de pago más barato", () => {
    expect(precioParaPublicarPlantilla([], undefined, AHORA)?.planCode).toBe("esencial");
  });

  it("precioRegular solo aparece cuando la oferta de lanzamiento aplica", () => {
    const r = precioParaPublicarPlantilla(["hero"], undefined, AHORA)!;
    const plan = getPlan("esencial")!;
    if (r.precio < plan.priceRegular) expect(r.precioRegular).toBe(plan.priceRegular);
    else expect(r.precioRegular).toBeNull();
  });

  it("el precio nunca baja de lo que cuesta el plan que lo cubre (no hay regalo accidental)", () => {
    for (const modulos of [["hero"], ["hero", "gallery"], ["hero", "video"]] as const) {
      const r = precioParaPublicarPlantilla(modulos, undefined, AHORA)!;
      expect(r.precio).toBe(getEffectivePrice(getPlan(r.planCode)!, AHORA));
    }
  });
});
