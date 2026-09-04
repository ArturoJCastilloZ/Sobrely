import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { billingPitch } from "@/lib/billing/value-prop";
import { getPlan } from "@/lib/billing/plans";

describe("billingPitch · se deriva del plan, no se escribe a mano", () => {
  const free = getPlan("free")!;

  it("los días de demo salen de publishTrialDays", () => {
    expect(billingPitch().demoDays).toBe(free.publishTrialDays);
  });

  it("el número aparece en el copy, así que un cambio de plan lo arrastra", () => {
    const pitch = billingPitch();
    const days = String(free.publishTrialDays);
    expect(pitch.micro).toContain(days);
    expect(pitch.long).toContain(days);
    expect(pitch.faqAnswer).toContain(days);
  });

  it("ningún texto queda vacío", () => {
    const pitch = billingPitch();
    for (const [key, value] of Object.entries(pitch)) {
      if (typeof value === "string") {
        expect(value.trim(), `${key} vacío`).not.toBe("");
      }
    }
  });
});

describe("billingPitch · exactitud del mensaje", () => {
  // El plan Free SÍ publica (demo con marca). Un copy que diga o insinúe que
  // publicar exige pagar es falso, y es justo la simplificación tentadora.
  const pitch = billingPitch();

  it("reconoce que publicar gratis es posible", () => {
    for (const text of [pitch.micro, pitch.long, pitch.faqAnswer]) {
      expect(text.toLowerCase(), text).toContain("demo");
    }
  });

  it("el FAQ dice que la demo lleva la marca de Sobrely", () => {
    // Prometer "gratis" sin decir que va con marca sería vender de más.
    expect(pitch.faqAnswer.toLowerCase()).toContain("marca");
  });

  it("no promete ausencia de cobro recurrente sin ser cierto", () => {
    // `billingType` es "per_event" en todos los planes de pago; la promesa de
    // "sin suscripción" solo es válida mientras eso siga así.
    const paid = (["esencial", "celebracion", "premium"] as const).map(
      (c) => getPlan(c)!,
    );
    expect(paid.every((p) => p.billingType === "per_event")).toBe(true);
    expect(pitch.faqAnswer.toLowerCase()).toContain("suscripción");
  });
});

describe("cableado: el pitch llega al tope del embudo", () => {
  // La función puede estar perfecta y el mensaje seguir ausente si nadie la
  // usa — que era exactamente el estado anterior.
  it("la home lo muestra bajo el CTA y en el FAQ", () => {
    const src = readFileSync("src/app/page.tsx", "utf8");
    expect(src).toContain("billingPitch");
    expect(src).toContain("pitch.micro");
    expect(src).toContain("billingPitch().faqAnswer");
  });

  it("las landings de evento lo muestran bajo sus CTA", () => {
    const src = readFileSync("src/components/seo/event-landing.tsx", "utf8");
    expect(src).toContain("billingPitch().micro");
  });

  it("el copy no repite el número de días a mano en las páginas", () => {
    const days = String(getPlan("free")!.publishTrialDays);
    for (const file of [
      "src/app/page.tsx",
      "src/components/seo/event-landing.tsx",
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} escribe "${days} días" a mano`).not.toContain(
        `${days} días`,
      );
    }
  });
});
