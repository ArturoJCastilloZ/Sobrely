import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Escalera de `z-index` del preview del editor.
 *
 * El paginador ("Sección N de M") flota sobre el marco de la invitación: el
 * `-mt-11` lo mete FÍSICAMENTE dentro de los últimos ~44px del marco. Sin
 * `z-index` propio se queda en `auto` y pierde contra dos capas que sí lo
 * declaran, y el fallo no es solo visual.
 *
 * Medido en el editor real, antes del arreglo:
 *
 *   elementFromPoint(centro de la flecha) -> DIV z=30 "absolute inset-0 z-30"
 *   el clic llega a la flecha             -> FALSE
 *
 * O sea: los botones del paginador NO recibían el clic, se los comía la capa
 * de stickers. Con `z-40`:
 *
 *   elementFromPoint(centro de la flecha) -> BUTTON (el del paginador)
 *   el clic llega a la flecha             -> TRUE
 *
 * Orden que se quiere, y que esta prueba fija:
 *   contenido 10  <  stickers 30  <  paginador 40  <  modal de plan 50
 *
 * El modal va ARRIBA a propósito: un diálogo sí debe tapar el paginador.
 *
 * Por qué una prueba de forma y no de comportamiento: el defecto es de
 * composición CSS entre tres archivos, compila, y las 359 pruebas seguían
 * verdes con el paginador inservible. Solo se ve midiendo el hit-test en un
 * navegador, y eso no corre en CI todavía (Fase 4).
 */
const leer = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), "utf8");

const preview = leer("../../components/editor/preview-pane.tsx");
const stickers = leer("../../components/editor/sticker-editor-layer.tsx");
const editor = leer("../../components/editor/invitation-editor.tsx");

/**
 * Saca el `z-N` del className que contiene un ancla dada. El ancla es un
 * trozo de CÓDIGO y no una palabra que pueda salir en un comentario: ya me
 * costó dos pruebas decorativas esta misma sesión anclar en prosa.
 */
function zDeLaClaseQueContiene(src: string, ancla: string): number | null {
  const i = src.indexOf(ancla);
  if (i === -1) return null;
  // El className que contiene el ancla: se acota a las comillas que lo rodean.
  const ini = src.lastIndexOf('"', i);
  const fin = src.indexOf('"', i + ancla.length);
  if (ini === -1 || fin === -1) return null;
  const clase = src.slice(ini, fin);
  const m = clase.match(/(?:^|\s)z-(\d+)(?:\s|$)/);
  return m ? Number(m[1]) : null;
}

const Z = {
  paginador: zDeLaClaseQueContiene(preview, "sticky bottom-3 -mt-11"),
  stickers: zDeLaClaseQueContiene(stickers, "absolute inset-0"),
  modalDePlan: zDeLaClaseQueContiene(editor, "fixed inset-0"),
};

describe("escalera de z-index del preview del editor", () => {
  it("las tres capas declaran su z-index (la sonda no pasa en vacío)", () => {
    // Sin esto, un ancla que no casa devuelve `null` y las comparaciones de
    // abajo podrían pasar por no tener números que comparar.
    for (const [nombre, valor] of Object.entries(Z)) {
      expect(valor, `no encontré el z-index de ${nombre}`).toBeTypeOf("number");
    }
  });

  it("el paginador va POR ENCIMA de la capa de stickers", () => {
    // El caso medido: sin esto, la capa de stickers se come el clic.
    expect(
      Z.paginador!,
      `paginador=${Z.paginador} debe superar stickers=${Z.stickers}`,
    ).toBeGreaterThan(Z.stickers!);
  });

  it("el paginador va POR ENCIMA del contenido de la invitación (z-10)", () => {
    // El contenido se envuelve en `relative z-10` para quedar sobre el telón.
    expect(Z.paginador!).toBeGreaterThan(10);
  });

  it("el modal de plan va POR ENCIMA del paginador", () => {
    // Un diálogo SÍ debe tapar el paginador; si el paginador lo superara,
    // quedaría flotando sobre el modal.
    expect(
      Z.modalDePlan!,
      `modal=${Z.modalDePlan} debe superar paginador=${Z.paginador}`,
    ).toBeGreaterThan(Z.paginador!);
  });
});

/**
 * Y la otra mitad del mismo defecto, que el orden de `z-index` no cubre.
 *
 * Subir el paginador a `z-40` resolvió SU caso, pero dejó la causa viva: la
 * capa de stickers es un `inset-0` que reclama el puntero en toda la vista
 * previa. Volvió a morder con el arrastre de texto de la portada, que vive en
 * el contenido (`z-10`) y por definición NO puede ganar por apilamiento.
 *
 * Medido en el editor real con `elementsFromPoint` sobre el centro del título:
 *
 *   [0] DIV  "absolute inset-0 z-30"   <- la capa de stickers
 *   [4] H2   data-bloque="title"       <- el bloque, inalcanzable
 *   closest("[data-bloque]") desde el target -> null
 *
 * El arreglo es que la capa no reclame eventos donde no tiene nada:
 * `pointer-events-none` en la capa y `auto` en cada sticker.
 */
describe("la capa de stickers no se come el puntero", () => {
  it("la capa declara `pointer-events-none`", () => {
    const i = stickers.indexOf("absolute inset-0");
    expect(i).toBeGreaterThan(-1);
    const ini = stickers.lastIndexOf('"', i);
    const fin = stickers.indexOf('"', i + "absolute inset-0".length);
    expect(stickers.slice(ini, fin)).toContain("pointer-events-none");
  });

  it("cada sticker SÍ los recibe: `pointer-events-auto`", () => {
    // Sin esto la capa seria transparente y los stickers indraggables — el
    // arreglo habria cambiado un defecto por otro.
    expect(stickers).toContain("pointer-events-auto absolute");
    expect(stickers).toContain("data-sticker=");
  });

  it("deseleccionar no depende del clic en la capa vacía", () => {
    // Antes se hacia comparando el objetivo del clic con la propia capa dentro
    // de un `onClick` suyo. Al volverla transparente ese clic ya no llega, asi
    // que si el codigo siguiera dependiendo de el, deseleccionar quedaria roto
    // en silencio.
    //
    // La asercion se ancla en CODIGO y no en prosa: la primera version buscaba
    // la expresion literal y la encontro en un COMENTARIO del propio archivo,
    // que es un error que esta base ya tiene anotado dos veces.
    const capa = stickers.slice(
      stickers.indexOf("pointer-events-none absolute inset-0"),
    );
    const cierreDeLaCapa = capa.indexOf(">");
    expect(capa.slice(0, cierreDeLaCapa)).not.toContain("onClick");
    expect(stickers).toContain('document.addEventListener("pointerdown"');
  });
});
