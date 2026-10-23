import { describe, expect, it, vi } from "vitest";
import {
  MARGEN_MS,
  MAX_ORDENES_POR_CORRIDA,
  reconciliarPagos,
  VENTANA_MS,
  type AlmacenDeOrdenes,
  type AplicarPago,
  type BuscarPagos,
  type OrdenPendiente,
  type PagoMp,
} from "@/lib/billing/reconciliar";

const AHORA = new Date("2026-10-23T20:00:00.000Z");

function orden(id: string, amount = 399, currency = "MXN"): OrdenPendiente {
  return { id, amount, currency };
}
function pago(o: Partial<PagoMp> & { externalReference: string | null }): PagoMp {
  return { id: "pago-1", status: "approved", amount: 399, currency: "MXN", ...o };
}

/** Almacén que registra la ventana que se le pidió, para probar los límites de tiempo. */
function almacenCon(ordenes: OrdenPendiente[]) {
  const llamadas: { desde: Date; hasta: Date; limite: number }[] = [];
  const almacen: AlmacenDeOrdenes = {
    async ordenesPendientes(desde, hasta, limite) {
      llamadas.push({ desde, hasta, limite });
      return ordenes;
    },
  };
  return { almacen, llamadas };
}

const aplicarOk: AplicarPago = async () => ({ ok: true });

describe("aplica el pago aprobado de una orden pendiente", () => {
  it("aprobado, mismo monto y moneda → se aplica con el id de pago de Mercado Pago", async () => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const buscar: BuscarPagos = async (ref) => [pago({ id: "184715785625", externalReference: ref })];
    const r = await reconciliarPagos({ almacen: almacenCon([orden("o1")]).almacen, buscarPagos: buscar, aplicar, ahora: AHORA });
    expect(aplicar).toHaveBeenCalledWith({ orderId: "o1", paymentId: "184715785625", mpStatus: "approved" });
    expect(r).toMatchObject({ revisadas: 1, aplicadas: 1, sinPagoAprobado: 0, montoNoCoincide: 0, errores: 0, ordenesAplicadas: ["o1"] });
  });

  it("el monto se compara en centavos: 399 y «399.00» son lo mismo", async () => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const r = await reconciliarPagos({
      almacen: almacenCon([orden("o1", Number("399.00"))]).almacen,
      buscarPagos: async (ref) => [pago({ externalReference: ref, amount: 399.0 })],
      aplicar,
      ahora: AHORA,
    });
    expect(r.aplicadas).toBe(1);
  });

  it("la moneda se compara sin importar mayúsculas", async () => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const r = await reconciliarPagos({
      almacen: almacenCon([orden("o1", 399, "MXN")]).almacen,
      buscarPagos: async (ref) => [pago({ externalReference: ref, currency: "mxn" })],
      aplicar,
      ahora: AHORA,
    });
    expect(r.aplicadas).toBe(1);
  });
});

describe("lo que NO se aplica", () => {
  it("sin pagos → no se aplica", async () => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const r = await reconciliarPagos({ almacen: almacenCon([orden("o1")]).almacen, buscarPagos: async () => [], aplicar, ahora: AHORA });
    expect(aplicar).not.toHaveBeenCalled();
    expect(r).toMatchObject({ revisadas: 1, sinPagoAprobado: 1, aplicadas: 0 });
  });

  it.each(["pending", "in_process", "rejected", "cancelled", "refunded", "charged_back", "authorized", ""])(
    "estado «%s» no cuenta como aprobado",
    async (status) => {
      const aplicar = vi.fn<AplicarPago>(aplicarOk);
      const r = await reconciliarPagos({
        almacen: almacenCon([orden("o1")]).almacen,
        buscarPagos: async (ref) => [pago({ externalReference: ref, status })],
        aplicar,
        ahora: AHORA,
      });
      expect(aplicar).not.toHaveBeenCalled();
      expect(r.sinPagoAprobado).toBe(1);
    },
  );

  it("un pago aprobado que apunta a OTRA orden no cuenta", async () => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const r = await reconciliarPagos({
      almacen: almacenCon([orden("o1")]).almacen,
      buscarPagos: async () => [pago({ externalReference: "otra-orden" })],
      aplicar,
      ahora: AHORA,
    });
    expect(aplicar).not.toHaveBeenCalled();
    expect(r.sinPagoAprobado).toBe(1);
  });

  it("un pago sin external_reference no cuenta", async () => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const r = await reconciliarPagos({
      almacen: almacenCon([orden("o1")]).almacen,
      buscarPagos: async () => [pago({ externalReference: null })],
      aplicar,
      ahora: AHORA,
    });
    expect(aplicar).not.toHaveBeenCalled();
    expect(r.sinPagoAprobado).toBe(1);
  });
});

