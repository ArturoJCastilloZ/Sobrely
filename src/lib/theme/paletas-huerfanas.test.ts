import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { themeSchema } from "@/lib/theme/theme";

/**
 * Contrato de la `0046`, que rescata cinco paletas que nadie leía.
 *
 * El defecto: cinco plantillas —una por categoría— guardan `text`, `primary` y
 * `background` SUELTOS en la raíz de `theme_config`, no dentro de `colors`.
 * `themeSchema` lee `colors` como objeto anidado, así que esas claves no las
 * lee nadie: `parseTheme` aplica su `.default(...)` y las cinco se dibujan con
 * el tema por defecto ignorando lo que declaran. Nada peta; el color
 * simplemente no llega al render.
 *
 * Lo que se prueba aquí es que el arreglo produce algo que el esquema ACEPTA,
 * porque el fallo original fue justamente escribir una forma que el esquema
 * ignora en silencio.
 */

const SQL = readFileSync(
  join(process.cwd(), "supabase/migrations/0046_rescata_las_paletas_huerfanas.sql"),
  "utf8",
);

const cuerpo = SQL.slice(0, SQL.indexOf("-- ====", SQL.indexOf("values"))).replace(
  /\s+/g,
  " ",
);

/** Las cinco y el `secondary` que la migración les asigna. */
function filas(): { slug: string; secondary: string }[] {
  const re = /\('([a-z-]+)',\s*'(#[0-9a-f]{6})'\)/g;
  return [...SQL.matchAll(re)].map((m) => ({ slug: m[1], secondary: m[2] }));
}

describe("0046 · paletas huérfanas", () => {
  it("cubre las cinco, una por categoría", () => {
    expect(filas().map((f) => f.slug).sort()).toEqual([
      "baby-shower",
      "boda-elegante",
      "cumpleanos-moderno",
      "evento-corporativo",
      "xv-anos",
    ]);
  });

  it("el color que añade es un hex válido para el esquema", () => {
    // Si `secondary` no valida, zod tira el objeto `colors` ENTERO y la
    // plantilla vuelve al tema por defecto: el mismo fallo que veníamos a
    // arreglar, sólo que por otra puerta.
    for (const f of filas()) {
      const r = themeSchema.safeParse({
        colors: {
          text: "#111111",
          primary: "#222222",
          background: "#ffffff",
          secondary: f.secondary,
        },
      });
      expect(r.success, `${f.slug}: ${f.secondary}`).toBe(true);
      if (r.success) expect(r.data.colors.secondary).toBe(f.secondary);
    }
  });

  it("escribe `colors` ANIDADO, que es lo único que el esquema lee", () => {
    expect(cuerpo).toContain("jsonb_build_object('colors', jsonb_build_object(");
  });

  it("borra las claves sueltas, que son residuo", () => {
    expect(cuerpo).toContain("(t.theme_config - 'text' - 'primary' - 'background')");
  });

  it("no toca a quien ya tiene paleta por `colors` o por pack", () => {
    expect(cuerpo).toContain("and t.theme_config -> 'colors' is null");
    expect(cuerpo).toContain("and t.theme_config -> 'themePack' is null");
  });

  it("es una sola sentencia y devuelve las filas que tocó", () => {
    // Un `update` que no se ejecuta no da error: da «Success». Ya pasó con la
    // primera versión de la 0044.
    const sinComentarios = SQL.split("\n")
      .filter((l) => !l.trimStart().startsWith("--"))
      .join("\n");
    expect((sinComentarios.match(/;/g) ?? []).length).toBe(1);
    const updates = (sinComentarios.toLowerCase().match(/\bupdate\s+public\.templates\b/g) ?? []).length;
    const returnings = (sinComentarios.toLowerCase().match(/\breturning\b/g) ?? []).length;
    expect(updates).toBe(1);
    expect(returnings).toBe(updates);
  });

  it("toca cada fila UNA vez: sin CTEs que colisionen", () => {
    // La `0044` metió `cumpleanos-moderno` en sus DOS ramas del CTE. Actualizar
    // la misma fila dos veces en una sentencia no está soportado en Postgres:
    // sólo una modificación ocurre y la otra se descarta EN SILENCIO. Salieron
    // 9 filas en vez de 10 y no hubo ningún error.
    const slugs = filas().map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(cuerpo).not.toContain("with ");
  });
});
