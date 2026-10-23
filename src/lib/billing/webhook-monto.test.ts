import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La ruta del webhook EJECUTADA: qué le pasa a `applyMercadoPagoPayment` y qué le
 * responde a Mercado Pago cuando el monto no cuadra.
 */
let resultado: { ok: boolean; reason?: string; orderStatus?: string } = { ok: true };
const llamadas: { orderId: string; paymentId: string; mpStatus: string; pago: unknown }[] = [];
let pagoDeMp: Record<string, unknown> = {};

vi.mock("@/lib/billing/mercadopago", () => ({
  verifyMercadoPagoSignature: () => true,
  mpPayment: () => ({ get: async () => pagoDeMp }),
}));
vi.mock("@/lib/billing/fulfillment", () => ({
  applyMercadoPagoPayment: async (p: (typeof llamadas)[number]) => {
    llamadas.push(p);
    return resultado;
  },
}));

const { POST } = await import("@/app/api/webhooks/mercadopago/route");

function notificacion() {
  return new Request("https://sobrely.test/api/webhooks/mercadopago?data.id=555&type=payment", {
    method: "POST",
    headers: { "x-signature": "ts=1,v1=x", "x-request-id": "r", "content-type": "application/json" },
    body: JSON.stringify({ type: "payment", data: { id: "555" } }),
  });
}

beforeEach(() => {
  llamadas.length = 0;
  resultado = { ok: true };
  pagoDeMp = { id: 555, status: "approved", external_reference: "ord-1", transaction_amount: 199, currency_id: "MXN" };
});

describe("webhook: lo cobrado viaja a fulfillment", () => {
  it("pasa el monto y la moneda reales de Mercado Pago", async () => {
    await POST(notificacion());
    expect(llamadas).toEqual([
      { orderId: "ord-1", paymentId: "555", mpStatus: "approved", pago: { amount: 199, currency: "MXN" } },
    ]);
  });

  it("si Mercado Pago no trae monto o moneda, pasa null (nunca un 0 inventado)", async () => {
    pagoDeMp = { id: 555, status: "approved", external_reference: "ord-1" };
    await POST(notificacion());
    expect(llamadas[0].pago).toEqual({ amount: null, currency: null });
  });

  it("un monto que no es número pasa como null", async () => {
    pagoDeMp = { id: 555, status: "approved", external_reference: "ord-1", transaction_amount: "199", currency_id: "MXN" };
    await POST(notificacion());
    expect(llamadas[0].pago).toEqual({ amount: null, currency: "MXN" });
  });
});

describe("webhook: qué responde", () => {
  it("monto distinto → 200 con la nota (definitivo: no se pide reintento)", async () => {
    resultado = { ok: false, reason: "amount_mismatch" };
    const r = await POST(notificacion());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: false, note: "amount_mismatch" });
  });

  it("cualquier OTRO fallo sigue siendo 500 (MP reintenta)", async () => {
    resultado = { ok: false, reason: "order_update_failed: boom" };
    expect((await POST(notificacion())).status).toBe(500);
    resultado = { ok: false, reason: "order_not_found" };
    expect((await POST(notificacion())).status).toBe(500);
  });

  it("éxito → 200 con el resultado", async () => {
    resultado = { ok: true, orderStatus: "paid" };
    const r = await POST(notificacion());
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ ok: true, orderStatus: "paid" });
  });
});
