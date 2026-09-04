import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Valida el CÓDIGO contra el ESQUEMA de `public.plans`, sin base de datos.
 *
 * Contexto: `0016` eliminó `allowed_modules` y `features` de la tabla porque
 * eran una segunda copia de lo que ya define `plans.ts`, y se habían quedado
 * viejas sin que nadie lo notara. El riesgo que queda es el inverso: que
 * alguien vuelva a pedirle a la BD una columna que ya no existe. Supabase
 * devolvería un error de columna inexistente en tiempo de ejecución, y en un
 * `select` mal manejado eso se traduce en `data: null` — es decir, un fallo
 * silencioso en el camino del dinero.
 *
 * Esta prueba deriva las columnas VIVAS de las migraciones y las compara contra
 * lo que el código realmente selecciona.
 */

const MIGRATIONS_DIR = "supabase/migrations";
const SRC_DIR = "src";

/** Columnas de `public.plans` según `create table` en 0006. */
function declaredColumns(): Set<string> {
  const sql = readFileSync(
    join(MIGRATIONS_DIR, "0006_monetization.sql"),
    "utf8",
  );
  const start = sql.indexOf("create table if not exists public.plans (");
  expect(start, "no se encontró el create table de plans").toBeGreaterThan(-1);
  const end = sql.indexOf("\n);", start);
  const block = sql.slice(start, end);

  const cols = new Set<string>();
  for (const raw of block.split("\n").slice(1)) {
    const line = raw.trim();
    // Se ignoran comentarios y cláusulas que no declaran columna.
    if (!line || line.startsWith("--") || line.startsWith("constraint")) continue;
    const m = line.match(/^([a-z_]+)\s+[a-z]/);
    if (m) cols.add(m[1]);
  }
  return cols;
}

/** Columnas que alguna migración posterior elimina de `plans`. */
function droppedColumns(): Set<string> {
  const dropped = new Set<string>();
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // Solo los `alter table ... plans` reales, no los comentarios que muestran
    // cómo revertir (van prefijados con `--`).
    const alterBlocks = sql
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .split(/alter\s+table\s+public\.plans/i)
      .slice(1);
    for (const block of alterBlocks) {
      const upTo = block.slice(0, block.indexOf(";") + 1);
      for (const m of upTo.matchAll(
        /drop\s+column\s+(?:if\s+exists\s+)?([a-z_]+)/gi,
      )) {
        dropped.add(m[1]);
      }
    }
  }
  return dropped;
}

/** Todos los archivos .ts/.tsx bajo src. */
function sourceFiles(dir = SRC_DIR): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Columnas que el código le pide a la tabla `plans`. */
function selectedColumns(): { file: string; column: string }[] {
  const found: { file: string; column: string }[] = [];
  const re = /\.from\(\s*["']plans["']\s*\)\s*\.select\(\s*["']([^"']+)["']/g;
  for (const file of sourceFiles()) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) {
      for (const col of m[1].split(",")) {
        const name = col.trim();
        if (name && name !== "*") found.push({ file, column: name });
      }
    }
  }
  return found;
}

describe("esquema de public.plans vs. el código", () => {
  const declared = declaredColumns();
  const dropped = droppedColumns();
  const alive = new Set([...declared].filter((c) => !dropped.has(c)));

  it("el create table de plans se parsea bien", () => {
    // Ancla mínima: si el parser se rompe, el resto de la prueba miente.
    expect(declared.has("code")).toBe(true);
    expect(declared.has("id")).toBe(true);
    expect(declared.size).toBeGreaterThan(10);
  });

  it("0016 elimina allowed_modules y features", () => {
    expect([...dropped].sort()).toEqual(["allowed_modules", "features"]);
    expect(alive.has("allowed_modules")).toBe(false);
    expect(alive.has("features")).toBe(false);
  });

  it("el detector encuentra las lecturas reales de la tabla", () => {
    // Guarda del guardián: si el regex deja de emparejar, las dos pruebas de
    // abajo pasarían con una lista vacía sin revisar nada.
    const found = selectedColumns();
    expect(found.length, "no se detectó ninguna lectura de plans").toBeGreaterThanOrEqual(3);
    expect(new Set(found.map((f) => f.file)).size).toBeGreaterThanOrEqual(3);
  });

  it("el código solo selecciona columnas que siguen existiendo", () => {
    const offenders = selectedColumns()
      .filter(({ column }) => !alive.has(column))
      .map(({ file, column }) => `${file} pide "${column}", que ya no existe`);
    expect(offenders).toEqual([]);
  });

  it("nadie lee las listas de la BD: la fuente es plans.ts", () => {
    // Lo que motivó el drop. Si vuelve a aparecer, hay dos fuentes de verdad.
    const asked = selectedColumns().map((s) => s.column);
    expect(asked).not.toContain("features");
    expect(asked).not.toContain("allowed_modules");
    expect(asked).not.toContain("coming_soon");
  });
});
