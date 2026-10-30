import { describe, expect, it } from "vitest";
import { CACHE_OG_DE_INVITACION, imagenDeInvitacion } from "./imagen-invitacion";
import { imagenGenerica } from "./imagen-generica";
import type { DatosParaCompartir } from "./compartir-invitacion";

/**
 * Cabeceras de la respuesta REAL de `next/og` (sin mocks; no se lee el cuerpo,
 * así que no se rasteriza). La tarjeta de una invitación cambia al
 * despublicarla, al caducar o al editar título y fecha: su caché va explícita
 * (`CACHE_OG_DE_INVITACION`) y no queda al valor por defecto de la librería.
 */
const DATOS: DatosParaCompartir = {
  titulo: "Valeria y Mateo",
  tipoEvento: "Boda",
  fecha: "sábado, 12 de diciembre de 2026",
  colores: { fondo: "#fbf7ef", texto: "#2b2b2b", primario: "#8a6d3b" },
  conMarca: true,
};

describe("cache-control de las imágenes OG", () => {
  it("el valor elegido no es inmutable, no cachea en la CDN y revalida", () => {
    expect(CACHE_OG_DE_INVITACION).toBe("public, max-age=0, must-revalidate");
    expect(CACHE_OG_DE_INVITACION).not.toContain("immutable");
    expect(CACHE_OG_DE_INVITACION).not.toContain("s-maxage");
  });

  it("invitación con datos → caché corta explícita, sin `immutable`", async () => {
    const r = await imagenDeInvitacion(DATOS, { fuentes: undefined });
    expect(r.headers.get("cache-control")).toBe(CACHE_OG_DE_INVITACION);
  });

  it("invitación sin datos (genérica de la ruta) → la misma caché corta", async () => {
    const r = await imagenDeInvitacion(null, { fuentes: undefined });
    expect(r.headers.get("cache-control")).toBe(CACHE_OG_DE_INVITACION);
  });

  it("la genérica de la raíz (contenido fijo) queda con el valor por defecto de next/og, nunca inmutable", () => {
    const r = imagenGenerica(undefined);
    expect(r.headers.get("cache-control")).not.toContain("immutable");
    expect(r.headers.get("cache-control")).not.toContain("s-maxage");
  });
});
