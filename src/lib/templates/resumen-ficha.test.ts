import { describe, expect, it } from "vitest";
import { PLANS } from "@/lib/billing/plans";
import { MODULE_META } from "@/lib/modules/types";
import { resumenDeFicha, textoDeInvitados, textoDeMarca, textoDeVigencia } from "./resumen-ficha";

describe("resumenDeFicha", () => {
  const de = (code: Parameters<typeof resumenDeFicha>[1]) =>
    resumenDeFicha(["hero", "countdown", "map", "rsvp"], code);

  it("lista los módulos con su etiqueta, en el orden recibido", () => {
    expect(de("esencial")?.modulos).toEqual(
      (["hero", "countdown", "map", "rsvp"] as const).map((m) => MODULE_META[m].label),
    );
  });

  it.each(PLANS.filter((p) => p.billingType === "per_event").map((p) => [p.code] as const))(
    "el plan %s dice el tope de invitados, la vigencia y la marca que declara plans.ts",
    (code) => {
      const plan = PLANS.find((p) => p.code === code)!;
      const r = de(code)!;
      expect(r.plan.nombre).toBe(plan.name);
      if (plan.maxGuests === null) expect(r.plan.invitados).toBe("Invitados ilimitados");
      else expect(r.plan.invitados).toContain(String(plan.maxGuests));
      expect(r.plan.vigencia).toContain(String(plan.graceDaysAfterEvent));
      expect(r.plan.marca).toBe(textoDeMarca(plan.branding));
    },
  );

  it("un plan desconocido o el gratuito (sin vigencia posterior al evento) no genera resumen", () => {
    expect(resumenDeFicha(["hero"], "no-existe" as never)).toBeNull();
    expect(resumenDeFicha(["hero"], "free")).toBeNull();
  });
});

describe("textos", () => {
  it("invitados, vigencia y marca", () => {
    expect(textoDeInvitados(100)).toBe("Hasta 100 invitados");
    expect(textoDeInvitados(null)).toBe("Invitados ilimitados");
    expect(textoDeVigencia(30)).toBe("Publicada hasta 30 días después de tu evento");
    expect(textoDeVigencia(null)).toBeNull();
    expect(textoDeMarca("none")).toBe("Sin marca de Sobrely");
    expect(textoDeMarca("reduced")).toBe("Con marca discreta de Sobrely");
    expect(textoDeMarca("full")).toBe("Con la marca de Sobrely");
  });
});
