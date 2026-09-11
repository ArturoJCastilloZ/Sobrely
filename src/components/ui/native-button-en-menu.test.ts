import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Base UI: un componente que actúa como botón y recibe un `<button>` NATIVO en
 * su prop `render` tiene que declarar `nativeButton`.
 *
 * Por defecto `nativeButton` es `false` (ver `NonNativeButtonProps` en
 * `@base-ui/react`), o sea que Base UI asume un `<div>`/`<a>` y le aplica
 * atributos y manejadores NO nativos —`role`, un `disabled` simulado— encima de
 * un botón de verdad. Avisa por consola en desarrollo.
 *
 * El guard se ancla a la SUPERFICIE y no a una lista de archivos: barre el
 * árbol y descubre por sí mismo cada `render={<button`. Un archivo nuevo con el
 * mismo patrón lo caza sin tocar esta prueba — que es justo lo que pasó al
 * arreglarlo, porque la traza del error sólo señalaba uno de los DOS sitios.
 */

// `fileURLToPath` y no `.pathname`: la ruta del proyecto lleva un ESPACIO
// («Personal projects») y `.pathname` lo deja como `%20`, con lo que el
// `readdirSync` falla con ENOENT sobre un directorio que sí existe.
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));

function tsx(dir: string, salida: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) tsx(p, salida);
    else if (e.endsWith(".tsx")) salida.push(p);
  }
  return salida;
}

const ARCHIVOS = tsx(RAIZ);

/** Cada `render={<button` con el nombre del componente que lo recibe. */
function sitios(src: string, archivo: string) {
  const fuera: { archivo: string; componente: string; etiqueta: string }[] = [];
  let i = src.indexOf("render={<button");
  while (i !== -1) {
    // Al nodo sintáctico exacto: del `<Componente` que abre hasta el `>` que
    // cierra ESA etiqueta de apertura. Nunca "la función" ni el archivo.
    const abre = src.lastIndexOf("<", i - 1);
    // El cierre NO es el primer `>`: ese es el `/>` del <button> que vive
    // DENTRO de `render={...}`. Hay que llegar al `>` de la etiqueta externa,
    // o sea el primero con profundidad de llaves CERO. La primera version de
    // esta sonda cortaba antes y dejaba `nativeButton` fuera del slice: las
    // dos aserciones fallaron sobre codigo ya arreglado, que es como se vio.
    let prof = 0;
    let cierra = abre;
    for (let k = abre; k < src.length; k += 1) {
      const c = src[k];
      if (c === "{") prof += 1;
      else if (c === "}") prof -= 1;
      else if (c === ">" && prof === 0) {
        cierra = k;
        break;
      }
    }
    const etiqueta = src.slice(abre, cierra + 1);
    const m = /^<([A-Za-z][\w.]*)/.exec(etiqueta);
    fuera.push({ archivo, componente: m?.[1] ?? "(desconocido)", etiqueta });
    i = src.indexOf("render={<button", i + 1);
  }
  return fuera;
}

const TODOS = ARCHIVOS.flatMap((f) => sitios(readFileSync(f, "utf8"), f));

describe("un `render` que es un <button> nativo declara `nativeButton`", () => {
  it("la sonda encuentra TODOS los sitios del universo, no un subconjunto", () => {
    // Guarda de COMPLETITUD, no sólo de no-vacuidad: el universo se cuenta de
    // otra forma —ocurrencias crudas del literal en todo el árbol— y tiene que
    // coincidir con lo que el detector procesó. «No hay defectos» y «mi sonda
    // no los ve» dan el mismo verde, y sólo un conteo cruzado los separa.
    const universo = ARCHIVOS.reduce(
      (n, f) => n + (readFileSync(f, "utf8").split("render={<button").length - 1),
      0,
    );
    expect(universo).toBeGreaterThan(0);
    expect(TODOS).toHaveLength(universo);
  });

  it.each(TODOS)("$componente en $archivo", ({ etiqueta }) => {
    expect(etiqueta).toMatch(/\bnativeButton\b/);
  });
});
