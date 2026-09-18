import { describe, expect, it } from "vitest";
import {
  MEDIA_FOCALS,
  MEDIA_FOCAL_LABELS,
  MEDIA_POSITIONS,
  MEDIA_POSITION_LABELS,
  MEDIA_RATIOS,
  MEDIA_RATIO_LABELS,
  MEDIA_SHAPES,
  MEDIA_SHAPE_LABELS,
  MODULE_TYPES,
  moduleConfigSchemas,
  tieneSlotDeMedia,
} from "@/lib/modules/types";

/**
 * Quien expone el slot de imagen, medido contra el ESQUEMA y no contra una
 * lista. Es la prueba gemela de `composicion-expuesta.test.ts`, y existe por el
 * mismo motivo: un modulo nuevo que use `objetoConLayout` hereda la UI, y si
 * alguien se la quita sin querer, esto se pone rojo.
 */
describe("que modulos exponen el slot de imagen", () => {
  it("`hero` NO lo tiene: compone su imagen con `variant` e `imageUrl`", () => {
    expect(tieneSlotDeMedia("hero")).toBe(false);
  });

  it("los otros 11 SI lo tienen", () => {
    const sin = MODULE_TYPES.filter((t) => !tieneSlotDeMedia(t));
    expect(sin).toEqual(["hero"]);
  });

  it.each(MODULE_TYPES.filter((t) => t !== "hero").map((t) => [t] as const))(
    "%s: el esquema acepta las perillas del slot de verdad",
    (tipo) => {
      // No basta con que la clave exista: tiene que PARSEAR. Si solo mirara el
      // shape, un valor que la UI escribe y el esquema rechaza se perderia en
      // silencio al recargar.
      const leido = moduleConfigSchemas[tipo].parse({
        media: {
          url: "https://cdn.ejemplo.com/x.jpg",
          alt: "Una foto",
          position: "left",
          ratio: "16/9",
          focal: "top",
          overlay: 0.4,
          shape: "arch",
        },
      }) as { media: Record<string, unknown> };
      expect(leido.media).toEqual({
        url: "https://cdn.ejemplo.com/x.jpg",
        alt: "Una foto",
        position: "left",
        ratio: "16/9",
        focal: "top",
        overlay: 0.4,
        shape: "arch",
      });
    },
  );
});

/**
 * Cada opcion que el panel ofrece tiene rotulo. Sin esto, anadir un valor al
 * enum deja un `<SelectItem>` con el texto `undefined` en produccion — y la
 * suite seguiria verde, porque nada mas mira estas tablas.
 */
describe("los rotulos cubren todas las opciones", () => {
  it.each([
    ["posiciones", MEDIA_POSITIONS, MEDIA_POSITION_LABELS],
    ["proporciones", MEDIA_RATIOS, MEDIA_RATIO_LABELS],
    ["formas", MEDIA_SHAPES, MEDIA_SHAPE_LABELS],
    ["puntos focales", MEDIA_FOCALS, MEDIA_FOCAL_LABELS],
  ] as const)("%s", (_nombre, valores, rotulos) => {
    const sinRotulo = (valores as readonly string[]).filter(
      (v) => !(rotulos as Record<string, string>)[v],
    );
    expect(sinRotulo).toEqual([]);
  });
});
