import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

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
  /*
    `fulfillment.ts` FALTABA, y es el archivo donde este defecto cuesta dinero.

    El punto 7 arregló ocho escrituras en los tres módulos de arriba y dejó este
    guard para que no volvieran; el punto 8 arregló el fulfillment aparte, con
    pruebas propias. Entre las dos campañas nadie extendió la lista, así que la
    auto-publicación se quedó con `published = !pubErr` —un `update` sin filas
    no es error en PostgREST— y decía «publicada» sin haber publicado nada,
    justo en el camino donde el cliente PAGÓ desde el botón «Publicar».
    Encontrado al revisar el punto 8 con el dev el 2026-09-11.

    La lección de este repo dice arreglar el MECANISMO y no el síntoma: el
    síntoma era una línea, el mecanismo es que el guard no cubría el módulo del
    dinero.
  */
  fulfillment: "../billing/fulfillment.ts",
  /*
    Los seis que el barrido de superficie destapó, auditados con el dev el
    2026-09-11. Eran 16 escrituras sin verificar ni declarar; la mayoría usan el
    cliente CON SESIÓN, o sea con RLS — y ahí un `update` sobre una fila que no
    es tuya devuelve 0 filas sin error, que es el caso que este guard persigue.
  */
  billing: "../billing/actions.ts",
  vanity: "../vanity/actions.ts",
  guests: "../guests/actions.ts",
  signatures: "../signatures/actions.ts",
  reports: "../reports/actions.ts",
  favoritos: "../templates/favorites-actions.ts",
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

