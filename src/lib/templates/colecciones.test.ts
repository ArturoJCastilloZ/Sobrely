import { describe, expect, it } from "vitest";

import { COLECCIONES, coleccionDe, hrefColeccion } from "@/lib/templates/colecciones";
import { ESTILOS, ESTILO_POR_SLUG } from "@/lib/templates/estilos";

describe("colecciones por estilo", () => {
  it("hay una colección por cada estilo del catálogo, y solo esas", () => {
    expect(COLECCIONES.map((c) => c.clave)).toEqual(ESTILOS.map((e) => e.clave));
    expect(coleccionDe("no-existe")).toBeUndefined();
    expect(hrefColeccion("natural")).toBe("/plantillas/estilo/natural");
  });

  it("cada estilo tiene plantillas que mostrar", () => {
    const usados = new Set(Object.values(ESTILO_POR_SLUG));
    for (const c of COLECCIONES) expect(usados.has(c.clave), c.clave).toBe(true);
  });

  it("el texto es único: ningún campo se repite entre colecciones", () => {
    for (const campo of ["h1", "metaTitulo", "metaDescripcion", "intro", "cuandoElegirla"] as const) {
      const valores = COLECCIONES.map((c) => c[campo]);
      expect(new Set(valores).size, campo).toBe(valores.length);
    }
  });

  it("títulos y descripciones caben en el buscador (título + « · Sobrely» ≤ 60; descripción ≤ 160)", () => {
    for (const c of COLECCIONES) {
      expect(c.metaTitulo.length + " · Sobrely".length, c.clave).toBeLessThanOrEqual(60);
      expect(c.metaDescripcion.length, c.clave).toBeLessThanOrEqual(160);
    }
  });

  it("el texto no lleva cifras: los conteos salen del catálogo en vivo", () => {
    for (const c of COLECCIONES) {
      expect(`${c.intro} ${c.cuandoElegirla}`, c.clave).not.toMatch(/\d/);
    }
  });
});
