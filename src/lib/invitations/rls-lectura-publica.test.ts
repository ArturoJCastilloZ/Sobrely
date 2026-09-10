import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * La 0053 retira la lectura pública directa de `invitations` e
 * `invitation_modules`. El peligro no es el `drop policy`: es el ORDEN.
 *
 * Tres policies HOY dependen de que el rol anónimo pueda leer `invitations`,
 * porque su expresión hace `exists (select 1 from invitations …)` y en
 * PostgreSQL la subconsulta de una policy se evalúa con la RLS del invocador.
 * Si los `drop` se aplican antes de mover esa comprobación a una función
 * `security definer`, el RSVP público deja de escribir y el muro de firmas se
 * queda vacío — las dos cosas en silencio, sin un error en ningún log.
 *
 * Estas pruebas no pueden ejecutar SQL (la base es de producción y la aplica el
 * dev a mano), así que defienden lo único defendible desde aquí: que el archivo
 * de migración no pueda quedarse a medias, y que nadie reintroduzca el `exists`
 * crudo en una policy pública.
 */

const DIR = new URL("../../../supabase/migrations/", import.meta.url);
const migracion = readFileSync(
  new URL("0053_cerrar_lectura_publica_directa.sql", DIR),
  "utf8",
);

/** El SQL sin comentarios: si no, una aserción se satisface con la prosa. */
const sql = migracion.replace(/--[^\n]*/g, "");

function posicion(aguja: RegExp): number {
  const m = sql.match(aguja);
  expect(m, `no se encontró ${aguja}`).not.toBeNull();
  return sql.indexOf(m![0]);
}

describe("0053 · el orden que evita romper producción", () => {
  it("crea las dos funciones definer ANTES de retirar las policies públicas", () => {
    const fnPublicada = posicion(/create or replace function public\.invitacion_esta_publicada/);
    const fnFirma = posicion(/create or replace function public\.firma_publica_permitida/);
    const dropInvitations = posicion(/drop policy if exists "invitations_select_published_public"/);
    const dropModules = posicion(/drop policy if exists "modules_select_published_public"/);

    expect(fnPublicada).toBeLessThan(dropInvitations);
    expect(fnPublicada).toBeLessThan(dropModules);
    expect(fnFirma).toBeLessThan(dropInvitations);
    expect(fnFirma).toBeLessThan(dropModules);
  });

  it("recrea las TRES policies dependientes antes de retirar las públicas", () => {
    const dropInvitations = posicion(/drop policy if exists "invitations_select_published_public"/);
    for (const nombre of [
      "rsvp_insert_published_public",
      "signatures_public_select",
      "signatures_public_insert",
    ]) {
      const creada = posicion(new RegExp(`create policy "${nombre}"`));
      expect(creada, `${nombre} se recrea después del drop`).toBeLessThan(dropInvitations);
    }
  });

  it("ninguna policy recreada conserva el `exists` crudo sobre invitations", () => {
    // Éste es el corazón: el `exists` es exactamente lo que deja de funcionar.
    const desde = posicion(/drop policy if exists "rsvp_insert_published_public"/);
    const bloqueDePolicies = sql.slice(desde);
    expect(bloqueDePolicies).not.toMatch(/select\s+1\s+from\s+public\.invitations/);
    expect(bloqueDePolicies).toMatch(/public\.invitacion_esta_publicada\(/);
    expect(bloqueDePolicies).toMatch(/public\.firma_publica_permitida\(/);
  });

  it("las dos funciones son `security definer` con `search_path` fijado", () => {
    // Sin `set search_path`, una función definer es una escalada esperando: el
    // llamante puede reapuntar los nombres de tabla.
    const cuerpos = sql.split("create or replace function").slice(1);
    expect(cuerpos).toHaveLength(2);
    for (const cuerpo of cuerpos) {
      const cabecera = cuerpo.slice(0, cuerpo.indexOf("as $$"));
      expect(cabecera).toMatch(/security definer/);
      expect(cabecera).toMatch(/set search_path = public/);
      expect(cabecera).toMatch(/\bstable\b/);
    }
  });

  it("sólo concede EXECUTE, nunca acceso a las tablas", () => {
    const grants = sql.match(/grant[^;]+;/g) ?? [];
    expect(grants.length).toBe(2);
    for (const g of grants) {
      expect(g).toMatch(/grant execute on function/);
      expect(g).not.toMatch(/\bon\s+table\b/);
      expect(g).not.toMatch(/\ball\b/);
    }
  });

  it("termina en una verificación que DEVUELVE filas", () => {
    // El dev aplica las migraciones a mano y necesita ver el efecto, no
    // suponerlo: «no tiró error» no es «quedó aplicada».
    const cola = sql.trimEnd();
    expect(cola.endsWith(";")).toBe(true);
    const ultimaSentencia = cola.slice(cola.lastIndexOf("select\n"));
    expect(ultimaSentencia).toMatch(/pg_policies/);
    expect(ultimaSentencia).toMatch(/esperado/);
  });
});

describe("ninguna otra migración deja una policy pública sobre esas dos tablas", () => {
  it("la 0053 es la última palabra: nadie la recrea después", () => {
    const posteriores = readdirSync(DIR)
      .filter((f) => f.endsWith(".sql") && /^\d{4}/.test(f))
      .filter((f) => Number(f.slice(0, 4)) > 53);
    // Hoy no hay ninguna; el día que haya, esta prueba obliga a mirarla.
    for (const f of posteriores) {
      const otro = readFileSync(new URL(f, DIR), "utf8").replace(/--[^\n]*/g, "");
      expect(otro, `${f} recrea la lectura pública`).not.toMatch(
        /create policy[^;]*on public\.(invitations|invitation_modules) for select[^;]*to [^;]*anon/,
      );
    }
  });
});
