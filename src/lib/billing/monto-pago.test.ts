import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  mismoMonto,
  montoYMonedaCoinciden,
  REASON_MONTO_DISTINTO,
} from "@/lib/billing/monto-pago";

describe("mismoMonto: dinero en centavos, fail-closed", () => {
  it("iguales", () => {
    expect(mismoMonto(199, 199)).toBe(true);
    expect(mismoMonto(399, 399)).toBe(true);
  });
  it("199 y «199.00» (que PostgREST puede devolver como texto) son lo mismo", () => {
    expect(mismoMonto(199, Number("199.00"))).toBe(true);
    expect(mismoMonto(199.0, Number("199"))).toBe(true);
  });
  it("un centavo de diferencia NO es lo mismo", () => {
    expect(mismoMonto(398.99, 399)).toBe(false);
    expect(mismoMonto(399.01, 399)).toBe(false);
  });
  it("sin error de punto flotante: 0.1 + 0.2 contra 0.3", () => {
    expect(mismoMonto(0.1 + 0.2, 0.3)).toBe(true);
  });
  it("menor o mayor, claramente distintos", () => {
    expect(mismoMonto(1, 399)).toBe(false);
    expect(mismoMonto(4000, 399)).toBe(false);
  });
  it("ausente, NaN o infinito NO coinciden con nada, ni con 0", () => {
    expect(mismoMonto(null, 399)).toBe(false);
    expect(mismoMonto(null, 0)).toBe(false);
    expect(mismoMonto(Number.NaN, 399)).toBe(false);
    expect(mismoMonto(Number.POSITIVE_INFINITY, 399)).toBe(false);
  });
  it("una orden con monto inválido no coincide con nada", () => {
    expect(mismoMonto(399, Number.NaN)).toBe(false);
  });
  it("infinito contra infinito NO es «el mismo monto» (Infinity === Infinity sería verdadero)", () => {
    // Dos infinitos «coincidirían» con una igualdad ingenua. Hoy los rechaza la
    // comprobación de finitud de la ORDEN; la del pago es redundante con ella
    // (defensa en profundidad: quitarla no cambia ningún resultado, y por eso el
    // mutante que la elimina es EQUIVALENTE y no un hueco de pruebas).
    expect(mismoMonto(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(false);
    expect(mismoMonto(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(false);
  });
});

describe("montoYMonedaCoinciden", () => {
  const ORDEN = { amount: 399, currency: "MXN" };
  it("monto y moneda iguales", () => {
    expect(montoYMonedaCoinciden({ amount: 399, currency: "MXN" }, ORDEN)).toBe(true);
  });
  it("la moneda se compara sin mayúsculas", () => {
    expect(montoYMonedaCoinciden({ amount: 399, currency: "mxn" }, ORDEN)).toBe(true);
  });
  it.each([
    ["monto distinto", { amount: 398.99, currency: "MXN" }],
    ["moneda distinta", { amount: 399, currency: "USD" }],
    ["monto ausente", { amount: null, currency: "MXN" }],
    ["moneda ausente", { amount: 399, currency: null }],
    ["moneda vacía", { amount: 399, currency: "" }],
    ["todo ausente", { amount: null, currency: null }],
  ])("%s → NO coincide", (_n, pago) => {
    expect(montoYMonedaCoinciden(pago, ORDEN)).toBe(false);
  });
  it("una orden sin moneda no coincide con ningún pago", () => {
    expect(montoYMonedaCoinciden({ amount: 399, currency: "MXN" }, { amount: 399, currency: "" })).toBe(false);
  });
  it("el código de razón es estable (la ruta y las pruebas dependen de él)", () => {
    expect(REASON_MONTO_DISTINTO).toBe("amount_mismatch");
  });
});

const RAIZ = fileURLToPath(new URL("../../../", import.meta.url));
const fuente = (rel: string) =>
  readFileSync(join(RAIZ, rel), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("guardas estructurales de la defensa de monto", () => {
  const f = fuente("src/lib/billing/fulfillment.ts");

  it("`pago` es OBLIGATORIO en applyMercadoPagoPayment (no `pago?`)", () => {
    expect(f).toMatch(/\bpago: PagoCobrado;/);
    expect(f).not.toMatch(/\bpago\?: PagoCobrado/);
  });

  it("la comparación va DESPUÉS del retorno idempotente y ANTES de cualquier escritura de la orden", () => {
    const iIdem = f.indexOf("isRedundantTransition(");
    const iCheck = f.indexOf("montoYMonedaCoinciden(");
    const iUpdate = f.indexOf('.update({ status: newStatus, provider_payment_id: paymentId })');
    expect([iIdem, iCheck, iUpdate].every((x) => x > -1)).toBe(true);
    expect(iIdem).toBeLessThan(iCheck);
    expect(iCheck).toBeLessThan(iUpdate);
  });

  it("solo se exige al pasar a `paid` (un reembolso parcial no se bloquea)", () => {
    expect(f).toMatch(/newStatus === "paid" &&\s*!montoYMonedaCoinciden\(/);
  });

  it("la orden se lee con su monto y su moneda", () => {
    expect(f).toMatch(/plan_id, amount, currency, metadata/);
  });

  it("el webhook pasa lo cobrado por Mercado Pago y trata el monto distinto como definitivo", () => {
    const r = fuente("src/app/api/webhooks/mercadopago/route.ts");
    expect(r).toContain("payment.transaction_amount");
    expect(r).toContain("payment.currency_id");
    // El caso del monto distinto se resuelve ANTES del 500 genérico.
    expect(r.indexOf("REASON_MONTO_DISTINTO")).toBeGreaterThan(-1);
    expect(r.indexOf("result.reason === REASON_MONTO_DISTINTO")).toBeLessThan(
      r.indexOf('"fulfillment error"'),
    );
  });

  it("la reconciliación usa la MISMA comparación (una sola fuente de verdad)", () => {
    const p = fuente("src/lib/billing/reconciliar.ts");
    expect(p).toContain("montoYMonedaCoinciden(");
    expect(p).toMatch(/from "@\/lib\/billing\/monto-pago"/);
    expect(p).not.toContain("function mismoMonto");
  });
});
