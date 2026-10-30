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

  it("plan reducido: solo «Sobrely», más chico, también enlazado", () => {
    const html = pie("reduced");
    expect(html).not.toContain("Hecho con");
    expect(html).toContain("text-[10px]");
    expect(html).toContain("<a ");
  });

  /*
    4.5:1 (WCAG 1.4.3) del texto del enlace sobre el fondo de la invitación.
    Medido con las 22 paletas (20 theme packs + claro/oscuro por defecto): el
    peor caso, `kawaii` (#5a4a52 sobre #fff7fb), pide opacidad ≥ 0.79; con 0.80
    da 4.66:1. Con la de antes (0.35) ninguna pasaba de 2.1:1.
  */
  it.each(["full", "reduced"] as const)(
    "%s: el enlace no baja de opacity-80 (4.5:1 en todas las paletas)",
    (branding) => {
      const clase = /<a [^>]*class="([^"]*)"/.exec(pie(branding))?.[1] ?? "";
      const opacidades = [...clase.matchAll(/(?:^|\s)opacity-(\d+)/g)].map((m) => Number(m[1]));
      expect(opacidades.length).toBeGreaterThan(0);
      expect(Math.min(...opacidades)).toBeGreaterThanOrEqual(80);
    },
  );

  it.each(["full", "reduced"] as const)(
    "%s: avisa al lector de pantalla de que abre otra pestaña",
    (branding) => {
      expect(pie(branding)).toMatch(
        /<a [^>]*>.*<span class="sr-only"> \(se abre en otra pestaña\)<\/span><\/a>/,
      );
    },
  );

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
