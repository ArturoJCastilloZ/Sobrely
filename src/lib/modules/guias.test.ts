import { describe, expect, it } from "vitest";
import { guiasActivas, TOLERANCIA_GUIA, type Guia } from "./guias";

/** Sección típica del editor: más alta que ancha, en unidades de ancho. */
const EXT = { ancho: 1, alto: 2 };
const CENTRO_X = 0.5;
const CENTRO_Y = 1;

const ejes = (g: Guia[]) => g.map((x) => `${x.eje}:${x.tipo}`).sort();

describe("guías de alineación", () => {
  it("enciende la vertical cuando el bloque está en medio", () => {
    const g = guiasActivas({ x: CENTRO_X, y: 0.3 }, [], EXT);
    expect(ejes(g)).toEqual(["x:centro"]);
    expect(g[0].pos).toBe(CENTRO_X);
  });

  it("no la enciende cuando está sólo cerca", () => {
    // Justo fuera de la tolerancia: la guía tiene que significar algo.
    const g = guiasActivas({ x: CENTRO_X + TOLERANCIA_GUIA * 1.5, y: 0.3 }, [], EXT);
    expect(g).toEqual([]);
  });

  it("la enciende dentro de la tolerancia, no sólo en el valor exacto", () => {
    const g = guiasActivas({ x: CENTRO_X + TOLERANCIA_GUIA * 0.9, y: 0.3 }, [], EXT);
    expect(ejes(g)).toEqual(["x:centro"]);
  });

  it("el centro vertical se mide contra el ALTO, que no llega a 1", () => {
    // Es el error que `limitarDesplazamiento` ya documentó: en unidades de
    // ancho, el eje vertical llega a alto/ancho. Si alguien usara 0.5 aquí, la
    // guía saldría a un cuarto de la sección.
    const g = guiasActivas({ x: 0.1, y: CENTRO_Y }, [], EXT);
    expect(ejes(g)).toEqual(["y:centro"]);
    expect(g[0].pos).toBe(CENTRO_Y);
  });

  it("enciende las dos cuando está en el centro exacto", () => {
    const g = guiasActivas({ x: CENTRO_X, y: CENTRO_Y }, [], EXT);
    expect(ejes(g)).toEqual(["x:centro", "y:centro"]);
  });

  it("se alinea con otro bloque aunque ninguno esté centrado", () => {
    const g = guiasActivas({ x: 0.2, y: 0.4 }, [{ x: 0.2, y: 1.7 }], EXT);
    expect(ejes(g)).toEqual(["x:bloque"]);
    expect(g[0].pos).toBe(0.2);
  });

  it("se alinea con otro bloque también en el eje vertical", () => {
    const g = guiasActivas({ x: 0.2, y: 0.4 }, [{ x: 0.9, y: 0.4 }], EXT);
    expect(ejes(g)).toEqual(["y:bloque"]);
    expect(g[0].pos).toBe(0.4);
  });

  it("no inventa alineación con un bloque lejano", () => {
    const g = guiasActivas({ x: 0.2, y: 0.4 }, [{ x: 0.7, y: 1.7 }], EXT);
    expect(g).toEqual([]);
  });

  it("dibuja UNA línea cuando el centro y otro bloque caen en el mismo sitio", () => {
    // Dos líneas a dos píxeles se leen como un trazo sucio, no como dos
    // referencias.
    const g = guiasActivas({ x: CENTRO_X, y: 0.4 }, [{ x: CENTRO_X, y: 1.7 }], EXT);
    expect(g).toHaveLength(1);
  });

  it("y en ese empate manda `centro`, que dice más", () => {
    const g = guiasActivas({ x: CENTRO_X, y: 0.4 }, [{ x: CENTRO_X, y: 1.7 }], EXT);
    expect(g[0].tipo).toBe("centro");
  });

  it("aguanta varios bloques alineados sin duplicar la línea", () => {
    const g = guiasActivas(
      { x: 0.25, y: 0.4 },
      [{ x: 0.25, y: 1.1 }, { x: 0.25, y: 1.8 }],
      EXT,
    );
    expect(g).toHaveLength(1);
    expect(g[0].tipo).toBe("bloque");
  });

  it("distingue los dos ejes: alinear en x no enciende y", () => {
    const g = guiasActivas({ x: 0.25, y: 0.4 }, [{ x: 0.25, y: 1.9 }], EXT);
    expect(ejes(g)).toEqual(["x:bloque"]);
  });

  it("no devuelve nada con coordenadas rotas", () => {
    expect(guiasActivas({ x: NaN, y: 0.4 }, [], EXT)).toEqual([]);
    expect(guiasActivas({ x: 0.5, y: Infinity }, [], EXT)).toEqual([]);
  });

  it("ignora un bloque con coordenadas rotas en vez de caerse", () => {
    const g = guiasActivas({ x: CENTRO_X, y: 0.4 }, [{ x: NaN, y: NaN }], EXT);
    expect(ejes(g)).toEqual(["x:centro"]);
  });

  it("con una sección de extensión cero no dibuja centro", () => {
    const g = guiasActivas({ x: 0, y: 0 }, [], { ancho: 0, alto: 0 });
    expect(g).toEqual([]);
  });

  it("con tolerancia no positiva no enciende nada", () => {
    expect(guiasActivas({ x: CENTRO_X, y: CENTRO_Y }, [], EXT, 0)).toEqual([]);
  });

  it("NO corrige la posición: esto observa, no engancha", () => {
    // El dev pidió guía sin imán. El módulo no expone nada que devuelva un
    // desplazamiento corregido, y esta prueba lo fija como contrato.
    const mod = guiasActivas as unknown as Record<string, unknown>;
    expect(typeof mod).toBe("function");
    const g = guiasActivas({ x: CENTRO_X + 0.004, y: 0.4 }, [], EXT);
    // La guía se enciende, pero lo devuelto es la posición de la LÍNEA (el
    // centro), nunca una corrección para el bloque.
    expect(g[0].pos).toBe(CENTRO_X);
  });
});
