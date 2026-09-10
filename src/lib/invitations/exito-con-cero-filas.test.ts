import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * «`ok: true` con 0 filas» — el patrón de fallo silencioso que el informe
 * encontró repetido en cinco módulos.
 *
 * En PostgREST, un `update`/`delete` que no encuentra ninguna fila NO es un
 * error: devuelve `error: null`. Así que `if (error) …; return { ok: true }`
 * responde «hecho» sin haber tocado nada — y con RLS de por medio eso pasa
 * cada vez que la fila no es tuya o ya no existe. La única forma de saber
 * cuántas filas se tocaron es pedir `.select()`, que devuelve las AFECTADAS.
 *
 * Estas pruebas leen el fuente porque el efecto exige una base de datos, y la
 * de este proyecto es de producción. Lo que defienden es que ninguna de las
 * escrituras arregladas vuelva a quedarse sin su comprobación.
 */

const ARCHIVOS = {
  admin: "../admin/actions.ts",
  rsvp: "../rsvp/actions.ts",
  invitations: "./actions.ts",
} as const;

/** Fuente sin comentarios: una aserción no debe satisfacerse con la prosa. */
function fuente(rel: string): string {
  return crudo(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

/**
 * Con comentarios. Sólo para buscar la marca de exención: una escritura puede
 * no verificar filas si alguien lo DECIDIÓ y escribió por qué. Lo que no se
 * admite es la tercera opción, que es no verificar sin decirlo.
 */
function crudo(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

/**
 * Recorta la sentencia de escritura completa: desde el `.from("tabla")` hasta
 * el `;` que la cierra. Anclar a la función entera no sirve — hay varias
 * escrituras por archivo y se solapan.
 */
function sentenciasDeEscritura(src: string): string[] {
  const out: string[] = [];
  // `(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*` = espacios O COMENTARIOS. Sin la parte
  // de los comentarios la sonda se volvía CIEGA justo a las escrituras que
  // llevan la marca de exención escrita entre el `.from(` y el `.delete(`:
  // inspeccionaba 7 de 9 y pasaba en verde. Lo cazó un mutante que sobrevivió.
  const re =
    /\.from\("([^"]+)"\)(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*\.(update|delete|upsert)\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const fin = src.indexOf(";", m.index);
    expect(fin, "sentencia sin cerrar").toBeGreaterThan(m.index);
    // Se abre la ventana 6 líneas HACIA ATRÁS: la marca de exención se escribe
    // encima de la sentencia, no dentro. Sin esto la sonda no puede verla y
    // acusa de silenciosa a una escritura que sí está justificada — me pasó al
    // escribir esta prueba.
    let inicio = m.index;
    for (let n = 0; n < 6 && inicio > 0; n++) {
      const salto = src.lastIndexOf("\n", inicio - 1);
      if (salto < 0) break;
      inicio = salto;
    }
    out.push(src.slice(inicio, fin + 1));
  }
  return out;
}

describe("toda escritura pide las filas afectadas", () => {
  // La guarda de no-vacuidad: si el recortador dejara de encontrar sentencias,
  // los `it.each` de abajo pasarían sin comprobar nada.
  it("el recortador encuentra escrituras en los tres archivos", () => {
    for (const [nombre, rel] of Object.entries(ARCHIVOS)) {
      expect(
        sentenciasDeEscritura(crudo(rel)).length,
        `${nombre} sin escrituras detectadas`,
      ).toBeGreaterThan(0);
    }
  });

  it("y las encuentra TODAS: el conteo cuadra con el universo del archivo", () => {
    // La guarda que faltaba. «No hay escrituras sin verificar» y «mi sonda no
    // las ve» producen exactamente la misma salida verde, así que el número de
    // sentencias detectadas se compara contra el total de llamadas a
    // update/delete/upsert del archivo. Si alguien escribe una escritura con
    // una forma que la sonda no reconoce, esta prueba se pone roja en vez de
    // pasar inspeccionando la mitad.
    for (const [nombre, rel] of Object.entries(ARCHIVOS)) {
      const src = crudo(rel);
      const detectadas = sentenciasDeEscritura(src).length;
      const universo = (src.match(/\.(update|delete|upsert)\(/g) ?? []).length;
      expect(detectadas, `${nombre}: la sonda ve ${detectadas} de ${universo}`).toBe(
        universo,
      );
    }
  });

  for (const [nombre, rel] of Object.entries(ARCHIVOS)) {
    it(`${nombre}: cada update/delete/upsert verifica filas o está exento por escrito`, () => {
      // La regla NO es «todas llevan .select()». Una reversión o una escritura
      // cuyo id se acaba de leer en la misma petición puede afectar 0 filas sin
      // que eso sea un fallo, y exigirle la comprobación obligaría a inventar
      // un error que no existe — una regla demasiado estricta bloquea la
      // solución buena. Lo que se prohíbe es la tercera vía: no verificar y no
      // decirlo.
      for (const sentencia of sentenciasDeEscritura(crudo(rel))) {
        const verifica = /\.select\(/.test(sentencia);
        const exenta = /filas-no-verificadas:/.test(sentencia);
        expect(
          verifica || exenta,
          `ni verifica filas ni declara por qué no:\n${sentencia}`,
        ).toBe(true);
      }
    });
  }
});

describe("y el resultado se COMPRUEBA, no solo se pide", () => {
  // Pedir `.select()` y no mirar la longitud seria cambiar un fallo silencioso
  // por otro. Se cuenta que haya tantas comprobaciones como escrituras.
  for (const [nombre, rel] of Object.entries(ARCHIVOS)) {
    it(`${nombre}: hay una comprobación de longitud por escritura`, () => {
      const src = fuente(rel);
      const sentencias = sentenciasDeEscritura(crudo(rel));
      const exentas = sentencias.filter((x) =>
        /filas-no-verificadas:/.test(x),
      ).length;
      const conSelect = sentencias.filter((x) => /\.select\(/.test(x));
      // `.maybeSingle()` devuelve un objeto o `null`, no un array, así que su
      // comprobación correcta es un guard de falsedad y no una longitud. Es lo
      // que hace `saveEditor` con `if (!bumped)`, que el informe señaló como el
      // patrón BUENO a copiar. Contarlas juntas acusaría al único sitio que ya
      // estaba bien.
      const porLongitud = conSelect.filter((x) => !/maybeSingle\(\)/.test(x)).length;
      const porGuard = conSelect.filter((x) => /maybeSingle\(\)/.test(x)).length;
      const comprobaciones = (
        src.match(/filas\.length === 0|entFilas\.length === 0/g) ?? []
      ).length;

      expect(conSelect.length + exentas).toBe(sentencias.length);
      expect(comprobaciones).toBe(porLongitud);
      // Y que las de `maybeSingle` no queden sin mirar tampoco.
      if (porGuard > 0) expect(src).toMatch(/if \(!bumped\)/);
    });
  }
});

describe("los sitios concretos que el informe señaló", () => {
  it("borrar una invitación LANZA si no toco ninguna fila", () => {
    const src = fuente(ARCHIVOS.invitations);
    const i = src.indexOf("export async function deleteInvitation");
    expect(i).toBeGreaterThan(-1);
    const cuerpo = src.slice(i, src.indexOf("\nexport ", i + 10));
    expect(cuerpo).toMatch(/filas\.length === 0/);
    // Lanza, no devuelve: la tarjeta del dashboard ya captura y muestra.
    expect(cuerpo).toMatch(/throw new Error\("Esa invitación ya no existe\."\)/);
  });

  it("despublicar no puede devolver ok con 0 filas", () => {
    const src = fuente(ARCHIVOS.invitations);
    const i = src.indexOf('is_published: false, status: "draft"');
    expect(i).toBeGreaterThan(-1);
    const tramo = src.slice(i, i + 800);
    // El `return { ok: true, is_published: false }` tiene que venir DESPUES de
    // la comprobación, no antes.
    const iGuarda = tramo.indexOf("filas.length === 0");
    const iOk = tramo.indexOf("ok: true");
    expect(iGuarda).toBeGreaterThan(-1);
    expect(iGuarda).toBeLessThan(iOk);
  });
});
