import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLANS, planHasFeature } from "@/lib/billing/plans";

/**
 * La lista de invitados (`guest_management`) se cobra en DOS sitios: el servidor
 * lee `plans.ts` y la base, desde la 0071, lee `plan_tiene_lista_invitados`.
 * Las capacidades no están en la BD (0016 quitó `plans.features`), así que la
 * función SQL es una copia escrita a mano. Si alguien mueve la lista a otro plan
 * en `plans.ts` y no en SQL (o al revés), el servidor cobraría una cosa y la base
 * dejaría otra: esta prueba lo impide sin necesidad de una base.
 *
 * Se lee la ÚLTIMA definición de la función en las migraciones, que es la viva.
 */

const MIGRATIONS_DIR = "supabase/migrations";
const sinComentarios = (sql: string) => sql.replace(/--[^\n]*/g, "");

function definicionViva(): { archivo: string; cuerpo: string } {
  let ultima: { archivo: string; cuerpo: string } | null = null;
  for (const archivo of readdirSync(MIGRATIONS_DIR).sort()) {
    if (!archivo.endsWith(".sql")) continue;
    const sql = sinComentarios(readFileSync(join(MIGRATIONS_DIR, archivo), "utf8"));
    const re =
      /create or replace function public\.plan_tiene_lista_invitados\(p_plan_code text\)[\s\S]*?as \$\$([\s\S]*?)\$\$;/g;
    for (const m of sql.matchAll(re)) ultima = { archivo, cuerpo: m[1] };
  }
  if (!ultima) throw new Error("no hay definición de plan_tiene_lista_invitados");
  return ultima;
}

/** Los códigos de la lista `in ('a', 'b')` del cuerpo SQL. */
function codigosSql(cuerpo: string): string[] {
  const m = cuerpo.match(/p_plan_code in \(([^)]*)\)/);
  if (!m) throw new Error(`forma inesperada del cuerpo: ${cuerpo.trim()}`);
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
}

describe("plan_tiene_lista_invitados (SQL) ↔ guest_management (plans.ts)", () => {
  it("los planes con la lista son los mismos en las dos fuentes", () => {
    const { cuerpo } = definicionViva();
    const enCodigo = PLANS.filter((p) => planHasFeature(p, "guest_management"))
      .map((p) => p.code)
      .sort();
    expect(enCodigo.length).toBeGreaterThan(0);
    expect(codigosSql(cuerpo)).toEqual(enCodigo);
  });

  it("todo código del espejo SQL es un plan que existe", () => {
    const existentes = new Set(PLANS.map((p) => p.code));
    for (const c of codigosSql(definicionViva().cuerpo)) expect(existentes.has(c as never)).toBe(true);
  });
});

describe("migración 0071", () => {
  const sql = sinComentarios(
    readFileSync(join(MIGRATIONS_DIR, "0071_lista_invitados_solo_premium.sql"), "utf8"),
  );

  it("los disparadores cubren INSERT y UPDATE, y DELETE de invitados queda libre", () => {
    expect(sql).toMatch(/before insert or update on public\.invitations/);
    expect(sql).toMatch(/before insert or update on public\.invitation_guests/);
    expect(sql).not.toMatch(/before insert or update or delete on public\.invitation_guests/);
  });

  it("solo frena a anon y authenticated, con funciones SECURITY INVOKER", () => {
    expect(sql.match(/if current_user not in \('anon', 'authenticated'\) then/g)).toHaveLength(2);
    expect(sql).not.toMatch(/security definer\s*\n\s*set search_path/);
  });

  it("se autocomprueba y es idempotente", () => {
    expect(sql).toMatch(/drop trigger if exists invitaciones_lista_solo_premium/);
    expect(sql).toMatch(/drop trigger if exists invitados_lista_solo_premium/);
    expect(sql).toMatch(/raise exception '0071: publicar en modo lista sin Premium/);
    expect(sql).toMatch(/raise exception 'REVERTIR_0071'/);
  });
});
