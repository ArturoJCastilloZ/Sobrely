import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { billingPitch } from "@/lib/billing/value-prop";
import { getActivePlans, getEffectivePrice, getPlan } from "@/lib/billing/plans";
import { formatPrice } from "@/lib/billing/config";

/**
 * Fase 3: se quitó la demo de 14 días. Estas pruebas estaban ACOPLADAS al demo
 * (exigían que el copy dijera «demo» y el número de días); cambian a propósito.
 * Lo que defienden ahora es lo contrario: que el copy NO prometa publicar gratis,
 * y que el precio salga de los planes y no se escriba a mano.
 */
const planesDePago = getActivePlans().filter((p) => p.billingType === "per_event");
const minimo = Math.min(...planesDePago.map((p) => getEffectivePrice(p)));

describe("billingPitch · se deriva de los planes, no se escribe a mano", () => {
  it("el precio «desde» es el del plan de pago MÁS BARATO", () => {
    expect(billingPitch().desdePrecio).toBe(formatPrice(minimo, planesDePago[0].currency));
  });

  it("el precio aparece en el copy, así que un cambio de precios lo arrastra", () => {
    const pitch = billingPitch();
    const precio = pitch.desdePrecio!;
    expect(pitch.micro).toContain(precio);
    expect(pitch.long).toContain(precio);
    expect(pitch.faqAnswer).toContain(precio);
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

describe("billingPitch · exactitud del mensaje (la frase que se INVIRTIÓ)", () => {
  const pitch = billingPitch();
  const textos = [pitch.micro, pitch.long, pitch.faqAnswer];

  it("ya NO promete una demo ni publicar gratis: eso dejó de ser cierto", () => {
    for (const text of textos) {
      expect(text.toLowerCase(), text).not.toContain("demo");
      expect(text.toLowerCase(), text).not.toMatch(/publica[^.]{0,20}gratis|gratis[^.]{0,20}public/);
    }
  });

  it("dice que se paga AL PUBLICAR", () => {
    for (const text of textos) {
      expect(text.toLowerCase(), text).toContain("publicar");
    }
  });

  it("no promete un precio único: dice «desde» y que depende de los módulos", () => {
    expect(pitch.micro).toContain("desde");
    expect(pitch.faqAnswer).toContain("depende de los módulos");
  });

  it("el FAQ dice que el precio exacto se ve antes de pagar, y eso tiene que ser cierto", () => {
    // La galería muestra el precio por plantilla y el checkout muestra el de la
    // invitación. Si alguien quitara cualquiera de los dos, esta frase mentiría.
    expect(pitch.faqAnswer).toContain("antes de pagar");
    expect(readFileSync("src/lib/billing/precio-plantilla.ts", "utf8")).toContain(
      "precioParaPublicarPlantilla",
    );
    expect(readFileSync("src/app/billing/checkout/page.tsx", "utf8")).toContain(
      "getEffectivePrice",
    );
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

describe("el plan Free ya no vende una publicación", () => {
  const free = getPlan("free")!;

  it("no tiene días de demo", () => {
    expect(free.publishTrialDays).toBeNull();
  });

  it("ninguno de sus textos promete publicar", () => {
    const textos = [free.tagline, free.description, ...free.highlights];
    for (const t of textos) {
      expect(t.toLowerCase(), t).not.toContain("demo");
      expect(t.toLowerCase(), t).not.toMatch(/publicaci[oó]n demo|publica[^.]*gratis/);
    }
  });

  it("la tabla comparativa no inventa «0 meses» de vigencia para Free", () => {
    const fuente = readFileSync("src/lib/billing/features.ts", "utf8");
    expect(fuente).toContain("Solo borradores");
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

  it("las páginas no escriben el precio a mano", () => {
    const precio = formatPrice(minimo, planesDePago[0].currency);
    for (const file of [
      "src/app/page.tsx",
      "src/components/seo/event-landing.tsx",
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} escribe "${precio}" a mano`).not.toContain(precio);
    }
  });
});
