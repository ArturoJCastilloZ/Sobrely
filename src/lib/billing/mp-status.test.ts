import { describe, it, expect } from "vitest";

import { mapStatus } from "@/lib/billing/mp-status";

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
