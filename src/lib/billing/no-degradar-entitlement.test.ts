import { describe, expect, it } from "vitest";

import { decidirEntitlement } from "./no-degradar-entitlement";
import { getPlan } from "./plans";

/**
 * Dominio DINERO. Cada caso de aquí es un desenlace que se le hace a un cliente
 * que ya pagó, así que se prueban los dos errores posibles y no sólo uno:
 * cobrarle por PERDER acceso, y cobrarle por NADA.
 *
 * El defecto original: el fulfillment hacía `upsert` por `invitation_id` sin
 * mirar qué había, así que un pago de un plan inferior reemplazaba un
 * entitlement activo de un plan superior.
 */

const AHORA = new Date("2026-09-10T00:00:00Z");
const EN_30 = new Date("2026-10-10T00:00:00Z");
const EN_90 = new Date("2026-12-09T00:00:00Z");
const HACE_10 = new Date("2026-08-31T00:00:00Z");

describe("el orden de los planes sale de `plans.ts`, no de una lista a mano", () => {
  it("premium cuesta más que celebración, que más que esencial, que más que free", () => {
    // Si esto cambiara, la comparación de «plan superior» cambia con él, que es
    // exactamente lo que se quiere: una sola fuente de verdad.
    const p = (c: "free" | "esencial" | "celebracion" | "premium") =>
      getPlan(c)!.priceRegular;
    expect(p("premium")).toBeGreaterThan(p("celebracion"));
    expect(p("celebracion")).toBeGreaterThan(p("esencial"));
    expect(p("esencial")).toBeGreaterThan(p("free"));
  });
});

describe("nunca se degrada un acceso vigente", () => {
  it("pagar Esencial teniendo Premium vigente NO baja el plan", () => {
    // EL defecto. Antes: el upsert dejaba `esencial` y el cliente perdía
    // features por las que había pagado.
    const d = decidirEntitlement({
      planPagado: "esencial",
      expiraPagado: EN_30,
      actual: { planCode: "premium", status: "active", expiresAt: EN_90 },
      ahora: AHORA,
    });
    expect(d.accion).toBe("no-degradar");
  });

  it("pero si ese pago compra MÁS TIEMPO, se conserva el plan alto y se extiende", () => {
    // El otro error posible: tirar el pago del cliente. Se queda con Premium
    // —no baja— y con el vencimiento más lejano de los dos.
    const d = decidirEntitlement({
      planPagado: "esencial",
      expiraPagado: EN_90,
      actual: { planCode: "premium", status: "active", expiresAt: EN_30 },
      ahora: AHORA,
    });
    expect(d).toMatchObject({ accion: "escribir", planCode: "premium" });
    if (d.accion === "escribir") expect(d.expiresAt).toEqual(EN_90);
  });

  it("un plan ilimitado en el tiempo (sin vencimiento) no se extiende ni se baja", () => {
    const d = decidirEntitlement({
      planPagado: "esencial",
      expiraPagado: EN_90,
      actual: { planCode: "premium", status: "active", expiresAt: null },
      ahora: AHORA,
    });
    expect(d.accion).toBe("no-degradar");
  });
});

describe("cuando sí se escribe", () => {
  it("sin entitlement previo, se escribe lo pagado", () => {
    const d = decidirEntitlement({
      planPagado: "celebracion",
      expiraPagado: EN_30,
      actual: null,
      ahora: AHORA,
    });
    expect(d).toMatchObject({ accion: "escribir", planCode: "celebracion" });
  });

  it("un entitlement REVOCADO no bloquea nada", () => {
    // Tras un reembolso la fila queda `revoked`; volver a pagar debe funcionar.
    const d = decidirEntitlement({
      planPagado: "esencial",
      expiraPagado: EN_30,
      actual: { planCode: "premium", status: "revoked", expiresAt: EN_90 },
      ahora: AHORA,
    });
    expect(d).toMatchObject({ accion: "escribir", planCode: "esencial" });
  });

  it("un entitlement VENCIDO tampoco", () => {
    const d = decidirEntitlement({
      planPagado: "esencial",
      expiraPagado: EN_30,
      actual: { planCode: "premium", status: "active", expiresAt: HACE_10 },
      ahora: AHORA,
    });
    expect(d).toMatchObject({ accion: "escribir", planCode: "esencial" });
  });

  it("mejorar de plan sí escribe el nuevo", () => {
    const d = decidirEntitlement({
      planPagado: "premium",
      expiraPagado: EN_30,
      actual: { planCode: "esencial", status: "active", expiresAt: EN_90 },
      ahora: AHORA,
    });
    expect(d).toMatchObject({ accion: "escribir", planCode: "premium" });
  });

  it("y al mejorar NO se acorta el acceso que ya tenía", () => {
    // El vencimiento se queda en el MÁS LEJANO. Sin esto, mejorar de plan
    // podría restarle días a quien ya tenía más tiempo comprado.
    const d = decidirEntitlement({
      planPagado: "premium",
      expiraPagado: EN_30,
      actual: { planCode: "esencial", status: "active", expiresAt: EN_90 },
      ahora: AHORA,
    });
    if (d.accion === "escribir") expect(d.expiresAt).toEqual(EN_90);
  });

  it("renovar el MISMO plan extiende, nunca recorta", () => {
    const d = decidirEntitlement({
      planPagado: "celebracion",
      expiraPagado: EN_90,
      actual: { planCode: "celebracion", status: "active", expiresAt: EN_30 },
      ahora: AHORA,
    });
    expect(d).toMatchObject({ accion: "escribir", planCode: "celebracion" });
    if (d.accion === "escribir") expect(d.expiresAt).toEqual(EN_90);
  });
});
