import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { TextReveal, palabraDeReveal } from "./text-reveal";

/**
 * El título de la portada perdía todas las palabras menos la primera.
 *
 * Medido en el navegador: al teclear «Uno Dos Tres Cuatro» en el editor, la
 * vista previa pintaba sólo «Uno»; las demás existían en el DOM con caja
 * correcta pero en `opacity: 0` / `translateY(18px)` PARA SIEMPRE. Causa: el
 * contenedor animaba con `whileInView` + `viewport.once`, y al no remontarse
 * (el hero monta `<TextReveal>` sin `key`) framer ya no volvía a propagar la
 * variante `visible`; las palabras nuevas montaban en `hidden` y nadie las
 * promovía.
 *
 * El arreglo mueve la decisión de visibilidad a CADA palabra
 * (`palabraDeReveal`), función pura y por tanto comprobable sin DOM.
 */
describe("palabraDeReveal: la visibilidad no depende del momento de montaje", () => {
  it("revelado ⇒ visible, en CUALQUIER índice", () => {
    // Esta es la aserción que mata el defecto: la palabra 3 —la que montaba
    // tarde al teclear— se revela igual que la palabra 0.
    for (const i of [0, 1, 2, 3, 17]) {
      expect(palabraDeReveal(i, true, 0.06, 0.5).animate, `índice ${i}`).toBe(
        "visible",
      );
    }
  });

  it("sin revelar ⇒ hidden, para que la entrada pública siga animando", () => {
    for (const i of [0, 1, 2, 3]) {
      expect(palabraDeReveal(i, false, 0.06, 0.5).animate).toBe("hidden");
    }
  });

  it("el escalonado se calcula por índice, no con staggerChildren", () => {
    expect(palabraDeReveal(0, true, 0.06, 0.5).transition.delay).toBeCloseTo(0);
    expect(palabraDeReveal(3, true, 0.06, 0.5).transition.delay).toBeCloseTo(
      0.18,
    );
    // Oculto no arrastra retardo: al volver a hidden debe irse de inmediato.
    expect(palabraDeReveal(3, false, 0.06, 0.5).transition.delay).toBe(0);
  });

  it("la duración es la de la variante que se le pasa", () => {
    expect(palabraDeReveal(0, true, 0.06, 0.6).transition.duration).toBe(0.6);
  });
});

describe("TextReveal parte el texto sin perder palabras", () => {
  const html = renderToStaticMarkup(
    createElement(TextReveal, { text: "Uno Dos Tres Cuatro" }),
  );

  it("las cuatro palabras están en el marcado", () => {
    for (const w of ["Uno", "Dos", "Tres", "Cuatro"]) {
      expect(html).toContain(w);
    }
  });

  it("cada palabra trae su propia caja animable", () => {
    // 4 palabras ⇒ 4 spans internos con display inline-block.
    expect(html.match(/display:inline-block/g)?.length).toBeGreaterThanOrEqual(
      8,
    );
  });

  it("expone el texto íntegro a lectores de pantalla", () => {
    expect(html).toContain('aria-label="Uno Dos Tres Cuatro"');
  });
});

/**
 * Aserción sobre el FUENTE, recortada al cuerpo de `TextReveal` y con los
 * comentarios quitados: en este repo ya ha pasado que una aserción se
 * satisfacía con una palabra que vivía en un comentario (y este archivo
 * menciona `whileInView` varias veces justamente en comentarios).
 */
describe("el mecanismo que congelaba el texto ya no está en el cuerpo", () => {
  const fuente = readFileSync(
    fileURLToPath(new URL("./text-reveal.tsx", import.meta.url)),
    "utf8",
  );

  const cuerpoDeTextReveal = (() => {
    const inicio = fuente.indexOf("export function TextReveal(");
    expect(inicio, "no se encontró TextReveal").toBeGreaterThan(-1);
    const cuerpo = fuente.slice(inicio);
    // Quitar comentarios de bloque y de línea antes de buscar.
    return cuerpo
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
  })();

  it("no usa whileInView (el gesto que con once:true no vuelve a disparar)", () => {
    expect(cuerpoDeTextReveal).not.toContain("whileInView");
  });

  it("no delega el escalonado a staggerChildren del contenedor", () => {
    expect(cuerpoDeTextReveal).not.toContain("staggerChildren");
  });

  it("cada palabra recibe su propio driver de animación", () => {
    expect(cuerpoDeTextReveal).toContain("palabraDeReveal(i, revelado");
  });

  it("sigue respetando reduced motion devolviendo texto plano", () => {
    expect(cuerpoDeTextReveal).toContain("useReducedMotion()");
    expect(cuerpoDeTextReveal).toMatch(
      /if \(reduce \|\| !text\) \{\s*return <span className=\{className\}>\{text\}<\/span>;/,
    );
  });
});
