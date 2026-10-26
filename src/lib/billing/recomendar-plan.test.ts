import { describe, expect, it } from "vitest";

import {
  MODULOS_EXTRA,
  MODULOS_VIDEO,
  OPCIONES_FUNCIONES,
  opcionesInvitados,
  recomendarPlan,
} from "@/lib/billing/recomendar-plan";
import { getActivePlans, getPlan } from "@/lib/billing/plans";

describe("opciones de invitados", () => {
  it("salen de los topes de los planes de pago, no de números escritos aparte", () => {
    const topes = getActivePlans()
      .filter((p) => p.billingType !== "free")
      .map((p) => p.maxGuests);
    const ops = opcionesInvitados();
    for (const t of topes.filter((n): n is number => n !== null)) {
      expect(ops.some((o) => o.necesita === t)).toBe(true);
    }
    // Premium no tiene tope: hay una opción abierta al final.
    expect(ops[ops.length - 1].necesita).toBeNull();
    expect(ops.map((o) => o.etiqueta)).toEqual([
      "Hasta 100",
      "101 a 250",
      "Más de 250",
    ]);
  });
});

describe("recomendarPlan", () => {
  it("casos conocidos con los planes actuales", () => {
    expect(recomendarPlan(100, [])?.code).toBe("esencial");
    expect(recomendarPlan(250, [])?.code).toBe("celebracion");
    expect(recomendarPlan(100, MODULOS_EXTRA)?.code).toBe("celebracion");
    expect(recomendarPlan(null, [])?.code).toBe("premium");
    expect(recomendarPlan(100, MODULOS_VIDEO)?.code).toBe("premium");
  });

  it("nunca recomienda Free", () => {
    for (const inv of opcionesInvitados()) {
      for (const f of OPCIONES_FUNCIONES) {
        expect(recomendarPlan(inv.necesita, f.modulos)?.code).not.toBe("free");
      }
    }
  });

  it("las 9 combinaciones: el plan cubre lo elegido y ningún plan de pago más barato lo cubre", () => {
    const pagos = getActivePlans().filter((p) => p.billingType !== "free");
    for (const inv of opcionesInvitados()) {
      for (const f of OPCIONES_FUNCIONES) {
        const rec = recomendarPlan(inv.necesita, f.modulos);
        expect(rec, `${inv.id}/${f.id}`).toBeDefined();
        if (!rec) continue;
        // cubre invitados y módulos, según lo que permite el plan
        expect(rec.maxGuests === null || rec.maxGuests >= (inv.necesita ?? Infinity)).toBe(true);
        for (const m of f.modulos) expect(rec.allowedModules).toContain(m);
        // ninguno más barato sirve
        const masBaratos = pagos.filter((p) => p.priceRegular < rec.priceRegular);
        for (const p of masBaratos) {
          const sirve =
            (p.maxGuests === null || p.maxGuests >= (inv.necesita ?? Infinity)) &&
            f.modulos.every((m) => p.allowedModules.includes(m));
          expect(sirve, `${p.code} bastaba para ${inv.id}/${f.id}`).toBe(false);
        }
      }
    }
  });

  it("los módulos de ejemplo siguen siendo lo que se anuncia: extras no están en Esencial y video solo en Premium", () => {
    const esencial = getPlan("esencial")!;
    const celebracion = getPlan("celebracion")!;
    for (const m of MODULOS_EXTRA) {
      expect(esencial.allowedModules).not.toContain(m);
      expect(celebracion.allowedModules).toContain(m);
    }
    expect(celebracion.allowedModules).not.toContain("video");
    expect(getPlan("premium")!.allowedModules).toContain("video");
  });
});
