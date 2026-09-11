import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * La barra de pestañas del editor en móvil (< 768 px).
 *
 * Lo que defiende, y por qué importa más que de costumbre: el encargo era
 * llevar el editor a móvil **sin perder ninguna opción**. La forma de
 * garantizarlo no fue revisar una lista a mano —eso se queda viejo al primer
 * panel nuevo— sino construir la barra desde las MISMAS fuentes que el
 * escritorio (`PANELES_DOC` con su filtro de `guest_list`) y mover los MISMOS
 * nodos con CSS. Estas aserciones fijan justo eso.
 *
 * También fija la advertencia histórica del propio componente: el preview se
 * montó dos veces una vez —una copia móvil y otra de escritorio— y duplicó las
 * capas de stickers escuchando punteros. Por eso aquí se comprueba que
 * `PreviewPane` aparece UNA sola vez.
 */

const SRC = readFileSync(
  fileURLToPath(new URL("./invitation-editor.tsx", import.meta.url)),
  "utf8",
);
/** Sin comentarios: una aserción no debe poder anclar en la prosa que explica. */
const CODIGO = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("un solo árbol: el preview no se duplica", () => {
  it("`PreviewPane` se monta exactamente una vez", () => {
    const usos = CODIGO.match(/<PreviewPane\b/g) ?? [];
    expect(usos).toHaveLength(1);
  });

  it("y no hay un segundo bloque de layout escondido por breakpoint", () => {
    // `lg:hidden` / `md:hidden` sobre un contenedor de layout sería la firma de
    // la copia móvil que ya costó un bug de punteros. La barra SÍ usa
    // `md:hidden`, y es el único sitio donde se admite.
    const ocultos = CODIGO.match(/\bmd:hidden\b/g) ?? [];
    expect(ocultos.length).toBeLessThanOrEqual(2);
  });
});

describe("la barra móvil se construye desde las fuentes del escritorio", () => {
  const i = CODIGO.indexOf('aria-label="Secciones y paneles"');
  const bloque = CODIGO.slice(i, CODIGO.indexOf("</nav>", i));

  it("el ancla existe", () => {
    expect(i, "no se encontró la barra móvil").toBeGreaterThan(-1);
  });

  it("no lleva una lista de paneles escrita a mano: usa `PANELES_DOC`", () => {
    expect(bloque).toMatch(/\.\.\.PANELES_DOC\.filter\(/);
  });

  it("y respeta el MISMO filtro de `guest_list` que el escritorio", () => {
    // Sin esto, «Invitados» aparecería en móvil para invitaciones de
    // confirmación abierta, donde el escritorio no lo muestra.
    expect(bloque).toMatch(/p\.id !== "guests" \|\| invitation\.rsvp_mode === "guest_list"/);
  });

  it("sus entradas cumplen el mínimo táctil de 44 px", () => {
    // `min-h-11` = 2.75rem = 44px. El editor tiene hoy 37 de 39 controles por
    // debajo de ese mínimo, así que lo nuevo no puede sumar al problema.
    expect(bloque).toMatch(/min-h-11/);
  });
});

describe("el riel y el inspector se mueven, no se duplican", () => {
  it("los dos se convierten en hoja con el MISMO mecanismo", () => {
    // `data-hoja` + `max-md:fixed`: la misma caja del escritorio, reposicionada.
    // Si alguien montara una copia, estas dos marcas dejarían de ir en pareja.
    const hojas = CODIGO.match(/data-hoja=\{/g) ?? [];
    expect(hojas).toHaveLength(2);
    const fijos = CODIGO.match(/max-md:fixed/g) ?? [];
    expect(fijos).toHaveLength(2);
  });

  it("y se esconden por transformación, no desmontándose", () => {
    // Desmontar perdería el scroll y el estado de los paneles al cerrar la
    // hoja; y en el caso del riel, remontaría el DnD entero.
    expect(CODIGO).toMatch(/data-\[hoja=cerrada\]:translate-y-/);
  });
});
