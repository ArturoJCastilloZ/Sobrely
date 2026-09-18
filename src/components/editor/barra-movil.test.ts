import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * La barra de pestañas del editor en móvil (< 1024 px).
 *
 * El umbral es 1024 y no 768 A PROPOSITO: es exactamente donde el layout deja
 * de apilarse (`lg:flex-row`). Con 768 quedaba una franja de 768–1023 con el
 * defecto intacto.
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
 *
 * ---
 *
 * REAPUNTADO en la Fase 1 del rediseño. Antes leía un único archivo
 * (`invitation-editor.tsx`, 1 128 líneas) porque el editor entero vivía ahí.
 * Al partirlo, las mismas marcas quedaron repartidas entre `shell/`, así que
 * ahora se lee la SUPERFICIE COMPLETA del editor y no un archivo.
 *
 * Ninguna aserción se ha relajado: siguen siendo los mismos conteos exactos.
 * Y se lee el DIRECTORIO, no una lista a mano — así una pieza nueva del chrome
 * entra sola en el ámbito de la guarda en vez de quedarse fuera en silencio,
 * que es justo el modo en que una prueba deja de defender sin ponerse roja.
 */

const dir = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

const ARCHIVOS = [
  dir("./invitation-editor.tsx"),
  dir("./preview-pane.tsx"),
  ...readdirSync(dir("./shell"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => dir(`./shell/${f}`)),
];

/** Sin comentarios: una aserción no debe poder anclar en la prosa que explica. */
const limpiar = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const CODIGO = ARCHIVOS.map((f) => limpiar(readFileSync(f, "utf8"))).join("\n");

describe("la superficie del editor es la que se cree", () => {
  it("hay al menos las piezas del chrome partido", () => {
    // Si alguien renombra la carpeta o mueve las piezas, el resto de esta suite
    // pasaría por vacío en vez de fallar. Esto lo caza.
    expect(ARCHIVOS.length).toBeGreaterThanOrEqual(7);
    expect(CODIGO.length).toBeGreaterThan(5000);
  });
});

describe("un solo árbol: el preview no se duplica", () => {
  it("`PreviewPane` se monta exactamente una vez", () => {
    const usos = CODIGO.match(/<PreviewPane\b/g) ?? [];
    expect(usos).toHaveLength(1);
  });

  it("y no hay un segundo bloque de layout escondido por breakpoint", () => {
    // `lg:hidden` sobre un contenedor de layout sería la firma de la copia
    // móvil que ya costó un bug de punteros. La barra SÍ lo usa, y es el
    // único sitio donde se admite.
    const ocultos = CODIGO.match(/(?<!max-)\blg:hidden\b/g) ?? [];
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
    // `data-hoja` + `max-lg:fixed`: la misma caja del escritorio, reposicionada.
    // Si alguien montara una copia, estas dos marcas dejarían de ir en pareja.
    const hojas = CODIGO.match(/data-hoja=\{/g) ?? [];
    expect(hojas).toHaveLength(2);
    const fijos = CODIGO.match(/max-lg:fixed/g) ?? [];
    expect(fijos).toHaveLength(2);
  });

  it("y se esconden por transformación, no desmontándose", () => {
    // Desmontar perdería el scroll y el estado de los paneles al cerrar la
    // hoja; y en el caso del riel, remontaría el DnD entero.
    expect(CODIGO).toMatch(/data-\[hoja=cerrada\]:translate-y-/);
  });
});
