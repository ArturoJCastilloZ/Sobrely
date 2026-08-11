import { describe, it, expect, afterEach, vi } from "vitest";

import { formatPrice, isLaunchCampaignActive } from "@/lib/billing/config";

describe("formatPrice", () => {
  it("formatea MXN sin decimales", () => {
    const s = formatPrice(399, "MXN");
    expect(s).toContain("399");
    // Intl es-MX usa el símbolo $; sin fracción.
    expect(s).not.toContain(".00");
  });
});

describe("isLaunchCampaignActive (env por defecto)", () => {
  it("activa por defecto (enabled=true, sin fecha de corte)", () => {
    expect(isLaunchCampaignActive(new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });
});

describe("isLaunchCampaignActive con fecha de corte (import dinámico)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("false cuando 'now' es posterior a la fecha de corte", async () => {
    vi.stubEnv("NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE", "2026-01-31");
    vi.resetModules();
    const mod = await import("@/lib/billing/config");
    // 'now' bien pasada la fecha de corte (evita ambigüedad de timezone en el
    // límite: la fecha de corte se interpreta a fin de día en hora local).
    expect(mod.isLaunchCampaignActive(new Date("2026-03-01T00:00:00Z"))).toBe(
      false,
    );
  });

  it("true cuando 'now' es anterior o igual a la fecha de corte", async () => {
    vi.stubEnv("NEXT_PUBLIC_LAUNCH_CAMPAIGN_END_DATE", "2026-12-31");
    vi.resetModules();
    const mod = await import("@/lib/billing/config");
    expect(mod.isLaunchCampaignActive(new Date("2026-06-01T00:00:00Z"))).toBe(
      true,
    );
  });
});

describe("REFERRAL_CREDIT_AMOUNT parsing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("usa el valor del env cuando es válido", async () => {
    vi.stubEnv("NEXT_PUBLIC_REFERRAL_CREDIT_MXN", "120");
    vi.resetModules();
    const mod = await import("@/lib/billing/config");
    expect(mod.REFERRAL_CREDIT_AMOUNT).toBe(120);
  });

  it("cae al default 50 cuando el env es inválido", async () => {
    vi.stubEnv("NEXT_PUBLIC_REFERRAL_CREDIT_MXN", "no-un-numero");
    vi.resetModules();
    const mod = await import("@/lib/billing/config");
    expect(mod.REFERRAL_CREDIT_AMOUNT).toBe(50);
  });
});