describe("el guard cubre TODOS los modulos que escriben", () => {
  /*
    Una lista escrita a mano no puede defenderse a si misma: quitar un archivo
    de `ARCHIVOS` dejaba la suite en verde, y asi es justo como
    `fulfillment.ts` —el modulo del DINERO— estuvo fuera del guard desde que se
    escribio. Lo destapo un mutante que sobrevivio.

    Asi que la lista se comprueba contra la SUPERFICIE: se barre `src/lib` y
    todo modulo que escriba en la base tiene que estar cubierto. Un archivo
    nuevo con un `.update()` entra al guard sin tocar esta prueba.
  */
  it("ningun modulo de `src/lib` escribe en la BD sin estar en la lista", () => {
    const raiz = fileURLToPath(new URL("../", import.meta.url));
    const cubiertos = new Set(
      Object.values(ARCHIVOS).map((rel) =>
        fileURLToPath(new URL(rel, import.meta.url)),
      ),
    );
    const escriben: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const ruta = join(dir, e);
        if (statSync(ruta).isDirectory()) {
          recorrer(ruta);
        } else if (e.endsWith(".ts") && !e.includes(".test.")) {
          const src = readFileSync(ruta, "utf8");
          if (/\.from\("[^"]+"\)(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*\.(update|delete|upsert)\(/.test(src)) {
            escriben.push(ruta);
          }
        }
      }
    };
    recorrer(raiz);
    // No-vacuidad: si el barrido dejara de encontrar modulos, esto pasaria solo.
    expect(escriben.length, "el barrido no encontro ningun modulo").toBeGreaterThan(0);
    /*
      DEUDA DECLARADA, no resuelta.

      El barrido destapo que el guard cubria 4 de 10 modulos que escriben en la
      base. Los seis de abajo NO estan auditados: meterlos de golpe pondria la
      suite roja sobre codigo que nadie ha revisado, y arreglarlos a ciegas en
      un mismo commit es justo como se cuelan los defectos.

      Lo que esta lista SI hace: que un modulo NUEVO que escriba en la base y no
      este cubierto ponga la prueba en rojo. La deuda queda visible y acotada en
      vez de invisible.

      Pendiente de auditar con el dev, por orden de riesgo: `billing/actions.ts`
      (dinero) y `vanity/actions.ts` (toca el slug publico) primero.
    */
    // La deuda quedó en CERO el 2026-09-11: los seis módulos que el barrido
    // destapó están auditados y en `ARCHIVOS`. El conjunto se conserva vacío a
    // propósito —y no se borra— porque es el sitio donde declarar el siguiente
    // si aparece: sin él, la tentación es sacar el módulo de la lista.
    const SIN_AUDITAR = new Set<string>([]);
    const fuera = escriben
      .filter((f) => !cubiertos.has(f))
      .filter((f) => !SIN_AUDITAR.has(f.slice(raiz.length)));
    expect(
      fuera.map((f) => f.slice(raiz.length)),
      "escriben en la BD y no estan en ARCHIVOS",
    ).toEqual([]);
  });
});

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
        // `verifica` se evalúa sobre el CÓDIGO y `exenta` sobre la prosa.
        //
        // Antes las dos miraban el texto con comentarios, y eso era un FALSO
        // VERDE: el comentario que declara una exención explica «se quita el
        // .select()», así que la palabra aparecía en la prosa y la escritura
        // pasaba como si pidiera filas. Lo destapó un mutante que sobrevivió
        // —borrar la marca de exención no ponía nada en rojo— al extender el
        // guard a `fulfillment.ts` el 2026-09-11. Es la trampa que este repo
        // tiene anotada varias veces: una aserción no debe poder satisfacerse
        // con el comentario que la explica.
        const codigo = sentencia
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "");
        const verifica = /\.select\(/.test(codigo);
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
  /*
    Pedir `.select()` y no mirar la longitud sería cambiar un fallo silencioso
    por otro.

    Se comprueba POR SENTENCIA y no contando el archivo entero. La primera
    versión contaba `filas.length === 0|entFilas.length === 0` en todo el
    fuente y lo comparaba con el número de escrituras: funcionaba con los tres
    módulos originales por casualidad de cómo se llamaban sus variables, y al
    extender el guard a `fulfillment.ts` se rompió en las DOS direcciones —
    acusaba a código correcto por usar otros nombres, y al generalizar el regex
    empezó a contar `modules.length === 0`, que no comprueba ninguna escritura.
    Un conteo global no sabe A QUÉ pertenece cada coincidencia.

    Ahora se lee el nombre que la propia sentencia asigna (`const { data: X }`)
    y se exige que ESE identificador se mire justo después.
  */
  /*
    La no-vacuidad es GLOBAL y no por módulo. Por módulo era incorrecta: uno
    cuyas escrituras estén TODAS exentas por escrito —`favoritos` es
    exactamente ese caso— no inspecciona ninguna, y eso es legítimo, no un
    síntoma de sonda ciega. Lo que no puede pasar es que el recorte deje de
    encontrar escrituras en TODO el conjunto.
  */
  let inspeccionadas = 0;
  afterAll(() => {
    expect(inspeccionadas, "ninguna escritura inspeccionada en ningún módulo")
      .toBeGreaterThan(0);
  });

  for (const [nombre, rel] of Object.entries(ARCHIVOS)) {
    it(`${nombre}: cada escritura con \`.select()\` mira sus filas`, () => {
      const src = crudo(rel);
      let miradas = 0;
      for (const sentencia of sentenciasDeEscritura(src)) {
        // La marca de exención se busca en la PROSA; `.select(` y
        // `maybeSingle(` sólo en el CÓDIGO. Mezclarlo tiene consecuencias: el
        // comentario que declara una exención explica «se quita el .select()»,
        // y buscando sobre el texto entero esa escritura se colaba como si
        // pidiera filas. Es la trampa que este repo ya tiene anotada — una
        // aserción no debe poder satisfacerse con la explicación.
        const codigo = sentencia
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "");
        if (!/\.select\(/.test(codigo)) continue; // exenta declarada
        // `.maybeSingle()` devuelve objeto o `null`: su comprobación correcta
        // es un guard de falsedad, no una longitud.
        if (/maybeSingle\(\)/.test(codigo)) continue;
        const m = /const \{\s*data:\s*(\w+)/.exec(codigo);
        expect(m, `sin variable de datos:\n${sentencia}`).not.toBeNull();
        const variable = m![1];
        // La comprobación vive DESPUÉS de la sentencia, y la ventana se mide
        // sobre el código SIN COMENTARIOS: entre la escritura de la orden y su
        // `if (!ordenTocada …)` hay un bloque de manejo de error con un párrafo
        // de prosa, y midiendo sobre el crudo la comprobación caía fuera. La
        // distancia que importa es la del código, no la de la explicación.
        const limpio = fuente(rel);
        const anclaVar = limpio.indexOf(`const { data: ${variable}`);
        expect(anclaVar, `no se localizó \`${variable}\``).toBeGreaterThan(-1);
        const ventana = limpio.slice(anclaVar, anclaVar + 700);
        const mira = new RegExp(
          `${variable}\\.length === 0|\\(${variable}\\?\\.length \\?\\? 0\\)|!${variable}\\b`,
        ).test(ventana);
        expect(mira, `\`${variable}\` se pide y no se mira en ${nombre}`).toBe(true);
        miradas += 1;
      }
      inspeccionadas += miradas;
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
