import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { esperaDelAutoguardado } from "./autosave-espera";

/**
 * El defecto que estas pruebas defienden, REPRODUCIDO en el E2E del
 * 2026-09-10 contra la base de producción:
 *
 *   En pantalla `ZZ CHUNK-A-CHUNK-B`, en la base `ZZ CHUNK-A`. Cien segundos y
 *   dos ediciones más tarde, la base seguía igual. El editor NO volvía a
 *   guardar nunca, y el indicador decía «Guardando…» todo el rato.
 *
 * La causa era una lista de dependencias: el efecto del temporizador dependía
 * de `hayCambios`, un BOOLEANO. En cuanto se ponía en `true` dejaba de cambiar
 * de identidad, el efecto no se re-ejecutaba y no se programaba otro
 * temporizador. La transición `false → true` que lo rearmaba no volvía a
 * ocurrir mientras siguiera habiendo cambios pendientes.
 *
 * Por eso hay dos clases de prueba aquí:
 *  - de FORMA, sobre la lista de dependencias, porque el defecto vivía ahí y
 *    ninguna prueba de comportamiento en `environment: "node"` puede verlo;
 *  - de COMPORTAMIENTO, sobre la regla de espera, que sí es lógica pura.
 */

const fuente = readFileSync(new URL("./use-autosave.ts", import.meta.url), "utf8");

/**
 * Recorta al nodo sintáctico exacto y quita comentarios ANTES de buscar.
 * Sin esto una aserción se satisface con una palabra que está en la prosa: ya
 * pasó en este repo más de una vez.
 */
function cuerpoSinComentarios(desde: string, hasta: string): string {
  const i = fuente.indexOf(desde);
  expect(i, `no se encontró el ancla «${desde}»`).toBeGreaterThan(-1);
  const j = fuente.indexOf(hasta, i);
  expect(j, `no se encontró el cierre «${hasta}»`).toBeGreaterThan(i);
  return fuente
    .slice(i, j + hasta.length)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

describe("el efecto del temporizador se rearma con cada edición", () => {
  /**
   * El ancla es el `setTimeout` del temporizador y su cierre es el array de
   * dependencias del efecto que lo contiene.
   */
  const efecto = cuerpoSinComentarios(
    "if (!hayCambios || pausado) {",
    "guardarAhora]);",
  );

  it("depende de `revision`, que cambia en CADA edición", () => {
    // Ésta es LA aserción. Con `hayCambios` a secas el editor se atasca.
    const deps = efecto.slice(efecto.lastIndexOf("}, ["));
    expect(deps).toContain("revision");
  });

  it("sigue dependiendo de `hayCambios` y de `pausado`", () => {
    const deps = efecto.slice(efecto.lastIndexOf("}, ["));
    expect(deps).toContain("hayCambios");
    expect(deps).toContain("pausado");
  });

  it("`revision` es obligatoria en el tipo, para que el compilador enumere los llamadores", () => {
    // Opcional, el defecto vuelve en silencio en cuanto alguien monte el hook
    // sin pasarla. Obligatoria, `tsc` señala el sitio.
    const firma = cuerpoSinComentarios("hayCambios: boolean;", "pausado?: boolean;");
    expect(firma).toMatch(/revision:\s*unknown;/);
    expect(firma).not.toMatch(/revision\?:/);
  });

  it("el eslabón anterior de la cadena se neutraliza antes de encadenar", () => {
    // Encadenar sobre una promesa RECHAZADA dejaba el guardado siguiente sin
    // intentarse siquiera: un fallo de red envenenaba la cadena para siempre.
    const cadena = cuerpoSinComentarios("const anterior =", "return conLimpieza;");
    // Ojo con el patrón: `[^)]*` NO sirve, porque el propio `catch` lleva un
    // `() => …` con paréntesis dentro. Se ancla a que entre `anterior` y el
    // `.then(` aparezca un `.catch(` y nada más que la flecha.
    expect(cadena).toMatch(/anterior\s*\.catch\(\s*\(\)\s*=>[^\n]*\)\s*\.then\(/);
  });

  it("la ref en vuelo se compara contra la promesa que se GUARDA en ella", () => {
    // `propio.finally(...)` devuelve OTRA promesa. Comparar contra `propio`
    // daba siempre falso, la ref no se limpiaba nunca y el indicador se
    // quedaba en «Guardando…» con el guardado ya terminado. Encontrado por
    // efecto observado en el navegador, no por la suite.
    const cadena = cuerpoSinComentarios("const anterior =", "return conLimpieza;");
    const guarda = cadena.slice(cadena.indexOf("enVuelo.current ==="));
    expect(guarda).toMatch(/enVuelo\.current === conLimpieza/);
    expect(guarda).not.toMatch(/enVuelo\.current === propio/);
    // Y que lo comparado sea de verdad lo asignado.
    expect(cadena).toMatch(/enVuelo\.current = conLimpieza;/);
  });
});

describe("esperaDelAutoguardado", () => {
  const esperaMs = 1200;
  const maxEsperaMs = 10_000;

  it("usa la espera normal cuando el tope queda lejos", () => {
    expect(
      esperaDelAutoguardado({ pendienteDesde: 1_000, ahora: 1_000, esperaMs, maxEsperaMs }),
    ).toBe(1200);
  });

  it("recorta la espera para no pasarse del tope", () => {
    // Quedan 500 ms de tope: esperar los 1200 normales se lo saltaría.
    expect(
      esperaDelAutoguardado({ pendienteDesde: 1_000, ahora: 10_500, esperaMs, maxEsperaMs }),
    ).toBe(500);
  });

  it("guarda YA cuando el tope ya se pasó, y nunca devuelve negativo", () => {
    // Éste es el caso de quien escribe sin pausas: sin el tope, la espera se
    // reiniciaba con cada tecla y el guardado no llegaba nunca.
    expect(
      esperaDelAutoguardado({ pendienteDesde: 1_000, ahora: 30_000, esperaMs, maxEsperaMs }),
    ).toBe(0);
  });

  it("el tope manda sobre la espera normal, no al revés", () => {
    // Control de que la comparación no está invertida: con un tope MENOR que la
    // espera normal, gana el tope.
    expect(
      esperaDelAutoguardado({ pendienteDesde: 0, ahora: 0, esperaMs: 1200, maxEsperaMs: 300 }),
    ).toBe(300);
  });
});
