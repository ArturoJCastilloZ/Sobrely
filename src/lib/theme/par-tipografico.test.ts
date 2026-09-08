import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  FONT_KEYS,
  FONT_STACKS,
  defaultTheme,
  parseTheme,
  resolveTypography,
  themeCssVars,
  type FontKey,
} from "@/lib/theme/theme";

/**
 * Par tipográfico de la invitación (Fase 11 · P4).
 *
 * El research midió que el esquema NO tenía con qué diferenciar tipografía:
 * `font` es un enum de CUATRO valores y **una sola familia para todo**, así que
 * la Fase 7 planeaba «emparejar» un campo que no existía. P4 crea el par.
 *
 * Lo que esta prueba defiende, en dos mitades:
 *
 * 1. **Retro-compatibilidad exacta.** Un tema sin `typography` —las 50
 *    plantillas de producción— tiene que renderizar IDÉNTICO. Verificado
 *    además por EFECTO: se recapturaron 4 miniaturas, una por cada valor de
 *    `font`, y los cuatro md5 salieron iguales byte a byte.
 *
 * 2. **Que el par llegue de verdad a los títulos.** Un md5 idéntico también es
 *    lo que se vería si la regla CSS no encajara con ningún elemento, así que
 *    se corrió el control positivo: forzando `heading: "script"` el md5 de
 *    `baby-shower-neutro` cambió (19daae70… → 3bcb7b54…) y el archivo bajó de
 *    33 a 30 KB. Esta prueba fija los dos extremos de esa cadena —la variable
 *    y quien la consume— porque en medio no hay nada que falle ruidosamente.
 */

const leer = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("retro-compatibilidad: sin `typography` no se mueve un píxel", () => {
  it.each(FONT_KEYS)("con font=%s, título y cuerpo son la misma familia", (f) => {
    const theme = parseTheme({ ...defaultTheme(), font: f });
    expect(theme.typography).toBeUndefined();

    const par = resolveTypography(theme);
    expect(par.heading).toBe(f);
    expect(par.body).toBe(f);

    const vars = themeCssVars(theme) as Record<string, string>;
    // Las tres tienen que valer lo mismo: es lo que hacía el render viejo,
    // que ponía un único `fontFamily` en la raíz y dejaba heredar los títulos.
    expect(vars["--inv-font-heading"]).toBe(FONT_STACKS[f]);
    expect(vars["--inv-font-body"]).toBe(FONT_STACKS[f]);
    expect(vars.fontFamily).toBe(FONT_STACKS[f]);
  });

  it("un theme_config viejo (sin la clave) parsea sin typography", () => {
    const theme = parseTheme({ font: "serif", colors: { primary: "#000000" } });
    expect(theme.typography).toBeUndefined();
    expect(resolveTypography(theme)).toEqual({ heading: "serif", body: "serif" });
  });
});

describe("el par, cuando se declara", () => {
  it("título y cuerpo pueden ser familias distintas", () => {
    const theme = parseTheme({
      ...defaultTheme(),
      font: "sans",
      typography: { heading: "elegant" as FontKey, body: "sans" as FontKey },
    });
    const vars = themeCssVars(theme) as Record<string, string>;
    expect(vars["--inv-font-heading"]).toBe(FONT_STACKS.elegant);
    expect(vars["--inv-font-body"]).toBe(FONT_STACKS.sans);
    // El cuerpo manda en la raíz; los títulos los cambia la regla de CSS.
    expect(vars.fontFamily).toBe(FONT_STACKS.sans);
    expect(vars["--inv-font-heading"]).not.toBe(vars["--inv-font-body"]);
  });

  it("una familia inventada no pasa el esquema y cae al tema por defecto", () => {
    const theme = parseTheme({ typography: { heading: "comic", body: "sans" } });
    expect(theme.typography).toBeUndefined();
  });
});

describe("la cadena hasta el título existe", () => {
  const css = leer("../../app/globals.css");
  const scope = leer("../../components/theme/theme-scope.tsx");

  it("ThemeScope marca su raíz con el gancho que el CSS busca", () => {
    // Sin quitar los comentarios esta prueba NO defiende nada: `inv-scope` se
    // menciona en el comentario que explica el gancho, así que borrar la clase
    // real la dejaba en verde. Cazado por mutación, y es la misma trampa que
    // ya costó tres pruebas huecas el 2026-09-07.
    const sinComentarios = scope
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(sinComentarios).toMatch(/"inv-scope[^"]*"/);
  });

  it("globals.css aplica --inv-font-heading a los títulos del scope", () => {
    const regla = css
      .split("\n")
      .find((l) => l.includes(".inv-scope") && l.includes("h1"));
    expect(regla, "falta la regla .inv-scope :is(h1..h6)").toBeTruthy();
    expect(css).toContain("var(--inv-font-heading, inherit)");
  });

  it("la regla NO toca tamaño ni interletraje", () => {
    // Meterlos aquí sobrescribiría `text-3xl` y `tracking-tight` de Tailwind, y
    // eso SÍ movería píxeles en las 50. La escala tipográfica es trabajo de P1.
    const i = css.indexOf(".inv-scope :is(h1");
    const bloque = css.slice(i, css.indexOf("}", i));
    expect(bloque).not.toContain("font-size");
    expect(bloque).not.toContain("letter-spacing");
  });
});
