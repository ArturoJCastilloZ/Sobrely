import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { saveEditorSchema } from "./schemas";

/**
 * Bloqueo optimista de `saveEditor` (migración `0027`).
 *
 * El defecto que cierra: `saveEditor` no tenía token de versión, así que dos
 * pestañas se pisaban EN SILENCIO. Y no era solo "el último gana" sobre los
 * ajustes — la reconciliación calcula los borrados contra la lista que MANDA
 * el cliente, así que la pestaña B **borraba los módulos que A acababa de
 * crear**, sin un solo error en pantalla.
 *
 * Lo que estas pruebas pueden y no pueden demostrar, dicho claro: una prueba
 * unitaria sobre funciones puras NUNCA puede demostrar una propiedad de
 * concurrencia (es la lección que dejó el contador de intentos del reporte con
 * PIN: 20 pruebas verdes sobre la aritmética y cero sobre lo único que
 * importaba). Así que aquí se ancla lo que sí es verificable sin base:
 *
 *  1. el esquema EXIGE la versión, y
 *  2. la defensa vive en UNA sentencia y el conflicto corta ANTES de escribir.
 *
 * El veredicto de que de N guardados concurrentes pasa exactamente uno se
 * cobra contra la BD real, con un lote simultáneo, y no está hecho hasta que
 * la `0027` esté aplicada.
 */

const BASE = {
  invitationId: "11111111-1111-4111-8111-111111111111",
  settings: { title: "T", slug: "t", eventType: "", eventDate: "" },
  theme: {},
  modules: [],
};

describe("el esquema exige el token de versión", () => {
  it("acepta una versión entera positiva", () => {
    const r = saveEditorSchema.safeParse({ ...BASE, version: 3 });
    expect(r.success, JSON.stringify(r.success ? {} : r.error.issues)).toBe(
      true,
    );
  });

  it("RECHAZA que falte la versión", () => {
    // Es el caso peligroso: con `.optional()`, un cliente viejo que no la
    // mande se saltaría el bloqueo entero y volveríamos al pisotón silencioso.
    expect(saveEditorSchema.safeParse(BASE).success).toBe(false);
  });

  it.each([
    ["cero", 0],
    ["negativa", -1],
    ["fraccionaria", 1.5],
    ["texto", "2"],
    ["nula", null],
  ])("rechaza una versión %s", (_caso, version) => {
    expect(saveEditorSchema.safeParse({ ...BASE, version }).success).toBe(false);
  });
});

/**
 * Las dos propiedades de abajo son de FORMA del código y se leen del archivo
 * real, porque no hay forma de observarlas sin una base de datos: si alguien
 * parte el compare-and-set en un `select` y luego un `update`, o mueve el
 * corte del conflicto después de los borrados, todo seguiría compilando y
 * pasando el resto de la suite, y el bloqueo dejaría de bloquear.
 */
const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const cuerpoSave = actions.slice(actions.indexOf("export async function saveEditor"));

describe("la defensa está en UNA sentencia", () => {
  it("el update de ajustes compara la versión y la incrementa a la vez", () => {
    // El `where version = esperada` es lo que deja pasar exactamente uno de N
    // guardados concurrentes. Leerla en una consulta y escribirla en otra no
    // defiende nada.
    const bloque = cuerpoSave.slice(
      cuerpoSave.indexOf('.from("invitations")\n    .update('),
    );
    const hastaElFinDeLaCadena = bloque.slice(0, bloque.indexOf("if (updErr)"));
    expect(hastaElFinDeLaCadena).toMatch(/version:\s*version\s*\+\s*1/);
    expect(hastaElFinDeLaCadena).toMatch(/\.eq\("version",\s*version\)/);
    // Sin `.select()` PostgREST no devuelve cuerpo y un update que no tocó
    // nada es indistinguible de uno que sí: no habría cómo detectar conflicto.
    expect(hastaElFinDeLaCadena).toMatch(/\.select\(/);
  });

  it("el conflicto corta ANTES de tocar los módulos", () => {
    // Si cortara después, un conflicto dejaría los ajustes o los borrados a
    // medias: peor que no bloquear, porque rompe y además avisa.
    const iConflicto = cuerpoSave.indexOf("conflict: true");
    const iModulos = cuerpoSave.indexOf('.from("invitation_modules")');
    expect(iConflicto).toBeGreaterThan(-1);
    expect(iModulos).toBeGreaterThan(-1);
    expect(iConflicto).toBeLessThan(iModulos);
  });

  it("el servidor devuelve la versión nueva para que el cliente la adopte", () => {
    // Si el cliente se quedara con la vieja, su siguiente guardado chocaría
    // contra su propio guardado anterior y el editor se bloquearía solo.
    expect(cuerpoSave).toMatch(/version:\s*bumped\.version/);
  });
});

describe("el autoguardado se pausa sin perder el aviso al cerrar", () => {
  const autosave = readFileSync(
    new URL("./use-autosave.ts", import.meta.url),
    "utf8",
  );

  /**
   * Ojo con cómo se ancla esto. La primera versión de esta prueba buscaba la
   * palabra `beforeunload`, y la encontraba en el COMENTARIO de cabecera del
   * archivo, no en el código: el `lastIndexOf` hacia atrás devolvía -1, el
   * `slice` salía vacío y la aserción pasaba en vacío. Lo destapó la mutación
   * —meterle `pausado` al efecto y ver que la suite seguía verde—, no la
   * lectura. Por eso se ancla al IDENTIFICADOR del código (`alSalir`), que no
   * aparece en prosa.
   */
  const iEfectoSalir = autosave.indexOf("const alSalir");

  it("la sonda apunta al código y no a la prosa", () => {
    // Sin esta guarda, las dos de abajo pueden pasar por no tener qué mirar.
    expect(iEfectoSalir).toBeGreaterThan(-1);
    expect(autosave).toMatch(/BeforeUnloadEvent/);
  });

  it("el temporizador del autoguardado SÍ mira `pausado`", () => {
    // `indexOf("setTimeout")` NO sirve como ancla: la primera aparición está
    // en el tipo `ReturnType<typeof setTimeout>` de la ref, muy por encima del
    // efecto, y el `lastIndexOf` hacia atrás no encontraba la guarda. Segunda
    // vez que me pasa en este archivo — el ancla tiene que ser la ASIGNACIÓN.
    const iTimer = autosave.indexOf("temporizador.current = setTimeout");
    expect(iTimer).toBeGreaterThan(-1);
    const guardaDelTimer = autosave.slice(
      autosave.lastIndexOf("if (!hayCambios", iTimer),
      iTimer,
    );
    expect(guardaDelTimer).toMatch(/pausado/);
  });

  it("el aviso al cerrar la pestaña NO mira `pausado`", () => {
    // Son dos cosas distintas que compartían un flag. Al detectar conflicto
    // hay que dejar de reintentar, pero el usuario SIGUE con cambios sin
    // guardar: quitarle el aviso al cerrar cambiaría un fallo silencioso por
    // otro.
    const guardaDelSalir = autosave.slice(
      autosave.lastIndexOf("if (!hayCambios", iEfectoSalir),
      iEfectoSalir,
    );
    expect(guardaDelSalir).toMatch(/if \(!hayCambios\) return;/);
    expect(guardaDelSalir).not.toMatch(/pausado/);
  });
});
