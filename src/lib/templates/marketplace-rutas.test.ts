import { describe, expect, it } from "vitest";
import {
  hrefUsarPlantillaSinSesion,
  hrefVistaPlantilla,
  rutaUsarPlantilla,
} from "@/lib/templates/marketplace";

describe("rutas de la galería pública", () => {
  it("la vista de venta es /plantillas/<slug>, NUNCA /plantilla/ (la de captura)", () => {
    const href = hrefVistaPlantilla("boda-elegante");
    expect(href).toBe("/plantillas/boda-elegante");
    expect(href.startsWith("/plantilla/")).toBe(false);
  });

  it("un slug raro no rompe la ruta ni se escapa de ella", () => {
    expect(hrefVistaPlantilla("a b/../x")).toBe("/plantillas/a%20b%2F..%2Fx");
  });

  it("la ruta de «usar» es la vista de venta con la señal ?usar=1", () => {
    expect(rutaUsarPlantilla("boda-elegante")).toBe("/plantillas/boda-elegante?usar=1");
  });

  it("sin sesión, el registro recibe esa ruta como `next` ya codificado", () => {
    const href = hrefUsarPlantillaSinSesion("boda-elegante");
    expect(href).toBe("/register?next=%2Fplantillas%2Fboda-elegante%3Fusar%3D1");
    const next = new URL(href, "https://sobrely.test").searchParams.get("next");
    expect(next).toBe("/plantillas/boda-elegante?usar=1");
  });

  it("el `next` es siempre una ruta interna (no puede apuntar a otro host)", () => {
    for (const slug of ["x", "//evil.com", "https://evil.com", "..%2F"]) {
      const next = new URL(hrefUsarPlantillaSinSesion(slug), "https://sobrely.test")
        .searchParams.get("next")!;
      expect(next.startsWith("/plantillas/")).toBe(true);
      expect(next.startsWith("//")).toBe(false);
    }
  });
});
