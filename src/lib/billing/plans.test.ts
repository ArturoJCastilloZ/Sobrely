import { describe, it, expect } from "vitest";

import {
  getPlan,
  getEffectivePrice,
  isOnLaunchOffer,
  planAllowsModule,
  premiumModulesFor,
  minimalPlanForModules,
  minimalPlanForFeature,
  resolveExpiry,
} from "@/lib/billing/plans";

const DAY = 24 * 60 * 60 * 1000;

describe("resolveExpiry", () => {
  const free = getPlan("free")!;
  const celebracion = getPlan("celebracion")!;

  it("Free: siempre demo desde la publicación (ignora la fecha de evento)", () => {
    const publishedAt = new Date("2026-01-01T00:00:00Z");
    const eventDate = new Date("2026-06-01T00:00:00Z");
    const exp = resolveExpiry(free, publishedAt, eventDate);
    // publishedAt + fallbackDurationDays (14) — NO event+grace.
    expect(exp.getTime()).toBe(
      publishedAt.getTime() + free.fallbackDurationDays * DAY,
    );
  });

  it("Pagado con fecha de evento: evento + margen (grace)", () => {
    const publishedAt = new Date("2026-01-01T00:00:00Z");
    const eventDate = new Date("2026-06-01T00:00:00Z");
    const exp = resolveExpiry(celebracion, publishedAt, eventDate);
    expect(celebracion.graceDaysAfterEvent).not.toBeNull();
    expect(exp.getTime()).toBe(
      eventDate.getTime() + celebracion.graceDaysAfterEvent! * DAY,
    );
  });

  it("Pagado sin fecha de evento: fallback desde la publicación", () => {
    const publishedAt = new Date("2026-01-01T00:00:00Z");
    const exp = resolveExpiry(celebracion, publishedAt, null);
    expect(exp.getTime()).toBe(
      publishedAt.getTime() + celebracion.fallbackDurationDays * DAY,
    );
  });
});

describe("planAllowsModule / premiumModulesFor", () => {
  const free = getPlan("free")!;
  const premium = getPlan("premium")!;

  it("Free permite hero pero no video", () => {
    expect(planAllowsModule(free, "hero")).toBe(true);
    expect(planAllowsModule(free, "video")).toBe(false);
  });

  it("premiumModulesFor(free) incluye los módulos fuera de Free", () => {
    const locked = premiumModulesFor(free);
    expect(locked).toContain("video");
    expect(locked).toContain("gallery");
    expect(locked).not.toContain("hero");
  });

  it("Premium no tiene módulos bloqueados", () => {
    expect(premiumModulesFor(premium)).toHaveLength(0);
  });
});

describe("minimalPlanForModules", () => {
  it("hero → Free (el más barato que lo cubre)", () => {
    expect(minimalPlanForModules(["hero"])?.code).toBe("free");
  });

  it("gallery → Celebración (el mínimo que lo incluye)", () => {
    expect(minimalPlanForModules(["gallery"])?.code).toBe("celebracion");
  });

  it("video → Premium", () => {
    expect(minimalPlanForModules(["video"])?.code).toBe("premium");
  });
});

describe("minimalPlanForFeature", () => {
  it("advanced_personalization → Celebración (el más barato que la incluye)", () => {
    expect(minimalPlanForFeature("advanced_personalization")?.code).toBe(
      "celebracion",
    );
  });

  it("csv_export → Esencial (el más barato que la incluye)", () => {
    expect(minimalPlanForFeature("csv_export")?.code).toBe("esencial");
  });

  it("priority_support → Premium", () => {
    expect(minimalPlanForFeature("priority_support")?.code).toBe("premium");
  });
});

describe("precios de campaña (env por defecto: lanzamiento activo)", () => {
  const celebracion = getPlan("celebracion")!;

  it("getEffectivePrice devuelve el precio de lanzamiento", () => {
    // Sin env de corte, la campaña está activa por defecto.
    expect(getEffectivePrice(celebracion)).toBe(celebracion.priceLaunch);
  });

  it("isOnLaunchOffer true cuando launch < regular", () => {
    expect(celebracion.priceLaunch).toBeLessThan(celebracion.priceRegular);
    expect(isOnLaunchOffer(celebracion)).toBe(true);
  });
});
