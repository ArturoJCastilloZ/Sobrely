import { describe, expect, it } from "vitest";
import { getPlan } from "@/lib/billing/plans";
import { decidirPublicacion } from "@/lib/billing/decision-publicacion";

const esencial = getPlan("esencial")!;
const premium = getPlan("premium")!;
const ok = { allowed: true } as const;

describe("decidirPublicacion · sin comp ni entitlement (el caso nuevo: SIN demo)", () => {
  it("pide pagar el plan más barato que cubre; NUNCA publica gratis", () => {
    const d = decidirPublicacion({ tieneComp: false, entitlementVigente: false, gate: null, planDePago: esencial });
    expect(d.tipo).toBe("pagar");
    if (d.tipo === "pagar") {
      expect(d.planRequerido).toBe("esencial");
      expect(d.motivo).toBe("sin_plan");
    }
  });

  it("pide EL plan que corresponde, no uno fijo (con tres planes distintos)", () => {
    // Sin esto, un mutante que devolviera siempre "esencial" pasaba: el único
    // ejemplo de la prueba de arriba ERA esencial.
    for (const code of ["esencial", "celebracion", "premium"] as const) {
      const d = decidirPublicacion({
        tieneComp: false,
        entitlementVigente: false,
        gate: null,
        planDePago: getPlan(code)!,
      });
      expect(d.tipo === "pagar" && d.planRequerido).toBe(code);
    }
  });

  it("un gate «permitido» NO basta sin entitlement: el gate de Free ya no es un pase", () => {
    // Defecto que impide esta prueba: «contenido de Free ⇒ publica». Antes eso
    // creaba una demo de 14 días; ahora no hay demo, así que debe pagar.
    const d = decidirPublicacion({ tieneComp: false, entitlementVigente: false, gate: ok, planDePago: esencial });
    expect(d.tipo).toBe("pagar");
  });

  it("el mensaje dice el plan y el precio, y que editar es gratis", () => {
    const d = decidirPublicacion({ tieneComp: false, entitlementVigente: false, gate: null, planDePago: premium });
    expect(d.tipo === "pagar" && d.mensaje).toContain("Premium");
    expect(d.tipo === "pagar" && d.mensaje).toMatch(/\$\s?\d/);
    expect(d.tipo === "pagar" && d.mensaje).toContain("Diseñar y editar es gratis");
  });

  it("si ningún plan activo cubre el contenido, lo dice en vez de ofrecer un cobro imposible", () => {
    const d = decidirPublicacion({ tieneComp: false, entitlementVigente: false, gate: null, planDePago: undefined });
    expect(d.tipo).toBe("sin_plan_disponible");
  });
});

describe("decidirPublicacion · con comp o entitlement vigente (manda el gate)", () => {
  it("entitlement vigente y el gate permite → publica", () => {
    expect(decidirPublicacion({ tieneComp: false, entitlementVigente: true, gate: ok, planDePago: undefined }).tipo).toBe("publicar");
  });

  it("comp (cuenta de cortesía) y el gate permite → publica sin pagar", () => {
    expect(decidirPublicacion({ tieneComp: true, entitlementVigente: false, gate: ok, planDePago: undefined }).tipo).toBe("publicar");
  });

  it("entitlement vigente pero el contenido excede el plan → pagar la mejora, con el plan del gate", () => {
    const d = decidirPublicacion({
      tieneComp: false,
      entitlementVigente: true,
      gate: { allowed: false, requiredPlanCode: "celebracion", reason: "Tu invitación usa módulos que requieren el plan Celebración." },
      planDePago: undefined,
    });
    expect(d).toMatchObject({ tipo: "pagar", planRequerido: "celebracion", motivo: "plan_insuficiente" });
    expect(d.tipo === "pagar" && d.mensaje).toContain("Celebración");
  });

  it("el gate bloquea y no hay plan que lo cubra → «sin plan disponible», nunca un cobro", () => {
    const d = decidirPublicacion({
      tieneComp: false,
      entitlementVigente: true,
      gate: { allowed: false, reason: "no disponibles en ningún plan activo" },
      planDePago: undefined,
    });
    expect(d.tipo).toBe("sin_plan_disponible");
  });

  it("FAIL-CLOSED: con entitlement pero sin resultado del gate, NO publica", () => {
    const d = decidirPublicacion({ tieneComp: false, entitlementVigente: true, gate: null, planDePago: undefined });
    expect(d.tipo).toBe("sin_plan_disponible");
  });

  it("un entitlement vigente NO es un pase libre: si el gate dice que no, no publica", () => {
    const d = decidirPublicacion({
      tieneComp: false,
      entitlementVigente: true,
      gate: { allowed: false, requiredPlanCode: "premium" },
      planDePago: esencial,
    });
    expect(d.tipo).toBe("pagar");
    expect(d.tipo === "pagar" && d.planRequerido).toBe("premium");
  });
});
