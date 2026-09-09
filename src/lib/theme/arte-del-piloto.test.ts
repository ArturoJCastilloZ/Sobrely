import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ARTE, rutaArte, buscarArte } from "./arte";

/**
 * Contrato del arte del piloto (roadmap §22, 2026-09-09).
 *
 * Lo que estas pruebas cazan es lo que YA salió mal antes en este proyecto: un
 * registro que declara un arte cuyo archivo no existe (la página se queda sin
 * fondo y nadie se entera hasta que un cliente lo abre), y un arte que se cuela
 * al catálogo pesando como un escaneo.
 *
 * El peso NO es una manía: la plancha de Ostell 1848 trae marcos completos de
 * 260–952 KB, y el primer prototipo pesaba 41 KB gzip por repetir el `d` en
 * cada uso. Con `<defs>`+`<use>` baja a 16.8. Sin un techo escrito, ese error
 * vuelve en el siguiente arte que alguien componga.
 */

const RAIZ = process.cwd();
const DEL_PILOTO = [
  "boda-carta-romantica-arte",
  "xv-manuscrita-arte",
  "corporativo-sencillo-arte",
  "baby-shower-neutro-arte",
  "cumpleanos-adulto-arte",
] as const;

/** Techo por pieza. El más pesado hoy es boda con 38.9 KB crudo. */
const TECHO_KB = 45;

describe("arte del piloto de cinco", () => {
  it("las cinco están registradas en ARTE", () => {
    for (const clave of DEL_PILOTO) {
      expect(buscarArte(clave), `falta ${clave} en ARTE`).toBeDefined();
    }
  });

  it("cada arte registrado tiene su archivo en disco", () => {
    // Barre TODO el registro, no sólo el piloto: un arte declarado sin archivo
    // deja la invitación sin fondo en silencio.
    const ausentes = ARTE.filter(
      (a) => !existsSync(join(RAIZ, "public", rutaArte(a.clave))),
    ).map((a) => a.clave);
    expect(ausentes).toEqual([]);
  });

  it("ninguna pieza del piloto supera el techo de peso", () => {
    const gordas = DEL_PILOTO.map((clave) => {
      const kb =
        readFileSync(join(RAIZ, "public", rutaArte(clave))).byteLength / 1024;
      return { clave, kb: +kb.toFixed(1) };
    }).filter((x) => x.kb > TECHO_KB);
    expect(gordas).toEqual([]);
  });

  it("cada `d` aparece UNA vez: los reusos van por <use>, no copiados", () => {
    // Si alguien vuelve a pegar el path en cada posición, el archivo engorda sin
    // que el techo de arriba lo note necesariamente. Esto lo caza antes.
    for (const clave of DEL_PILOTO) {
      const svg = readFileSync(join(RAIZ, "public", rutaArte(clave)), "utf8");
      const ds = [...svg.matchAll(/\sd="([^"]{400,})"/g)].map((m) => m[1]);
      const unicos = new Set(ds);
      expect(unicos.size, `${clave} repite un path largo`).toBe(ds.length);
    }
  });

  it("la greca de corporativo va recortada: la plancha le imprime «140.» debajo", () => {
    // El path 27 de Ostell arrastra el NÚMERO DE CATÁLOGO del impresor bajo el
    // ornamento. Se coló hasta la miniatura y sólo se vio MIRANDO el render, no
    // leyendo el código. Sin el clip, una plantilla comercial enseña la
    // numeración de una plancha de 1848.
    const svg = readFileSync(
      join(RAIZ, "public", rutaArte("corporativo-sencillo-arte")),
      "utf8",
    );
    expect(svg).toMatch(/<clipPath id="c27">/);
    expect(svg).toMatch(/id="o27"[^>]*clip-path="url\(#c27\)"/);
  });

  it("van con velo CERO, que es lo que se midió", () => {
    // El defecto del esquema es 0.45 y con este arte detrás lo borraría.
    for (const clave of DEL_PILOTO) {
      expect(buscarArte(clave)!.overlay, clave).toBe(0);
    }
  });

  it("dejan limpia la banda central, que es donde cae el texto", () => {
    // El contraste se sostiene porque no hay tinta en el centro. Se comprueba
    // por la geometría declarada, no por el render: ningún <use> ni figura del
    // arte cae con su centro dentro de y 250..650 del lienzo de 900.
    for (const clave of DEL_PILOTO) {
      const svg = readFileSync(join(RAIZ, "public", rutaArte(clave)), "utf8");
      const centros = [...svg.matchAll(/<use[^>]*transform="translate\([-\d.]+ ([-\d.]+)\)/g)]
        .map((m) => Number(m[1]))
        .filter((y) => y >= 250 && y <= 650);
      expect(centros, `${clave} pone ornamento en la banda del texto`).toEqual([]);
    }
  });
});
