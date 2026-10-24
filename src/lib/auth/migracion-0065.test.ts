import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * La 0062 dejó el candado «un anónimo no publica» solo en UPDATE y la 0065 lo extiende a
 * INSERT. El comportamiento real se probó contra la base (transacciones con JWT anónimo, ver
 * el encabezado de la migración); esto impide que una edición futura lo vuelva a dejar a medias.
 */
const sql = readFileSync("supabase/migrations/0065_anonimo_no_inserta_publicada.sql", "utf8");
const sin_comentarios = sql.replace(/--[^\n]*/g, "");

describe("migración 0065", () => {
  it("el disparador cubre INSERT y UPDATE", () => {
    expect(sin_comentarios).toMatch(/before insert or update on public\.invitations/);
  });

  it("la función distingue el INSERT, donde no existe `old`", () => {
    expect(sin_comentarios).toMatch(/tg_op = 'INSERT'/);
    // En el camino del INSERT no se puede leer `old` (error: «record old is not assigned yet»).
    const insert = sin_comentarios.slice(
      sin_comentarios.indexOf("tg_op = 'INSERT'"),
      sin_comentarios.indexOf("elsif"),
    );
    expect(insert).not.toMatch(/\bold\./);
  });

  it("rechaza con el mismo código que usa el servidor y solo para anónimos", () => {
    expect(sin_comentarios).toMatch(/if public\.es_sesion_anonima\(\) then/);
    expect(sin_comentarios).toMatch(/ANONIMO_NO_PUBLICA/);
  });

  it("se autocomprueba y es idempotente", () => {
    expect(sin_comentarios).toMatch(/raise exception 'invitaciones_anonimo_no_publica/);
    expect(sin_comentarios).toMatch(/create or replace function/);
    expect(sin_comentarios).toMatch(/drop trigger if exists invitaciones_anonimo_no_publica/);
  });
});
