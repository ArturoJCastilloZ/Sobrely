import { describe, expect, it } from "vitest";
import {
  HERO_VARIANTS,
  heroConfigSchema,
  parcheDeComposicionDePortada,
} from "@/lib/modules/types";

/**
 * El selector de Composición de la portada.
 *
 * Lo que defiende: exponer `variant` sin fijar `imageRatio` reintroduce, para
 * el usuario, el recorte silencioso que la 0034, la 0035 y la 0038 pagaron en
 * las plantillas. `split` y `editorial` pintan la foto en una figura con
 * `object-fit: cover`, y con `imageRatio: "auto"` el renderer usa 3/4 o 4/3
 * HARDCODEADOS.
 */
describe("parcheDeComposicionDePortada", () => {
  it("hay 5 variantes que comprobar", () => {
    expect(HERO_VARIANTS.length).toBe(5);
  });

  const RETRATO = { w: 1600, h: 2400 }; // 2/3
  const PANORAMICA = { w: 1600, h: 900 }; // 16/9

  it.each([
    ["split", RETRATO, "2/3"],
    ["editorial", RETRATO, "2/3"],
    ["split", PANORAMICA, "16/9"],
    ["editorial", PANORAMICA, "16/9"],
  ] as const)(
    "%s con foto medida fija la proporcion de la FUENTE (%o -> %s)",
    (v, medida, esperada) => {
      expect(parcheDeComposicionDePortada(v, medida)).toEqual({
        variant: v,
        imageRatio: esperada,
      });
    },
  );

  it.each(["centered", "offset", "plain"] as const)(
    "%s devuelve imageRatio a `auto`, que es el valor retro-compatible",
    (v) => {
      expect(parcheDeComposicionDePortada(v, RETRATO)).toEqual({
        variant: v,
        imageRatio: "auto",
      });
    },
  );

  it("SIN medida no toca `imageRatio`: no se inventa un encuadre", () => {
    // El caso real: la foto no cargó (404, formato ilegible) o todavía no se ha
    // medido. Escribir una proporción aquí sería adivinar y recortar.
    for (const v of ["split", "editorial"] as const) {
      const p = parcheDeComposicionDePortada(v, null);
      expect(p).toEqual({ variant: v });
      expect("imageRatio" in p).toBe(false);
    }
  });

  it("una PANORAMICA en `split` ya NO se recorta a la mitad", () => {
    // Control del defecto concreto que esto evita. Sin el parche, `auto` deja
    // la figura en 3/4 (0.75) y una 16/9 (1.778) perderia el 58 % del ancho.
    const p = parcheDeComposicionDePortada("split", PANORAMICA);
    const [a, b] = String(p.imageRatio).split("/").map(Number);
    const caja = a / b;
    const fuente = PANORAMICA.w / PANORAMICA.h;
    const recorte = caja < fuente ? 1 - caja / fuente : 1 - fuente / caja;
    expect(Math.round(recorte * 100)).toBe(0);

    const conAuto = 3 / 4;
    const recorteViejo = 1 - conAuto / fuente;
    expect(Math.round(recorteViejo * 100)).toBe(58);
  });

  it("todo parche que produce lo acepta el esquema del hero", () => {
    // Si escribiera un `imageRatio` que el enum no admite, `parseConfig`
    // descartaria la config ENTERA del modulo al leerla.
    for (const v of HERO_VARIANTS) {
      for (const medida of [RETRATO, PANORAMICA, null]) {
        const p = parcheDeComposicionDePortada(v, medida);
        expect(() => heroConfigSchema.parse({ title: "x", ...p })).not.toThrow();
      }
    }
  });
});
