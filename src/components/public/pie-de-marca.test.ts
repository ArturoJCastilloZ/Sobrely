import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PieDeMarca, enlaceDeMarca } from "./pie-de-marca";
import { PLANS } from "@/lib/billing/plans";
import { brandingForPlanCode } from "@/lib/billing/branding";

const pie = (branding: "full" | "reduced" | "none", enlazar?: boolean) =>
  renderToStaticMarkup(createElement(PieDeMarca, { branding, enlazar }));

describe("PieDeMarca", () => {
  it("plan con marca completa: «Hecho con Sobrely» enlazado a la home con UTM", () => {
    const html = pie("full");
    expect(html).toContain("Hecho con ");
    expect(html).toMatch(
      /<a href="[^"]*\/\?utm_source=invitacion&amp;utm_medium=pie&amp;utm_campaign=hecho-con-sobrely"/,
    );
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("plan reducido: solo «Sobrely», tenue, también enlazado", () => {
    const html = pie("reduced");
    expect(html).not.toContain("Hecho con");
    expect(html).toContain("opacity-35");
    expect(html).toContain("<a ");
  });

  it("plan sin marca: no hay pie ni enlace", () => {
    expect(pie("none")).toBe("");
  });

  it("vista previa: la marca se ve igual pero sin enlace", () => {
    const html = pie("full", false);
    expect(html).toContain("Hecho con ");
    expect(html).not.toContain("<a ");
  });

  it("los planes que hoy no muestran marca siguen sin enlace (según plans.ts)", () => {
    for (const plan of PLANS) {
      const html = pie(brandingForPlanCode(plan.code));
      expect(html.includes("<a "), plan.code).toBe(plan.branding !== "none");
    }
  });
});

describe("enlaceDeMarca", () => {
  it("lleva solo UTM fijas: nada del cliente ni del invitado", () => {
    const url = new URL(enlaceDeMarca("https://sobrely.com"));
    expect(url.origin + url.pathname).toBe("https://sobrely.com/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "invitacion",
      utm_medium: "pie",
      utm_campaign: "hecho-con-sobrely",
    });
  });
});
