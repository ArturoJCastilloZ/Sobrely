import { describe, expect, it } from "vitest";
import {
  MEDIA_RATIOS,
  proporcionMasCercana,
} from "@/lib/modules/types";

/**
 * Pre-vuelo del selector de composición del editor.
 *
 * Por qué existe: el editor va a exponer `variant`, y `split`/`editorial`
 * pintan la foto en una FIGURA con `object-fit: cover`. Si la proporción no es
 * la de la fuente, recorta EN SILENCIO — es el defecto que la 0034, la 0035 y
 * la 0038 pagaron, y exponer la perilla sin esto lo trasladaría al usuario.
 */
describe("proporcionMasCercana", () => {
  it("hay proporciones en el catálogo que elegir", () => {
    // Control de conteo: con la lista vacía todo lo de abajo pasaría trivial.
    expect(MEDIA_RATIOS.length).toBeGreaterThanOrEqual(8);
  });

  it.each([
    // fuentes que SON una proporción del catálogo -> recorte exactamente 0
    [1600, 1600, "1/1"],
    [1600, 2400, "2/3"],
    [1600, 1067, "3/2"],
    [1200, 1600, "3/4"],
    [1920, 1080, "16/9"],
    [900, 1600, "9/16"],
    [1600, 1200, "4/3"],
  ])("%ix%i -> %s con recorte 0", (w, h, esperada) => {
    const r = proporcionMasCercana(w, h);
    expect(r).toBeTruthy();
    expect(r!.ratio).toBe(esperada);
    expect(Math.round(r!.recorte * 100)).toBe(0);
  });

  it("840x1800 elige 1/2 y recorta ~7 %, que es lo MEJOR disponible", () => {
    // Este caso me lo inventé como «recorte 0» y la prueba lo tumbó: 840x1800
    // es 0.467 y `1/2` es 0.5. El propio comentario de `MEDIA_RATIOS` ya lo
    // decía —«calza las dos piezas de 840x1800 al 6.6 %»—, o sea que la fuente
    // canónica tenía la respuesta y yo asumí otra. Se queda como caso porque
    // documenta que el catálogo NO cubre toda proporción posible.
    const r = proporcionMasCercana(840, 1800)!;
    expect(r.ratio).toBe("1/2");
    expect(Math.round(r.recorte * 100)).toBe(7);
  });

  it("una fuente que NO calza ninguna elige la de menor recorte", () => {
    // 1600x2406 (0.665) cae junto a 2/3 (0.667): recorte por debajo del 1 %.
    const r = proporcionMasCercana(1600, 2406)!;
    expect(r.ratio).toBe("2/3");
    expect(r.recorte).toBeLessThan(0.01);
  });

  it("nunca devuelve un recorte mayor que el de la mejor opción real", () => {
    // Recorre el catálogo a mano y compara: si la función eligiera otra, este
    // caso lo caza. Es el control de que MINIMIZA y no sólo devuelve algo.
    for (const [w, h] of [[1000, 999], [1234, 4321], [3000, 1001], [77, 1000]]) {
      const r = proporcionMasCercana(w, h)!;
      const fuente = w / h;
      const mejorAMano = Math.min(
        ...MEDIA_RATIOS.map((x) => {
          const [a, b] = x.split("/").map(Number);
          const caja = a / b;
          return caja < fuente ? 1 - caja / fuente : 1 - fuente / caja;
        }),
      );
      expect(r.recorte).toBeCloseTo(mejorAMano, 10);
    }
  });

  it("mide los DOS ejes, no sólo el lateral", () => {
    // Una caja MÁS ANCHA que la fuente recorta por arriba y abajo. Si la
    // función sólo midiera `1 - caja/fuente`, aquí daría un recorte NEGATIVO y
    // lo elegiría como el mejor.
    const r = proporcionMasCercana(100, 1000)!;
    expect(r.recorte).toBeGreaterThan(0);
    expect(r.ratio).toBe("1/2"); // la más alta del catálogo
  });

  it("rechaza dimensiones imposibles en vez de inventar una proporción", () => {
    for (const [w, h] of [[0, 100], [100, 0], [-1, 10], [Number.NaN, 10]]) {
      expect(proporcionMasCercana(w, h)).toBeNull();
    }
  });
});
