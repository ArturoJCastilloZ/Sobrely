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

  it("los ornamentos colocados por <use> no caen donde cae el texto", () => {
    // ⚠️ ALCANCE REAL, MEDIDO el 2026-09-09 (3.ª sesión): esta aserción sólo
    // inspecciona las piezas que colocan ornamentos con `<use transform=
    // "translate(...)">`, que son **14 de las 46**. Para las otras 32 el filtro
    // sale vacío y la prueba pasa SIN COMPROBAR NADA. Queda con el nombre
    // acotado a lo que de verdad mira, en vez de sonar a contrato del catálogo.
    //
    // Y el rectángulo `y 250..650 × x 63..357` estaba SUPUESTO. Medido con
    // `scripts/medir-cajas-de-texto.mts` sobre las 65 plantillas y las tres
    // superficies, el texto cae en `y 53..900 × x 17..403`: la caja real es más
    // ancha por los dos lados, así que las franjas «libres» son de 17 px y no
    // de 63. Aquí NO se ensancha el rectángulo a la medida por una razón: la
    // legibilidad la decide el gate que MIDE (`verificar-contraste-arte.mts`),
    // y con la caja real ensanchada esta regla geométrica prohibiría arte
    // TONAL en el centro que mide 7.6–10.7 de contraste y es correcto. Una
    // regla demasiado estricta no es más segura: bloquea la solución buena.
    const conUse = DEL_PILOTO.filter((clave) =>
      /<use[^>]*transform="translate\(/.test(
        readFileSync(join(RAIZ, "public", rutaArte(clave)), "utf8"),
      ),
    );
    // Sin esta guarda, el día que nadie use `<use>` la prueba pasaría en vacío
    // para las 46 y nadie se enteraría. Es el `it.each` sobre lista vacía.
    expect(conUse.length, "ninguna pieza usa <use>: esta prueba no mide nada").toBeGreaterThan(0);

    for (const clave of conUse) {
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