describe("dinero: monto y moneda distintos NO se aplican y se reportan", () => {
  it.each([
    ["monto menor", { amount: 1 }],
    ["monto mayor", { amount: 4000 }],
    ["diferencia de un centavo", { amount: 398.99 }],
    ["monto ausente", { amount: null }],
    ["monto no numérico", { amount: Number.NaN }],
    ["moneda distinta", { currency: "USD" }],
    ["moneda ausente", { currency: null }],
  ])("%s", async (_n, cambio) => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const r = await reconciliarPagos({
      almacen: almacenCon([orden("o1", 399, "MXN")]).almacen,
      buscarPagos: async (ref) => [pago({ externalReference: ref, ...cambio })],
      aplicar,
      ahora: AHORA,
    });
    expect(aplicar).not.toHaveBeenCalled();
    expect(r).toMatchObject({ montoNoCoincide: 1, aplicadas: 0, sinPagoAprobado: 0 });
  });

  it("una orden de monto 0 NO acepta un pago sin monto (ausente no es lo mismo que cero)", async () => {
    // Sin esto, tomar el monto ausente por 0 pasaba en verde: todas las pruebas
    // usaban órdenes de 399, donde 0 ≠ 399 hacía fallar igual el caso.
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const r = await reconciliarPagos({
      almacen: almacenCon([orden("o1", 0, "MXN")]).almacen,
      buscarPagos: async (ref) => [pago({ externalReference: ref, amount: null })],
      aplicar,
      ahora: AHORA,
    });
    expect(aplicar).not.toHaveBeenCalled();
    expect(r.montoNoCoincide).toBe(1);
  });

  it("con varios aprobados, se aplica el que cuadra (no el primero a ciegas)", async () => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    await reconciliarPagos({
      almacen: almacenCon([orden("o1")]).almacen,
      buscarPagos: async (ref) => [
        pago({ id: "malo", externalReference: ref, amount: 1 }),
        pago({ id: "bueno", externalReference: ref, amount: 399 }),
      ],
      aplicar,
      ahora: AHORA,
    });
    expect(aplicar).toHaveBeenCalledWith(expect.objectContaining({ paymentId: "bueno" }));
  });
});

describe("la ventana de tiempo", () => {
  it("le pide al almacén órdenes más viejas que el margen y más nuevas que la ventana", async () => {
    const { almacen, llamadas } = almacenCon([]);
    await reconciliarPagos({ almacen, buscarPagos: async () => [], aplicar: aplicarOk, ahora: AHORA });
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].hasta.getTime()).toBe(AHORA.getTime() - MARGEN_MS);
    expect(llamadas[0].desde.getTime()).toBe(AHORA.getTime() - VENTANA_MS);
    expect(MARGEN_MS).toBe(10 * 60 * 1000);
    expect(VENTANA_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("el límite por corrida nunca excede el máximo, aunque se pida más", async () => {
    const { almacen, llamadas } = almacenCon([]);
    await reconciliarPagos({ almacen, buscarPagos: async () => [], aplicar: aplicarOk, ahora: AHORA, limite: 100000 });
    expect(llamadas[0].limite).toBe(MAX_ORDENES_POR_CORRIDA);
    await reconciliarPagos({ almacen, buscarPagos: async () => [], aplicar: aplicarOk, ahora: AHORA, limite: 5 });
    expect(llamadas[1].limite).toBe(5);
  });
});

describe("los fallos no se tragan ni se contagian", () => {
  it("si Mercado Pago falla con una orden, se cuenta y se sigue con las demás", async () => {
    const aplicar = vi.fn<AplicarPago>(aplicarOk);
    const buscar: BuscarPagos = async (ref) => {
      if (ref === "o1") throw new Error("MP caído");
      return [pago({ externalReference: ref })];
    };
    const r = await reconciliarPagos({ almacen: almacenCon([orden("o1"), orden("o2")]).almacen, buscarPagos: buscar, aplicar, ahora: AHORA });
    expect(r).toMatchObject({ revisadas: 2, errores: 1, aplicadas: 1, ordenesAplicadas: ["o2"] });
  });

  it("si aplicar devuelve ok:false, es un error (no una orden aplicada)", async () => {
    const r = await reconciliarPagos({
      almacen: almacenCon([orden("o1")]).almacen,
      buscarPagos: async (ref) => [pago({ externalReference: ref })],
      aplicar: async () => ({ ok: false, reason: "order_lookup_failed" }),
      ahora: AHORA,
    });
    expect(r).toMatchObject({ errores: 1, aplicadas: 0, ordenesAplicadas: [] });
  });

  it("si aplicar LANZA, es un error y no rompe la corrida", async () => {
    const r = await reconciliarPagos({
      almacen: almacenCon([orden("o1"), orden("o2")]).almacen,
      buscarPagos: async (ref) => [pago({ externalReference: ref })],
      aplicar: async ({ orderId }) => {
        if (orderId === "o1") throw new Error("boom");
        return { ok: true };
      },
      ahora: AHORA,
    });
    expect(r).toMatchObject({ errores: 1, aplicadas: 1, ordenesAplicadas: ["o2"] });
  });

  it("si el almacén falla, la corrida FALLA (no responde «0 revisadas» como si estuviera bien)", async () => {
    const almacen: AlmacenDeOrdenes = {
      async ordenesPendientes() {
        throw new Error("sin base");
      },
    };
    await expect(reconciliarPagos({ almacen, buscarPagos: async () => [], aplicar: aplicarOk, ahora: AHORA })).rejects.toThrow();
  });

  it("el resumen acota los ids que lista", async () => {
    const muchas = Array.from({ length: 40 }, (_, i) => orden(`o${i}`));
    const r = await reconciliarPagos({
      almacen: almacenCon(muchas).almacen,
      buscarPagos: async (ref) => [pago({ externalReference: ref })],
      aplicar: aplicarOk,
      ahora: AHORA,
    });
    expect(r.aplicadas).toBe(40);
    expect(r.ordenesAplicadas).toHaveLength(20);
  });
});
