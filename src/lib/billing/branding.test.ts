import { describe, expect, it } from "vitest";
import { brandingForPlanCode } from "@/lib/billing/branding";

describe("brandingForPlanCode", () => {
  it("Free muestra la marca completa", () => {
    expect(brandingForPlanCode("free")).toBe("full");
  });

  it("Esencial muestra la marca discreta", () => {
    expect(brandingForPlanCode("esencial")).toBe("reduced");
  });

  it("Celebración y Premium no muestran marca", () => {
    expect(brandingForPlanCode("celebracion")).toBe("none");
    expect(brandingForPlanCode("premium")).toBe("none");
  });

  it("cae a marca completa cuando el plan es desconocido o falta", () => {
    expect(brandingForPlanCode(null)).toBe("full");
    expect(brandingForPlanCode(undefined)).toBe("full");
    expect(brandingForPlanCode("")).toBe("full");
    expect(brandingForPlanCode("plan-que-no-existe")).toBe("full");
  });
});
