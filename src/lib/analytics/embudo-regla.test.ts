import { readFileSync, readdirSync } from "node:fs";
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

  it("conserva con_datos (vista rápida) y descarta lo que no sea booleano", () => {
    expect(filtrarParametros("start_customization", { template_slug: "x", con_datos: true })).toEqual({
      template_slug: "x",
      con_datos: true,
    });
    expect(filtrarParametros("start_customization", { con_datos: "sí" })).toEqual({});
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
  it("coincide con la restricción CHECK de la ÚLTIMA migración que la define", () => {
    // La 0063 la crea y las siguientes (0066…) la amplían: manda la más reciente.
    const archivos = readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const ultima = archivos
      .filter((f) => /add constraint funnel_events_event_chk|constraint funnel_events_event_chk check/.test(readFileSync(`supabase/migrations/${f}`, "utf8")))
      .pop();
    expect(ultima, "ninguna migración define funnel_events_event_chk").toBeDefined();
    const sql = readFileSync(`supabase/migrations/${ultima}`, "utf8");
    const bloque = sql.match(/event_chk\s+check \(event in \(([^)]*)\)\)/)?.[1] ?? "";
    const enSql = [...bloque.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(enSql).toEqual([...EVENTOS_EMBUDO].sort());
    expect(esEventoEmbudo("purchase")).toBe(true);
    expect(esEventoEmbudo("page_view")).toBe(false);
  });
});
