import { describe, it, expect } from "vitest";

import {
  getPlan,
  getEffectivePrice,
  isOnLaunchOffer,
  planAllowsModule,
  planHasFeature,
  premiumModulesFor,
  minimalPlanForModules,
  minimalPlanForFeature,
  resolveExpiry,
  getActivePlans,
} from "@/lib/billing/plans";
import { COMPARISON_ROWS, featureLabel } from "@/lib/billing/features";

const DAY = 24 * 60 * 60 * 1000;

describe("guest_management (lista de invitados, todos los planes)", () => {
  it("todos los planes incluyen guest_management (se diferencia por maxGuests)", () => {
    expect(planHasFeature(getPlan("premium")!, "guest_management")).toBe(true);
    expect(planHasFeature(getPlan("celebracion")!, "guest_management")).toBe(
      true,
    );
    expect(planHasFeature(getPlan("esencial")!, "guest_management")).toBe(true);
    expect(planHasFeature(getPlan("free")!, "guest_management")).toBe(true);
  });

  it("el plan mínimo que la ofrece es Free (está en todos)", () => {
    expect(minimalPlanForFeature("guest_management")?.code).toBe("free");
  });
});

describe("custom_art (arte propio) vive en Celebración", () => {
  it("Celebración y Premium lo incluyen; Free y Esencial no", () => {
    expect(planHasFeature(getPlan("celebracion")!, "custom_art")).toBe(true);
    expect(planHasFeature(getPlan("premium")!, "custom_art")).toBe(true);
    expect(planHasFeature(getPlan("free")!, "custom_art")).toBe(false);
    expect(planHasFeature(getPlan("esencial")!, "custom_art")).toBe(false);
  });

  it("el plan mínimo que lo desbloquea es Celebración", () => {
    // Esto es lo que alimenta el CTA al publicar Y la insignia del editor:
    // ambos leen `minimalPlanForFeature`, no un nombre escrito a mano.
    expect(minimalPlanForFeature("custom_art")?.code).toBe("celebracion");
  });
});

describe("invariantes de la escalera de planes", () => {
  const ordered = getActivePlans();

  it("las capacidades solo se acumulan: nada se pierde al subir de plan", () => {
    // Atrapa la clase de error, no solo un caso: mover una feature a un plan
    // más barato y OLVIDAR dejarla en los de arriba dejaría a quien pagó más
    // con menos. Pasó a un dedo de ocurrir al bajar `custom_art`.
    for (let i = 1; i < ordered.length; i++) {
      const cheaper = ordered[i - 1];
      const pricier = ordered[i];
      for (const feature of cheaper.features) {
        expect(
          pricier.features,
          `${pricier.code} (más caro que ${cheaper.code}) perdió "${feature}"`,
        ).toContain(feature);
      }
    }
  });

  it("los módulos permitidos solo se acumulan", () => {
    for (let i = 1; i < ordered.length; i++) {
      for (const mod of ordered[i - 1].allowedModules) {
        expect(
          ordered[i].allowedModules,
          `${ordered[i].code} perdió el módulo "${mod}"`,
        ).toContain(mod);
      }
    }
  });

  it("toda capacidad cobrada aparece en la comparativa de precios", () => {
    // `custom_art` estaba en las features de Premium pero NO en
    // COMPARISON_ROWS: se cobraba una capacidad que la página de precios
    // jamás mencionaba. Nadie paga por lo que no ve.
    const shown = new Set(COMPARISON_ROWS.map((r) => r.label));
    const sold = new Set<string>();
    for (const plan of ordered) {
      for (const f of plan.features) sold.add(featureLabel(f));
      for (const f of plan.comingSoon) sold.add(featureLabel(f));
    }
    for (const label of sold) {
      expect(
        [...shown],
        `la comparativa de /pricing no muestra "${label}"`,
      ).toContain(label);
    }
  });
});

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
