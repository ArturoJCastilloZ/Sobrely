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

/**
 * El arte compuesto en esta línea de trabajo, por CONVENCIÓN de nombre y no por
 * una lista a mano: cualquier pieza nueva que siga el patrón entra sola en
 * todas las pruebas de abajo. Una lista escrita se queda vieja en silencio; el
 * catálogo ya pagó ese modo de fallo.
 */
const DEL_PILOTO = ARTE.filter((a) => a.clave.endsWith("-arte")).map((a) => a.clave);

/** Techo por pieza. El más pesado hoy es boda con 38.9 KB crudo. */
const TECHO_KB = 45;

describe("arte compuesto del catálogo", () => {
  it("hay arte compuesto registrado (si no, las demás pruebas no miden nada)", () => {
    expect(DEL_PILOTO.length).toBeGreaterThanOrEqual(11);
  });

  it("cada arte registrado tiene su archivo en disco", () => {
    // Barre TODO el registro, no sólo el piloto: un arte declarado sin archivo
    // deja la invitación sin fondo en silencio.
    const ausentes = ARTE.filter(
      (a) => !existsSync(join(RAIZ, "public", rutaArte(a.clave))),
    ).map((a) => a.clave);
    expect(ausentes).toEqual([]);
  });

  it("ninguna pieza supera el techo de peso", () => {
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

  it("dejan libre el RECTÁNGULO del texto, no sólo su banda vertical", () => {
    // Antes esta prueba miraba sólo la `y`, y era demasiado estricta: el arte de
    // las FRANJAS LATERALES (x<63, x>357) recorre el alto entero a propósito —
    // se ve siempre, porque el ancho nunca se recorta, y no cuesta contraste
    // porque `verificar-contraste-arte.mts` muestrea x 63..357.
    //
    // Lo que de verdad hay que proteger es el rectángulo donde cae el texto:
    // y 250..650 Y x 63..357 a la vez. Con la regla vieja, las piezas de boda
    // habrían fallado siendo correctas.
    for (const clave of DEL_PILOTO) {
      const svg = readFileSync(join(RAIZ, "public", rutaArte(clave)), "utf8");
      const dentro = [
        ...svg.matchAll(/<use[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\)/g),
      ]
        .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
        .filter((p) => p.y >= 250 && p.y <= 650 && p.x >= 63 && p.x <= 357);
      expect(dentro, `${clave} pone ornamento donde cae el texto`).toEqual([]);
    }
  });
});
