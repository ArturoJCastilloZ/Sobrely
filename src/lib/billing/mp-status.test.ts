import { describe, it, expect } from "vitest";

import { mapStatus, isRedundantTransition } from "@/lib/billing/mp-status";

describe("mapStatus (MP → estado interno de orden)", () => {
  it("approved → paid", () => {
    expect(mapStatus("approved")).toBe("paid");
  });

  it("authorized / in_process / pending → pending", () => {
    expect(mapStatus("authorized")).toBe("pending");
    expect(mapStatus("in_process")).toBe("pending");
    expect(mapStatus("pending")).toBe("pending");
  });

  it("rejected → failed", () => {
    expect(mapStatus("rejected")).toBe("failed");
  });

  it("cancelled → cancelled", () => {
    expect(mapStatus("cancelled")).toBe("cancelled");
  });

  it("refunded / charged_back → refunded", () => {
    expect(mapStatus("refunded")).toBe("refunded");
    expect(mapStatus("charged_back")).toBe("refunded");
  });

  it("estado desconocido → pending (conservador, no activa nada)", () => {
    expect(mapStatus("algo_raro")).toBe("pending");
  });
});

describe("isRedundantTransition (idempotencia + reembolso)", () => {
  it("duplicado exacto se ignora", () => {
    expect(isRedundantTransition("paid", "paid")).toBe(true);
    expect(isRedundantTransition("pending", "pending")).toBe(true);
    expect(isRedundantTransition("refunded", "refunded")).toBe(true);
  });

  it("una orden pagada NO se degrada por notificación tardía", () => {
    expect(isRedundantTransition("paid", "pending")).toBe(true);
    expect(isRedundantTransition("paid", "failed")).toBe(true);
    expect(isRedundantTransition("paid", "cancelled")).toBe(true);
  });

  it("un reembolso SÍ se procesa aunque la orden esté pagada", () => {
    expect(isRedundantTransition("paid", "refunded")).toBe(false);
  });

  it("transiciones normales de una orden pendiente se procesan", () => {
    expect(isRedundantTransition("pending", "paid")).toBe(false);
    expect(isRedundantTransition("pending", "refunded")).toBe(false);
    expect(isRedundantTransition("pending", "failed")).toBe(false);
  });
});
