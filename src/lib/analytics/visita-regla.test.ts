import { describe, expect, it } from "vitest";
import {
  TOPE_EVENTOS_POR_MINUTO,
  claveVisita,
  esBot,
  mismoOrigen,
  parsearVisita,
  superaTope,
} from "./visita-regla";

const sesion = "0b6f2f1e-9a3c-4f1d-8e8a-1c2d3e4f5a6b";

describe("parsearVisita", () => {
  it("acepta una visita bien formada", () => {
    expect(parsearVisita({ evento: "view_template", sesion, valor: "xv-con-salon" })).toEqual({
      evento: "view_template", sesion, valor: "xv-con-salon",
    });
    expect(parsearVisita({ evento: "view_category", sesion, valor: "XV años" })?.valor).toBe("XV años");
  });

  it("rechaza eventos que no son de visita (no se puede falsificar una compra)", () => {
    for (const evento of ["purchase", "begin_checkout", "sign_up", "page_view", ""]) {
      expect(parsearVisita({ evento, sesion, valor: "x" })).toBeNull();
    }
  });

  it("rechaza sesión o valor mal formados", () => {
    expect(parsearVisita({ evento: "view_pricing", sesion: "corta", valor: "x" })).toBeNull();
    expect(parsearVisita({ evento: "view_pricing", sesion: "a".repeat(65), valor: "x" })).toBeNull();
    expect(parsearVisita({ evento: "view_pricing", sesion, valor: "" })).toBeNull();
    expect(parsearVisita({ evento: "view_pricing", sesion, valor: "x".repeat(81) })).toBeNull();
    expect(parsearVisita({ evento: "view_pricing", sesion, valor: "<script>" })).toBeNull();
    expect(parsearVisita({ evento: "view_pricing", sesion, valor: "a@b.com" })).toBeNull();
  });

  it("rechaza lo que no es objeto", () => {
    for (const x of [null, undefined, "x", 3, []]) expect(parsearVisita(x)).toBeNull();
  });
});

describe("claveVisita", () => {
  it("distingue por sesión y por valor", () => {
    const a = parsearVisita({ evento: "view_template", sesion, valor: "a" })!;
    const b = parsearVisita({ evento: "view_template", sesion, valor: "b" })!;
    expect(claveVisita(a)).not.toBe(claveVisita(b));
    expect(claveVisita(a)).toBe(claveVisita({ ...a }));
  });
});

describe("esBot", () => {
  it("filtra rastreadores, herramientas y la ausencia de agente", () => {
    for (const ua of [
      null, "", "Googlebot/2.1", "Mozilla/5.0 (compatible; bingbot/2.0)",
      "Mozilla/5.0 Chrome-Lighthouse", "curl/8.4.0", "facebookexternalhit/1.1",
      "Mozilla/5.0 HeadlessChrome/120", "WhatsApp/2.23",
    ]) expect(esBot(ua), String(ua)).toBe(true);
  });

  it("deja pasar navegadores normales", () => {
    expect(esBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(esBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36")).toBe(false);
  });
});

describe("mismoOrigen", () => {
  it("acepta solo el propio host y exige Origin", () => {
    expect(mismoOrigen("https://sobrely.com", "sobrely.com")).toBe(true);
    expect(mismoOrigen("https://evil.com", "sobrely.com")).toBe(false);
    expect(mismoOrigen(null, "sobrely.com")).toBe(false);
    expect(mismoOrigen("no-es-url", "sobrely.com")).toBe(false);
  });
});

describe("superaTope", () => {
  it("corta en el tope", () => {
    expect(superaTope(TOPE_EVENTOS_POR_MINUTO - 1)).toBe(false);
    expect(superaTope(TOPE_EVENTOS_POR_MINUTO)).toBe(true);
  });
});
