import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EVENTOS_EMBUDO,
  claveOpaca,
  esEventoEmbudo,
  filtrarParametros,
} from "./embudo-regla";

describe("filtrarParametros", () => {
  it("descarta lo que no está en la lista permitida (nada de datos personales)", () => {
    const p = filtrarParametros("start_customization", {
      template_slug: "xv-con-salon",
      event_type: "XV años",
      is_guest: true,
      email: "a@b.com",
      nombre: "Ana",
    });
    expect(p).toEqual({
      template_slug: "xv-con-salon",
      event_type: "XV años",
      is_guest: true,
    });
  });

  it("descarta valores con el tipo equivocado y no coacciona", () => {
    expect(
      filtrarParametros("begin_checkout", { plan_code: "premium", value: "699", currency: "MXN" }),
    ).toEqual({ plan_code: "premium", currency: "MXN" });
    expect(filtrarParametros("begin_checkout", { value: Number.NaN })).toEqual({});
  });

  it("recorta los textos y quita caracteres de control", () => {
    const p = filtrarParametros("sign_up", { method: `  go\u0000ogle${"x".repeat(200)}` });
    expect((p?.method as string).length).toBe(80);
    expect(p?.method).not.toMatch(/\u0000/);
  });

  it("devuelve null para un evento desconocido, también page_view", () => {
    expect(filtrarParametros("page_view", { page_path: "/" })).toBeNull();
    expect(filtrarParametros("inventado", {})).toBeNull();
  });

  it("acepta parámetros ausentes", () => {
    expect(filtrarParametros("view_pricing", undefined)).toEqual({});
  });
});

describe("claveOpaca", () => {
  it("es estable, no contiene el id original y separa eventos", () => {
    const id = "6f1b2c3d-0000-4000-8000-123456789abc";
    const a = claveOpaca("purchase", id);
    expect(a).toBe(claveOpaca("purchase", id));
    expect(a).not.toContain(id);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(claveOpaca("begin_checkout", id));
  });
});

describe("EVENTOS_EMBUDO", () => {
  it("coincide con la lista de la migración 0063", () => {
    expect([...EVENTOS_EMBUDO].sort()).toEqual(
      [
        "view_category", "view_template", "start_customization", "sign_up",
        "complete_draft", "view_pricing", "begin_checkout", "payment_failed",
        "purchase",
      ].sort(),
    );
    expect(esEventoEmbudo("purchase")).toBe(true);
    expect(esEventoEmbudo("page_view")).toBe(false);
  });

  it("no se desfasa de la restricción CHECK de la migración", () => {
    const sql = readFileSync("supabase/migrations/0063_funnel_events.sql", "utf8");
    const bloque = sql.match(/check \(event in \(([^)]*)\)\)/)?.[1] ?? "";
    const enSql = [...bloque.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(enSql).toEqual([...EVENTOS_EMBUDO].sort());
  });
});
