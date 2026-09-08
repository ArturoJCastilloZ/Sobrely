import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Guard: un `catch` de cliente NO puede tragarse el `NEXT_REDIRECT`.
 *
 * Medido por efecto el 2026-09-08 con una sonda desechable (ruta y componente
 * con la MISMA forma que `use-template-button.tsx`, ya borrada), sobre Next
 * 16.3 en el servidor de desarrollo real:
 *
 *   sinRedirect: RESUELVE-SIN-LANZAR                      <- control negativo
 *   conError:    CATCH name=Error message=fallo-de-verdad <- control positivo
 *   conRedirect: CATCH name=Error message=NEXT_REDIRECT
 *                digest=NEXT_REDIRECT;push;/…/destino;307;
 *   location.pathname = /sonda-redirect/destino
 *
 * O sea: cuando una server action termina en `redirect()`, la navegación
 * OCURRE **y además** el `catch` del cliente recibe la excepción de control de
 * flujo. Un `catch` pelado pintaba entonces un toast de error sobre una
 * operación que había salido bien — que es exactamente el bug reportado por el
 * dev, «No se pudo usar la plantilla», con la invitación y sus 11 secciones ya
 * creadas.
 *
 * El remedio es `unstable_rethrow(e)` como PRIMERA sentencia del catch: relanza
 * los errores internos del framework y deja pasar solo los fallos de verdad.
 *
 * Por qué el guard se ancla a la SUPERFICIE y no a una lista de archivos: el
 * defecto estaba COPIADO en tres llamadores y una lista fija no habría cazado
 * el cuarto. La prueba descubre sola (a) qué server actions terminan en
 * `redirect()` y (b) qué componentes de cliente las esperan dentro de un `try`.
 * Si mañana aparece un llamador nuevo con un catch pelado, esta prueba lo
 * caza sin tocarla.
 */

// fileURLToPath y no `.pathname`: la carpeta del proyecto tiene un espacio y
// el URL lo devuelve como %20.
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));

function archivos(dir: string, ext: string[]): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta, ext));
    else if (ext.some((e) => nombre.endsWith(e))) salida.push(ruta);
  }
  return salida;
}

const leer = (ruta: string) => readFileSync(ruta, "utf8");

/** Server actions —por nombre— cuyo cuerpo llama a `redirect()`. */
function accionesQueRedirigen(): Map<string, string> {
  const encontradas = new Map<string, string>();
  for (const ruta of archivos(RAIZ, [".ts"])) {
    const src = leer(ruta);
    if (!src.includes('"use server"') || !src.includes("redirect(")) continue;
    // Trocea por export para saber QUÉ función concreta redirige, no el módulo.
    const trozos = src.split(/(?=export async function )/);
    for (const trozo of trozos) {
      const m = /^export async function (\w+)/.exec(trozo);
      if (m && trozo.includes("redirect(")) {
        encontradas.set(m[1], relative(RAIZ, ruta));
      }
    }
  }
  return encontradas;
}

/** Cuerpo del `catch` que sigue a la posición `desde`, con conteo de llaves. */
function cuerpoDelCatch(src: string, desde: number): string | null {
  const idx = src.indexOf("catch", desde);
  if (idx === -1) return null;
  const abre = src.indexOf("{", idx);
  if (abre === -1) return null;
  let nivel = 0;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === "{") nivel++;
    else if (src[i] === "}") {
      nivel--;
      if (nivel === 0) return src.slice(abre, i + 1);
    }
  }
  return null;
}

type Sitio = { archivo: string; accion: string; cuerpo: string };

function sitios(): Sitio[] {
  const acciones = accionesQueRedirigen();
  const salida: Sitio[] = [];
  for (const ruta of archivos(RAIZ, [".tsx"])) {
    const src = leer(ruta);
    if (!src.includes('"use client"')) continue;
    for (const accion of acciones.keys()) {
      // Solo cuenta si el componente IMPORTA esa acción; así una función local
      // que se llame igual no dispara un falso positivo.
      if (!new RegExp(`\\b${accion}\\b[^\\n]*\\n?[^\\n]*from "`).test(src) && !src.includes(`  ${accion},`) && !src.includes(`{ ${accion} }`)) {
        continue;
      }
      const re = new RegExp(`await ${accion}\\(`, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const cuerpo = cuerpoDelCatch(src, m.index);
        if (cuerpo === null) continue;
        salida.push({ archivo: relative(RAIZ, ruta), accion, cuerpo });
      }
    }
  }
  return salida;
}

describe("un catch de cliente no puede tragarse el NEXT_REDIRECT", () => {
  const encontrados = sitios();

  it("el guard no está vacío: hay acciones que redirigen y clientes que las esperan", () => {
    // Sin esto, borrar los llamadores dejaría la prueba en verde sin defender
    // nada — el defecto de las tres pruebas huecas del 2026-09-07.
    expect(accionesQueRedirigen().size).toBeGreaterThanOrEqual(3);
    expect(encontrados.length).toBeGreaterThanOrEqual(3);
  });

  it.each(sitios().map((s) => [`${s.archivo} · await ${s.accion}()`, s] as const))(
    "%s relanza los errores del framework",
    (_titulo, sitio) => {
      expect(sitio.cuerpo).toContain("unstable_rethrow");
    },
  );
});
