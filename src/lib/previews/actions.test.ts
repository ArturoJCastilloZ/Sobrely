import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `crearVistaPrevia` y `revocarVistasPrevias` EJECUTADAS con dobles de Supabase.
 * Lo que se mira es la consecuencia: qué se escribe en la tabla (y, sobre todo,
 * que el token en claro NO se escribe), y que una invitación ajena no toca nada.
 */
type Estado = {
  usuario: { id: string } | null;
  esSuya: boolean;
  vigentes: number;
  errorConteo: { message: string } | null;
  insertDevuelve: { data: { id: string }[] | null; error: { message: string } | null };
  revocaDevuelve: { data: { id: string }[] | null; error: { message: string } | null };
};
let estado: Estado;
const escrito = {
  inserts: [] as Record<string, unknown>[],
  updates: [] as Record<string, unknown>[],
  filtrosConteo: [] as string[],
};

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => (k === "host" ? "sobrely.test" : null) }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: estado.usuario } }) },
    from: () => {
      const c = {
        select: () => c,
        eq: () => c,
        maybeSingle: async () => ({ data: estado.esSuya ? { id: "inv1" } : null, error: null }),
      };
      return c;
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabla: string) => {
      expect(tabla).toBe("invitation_previews");
      const q = {
        // conteo: select(..., {head}) .eq .is .gt → resultado
        select: (_c: string, opts?: { head?: boolean }) => {
          if (opts?.head) {
            const conteo = {
              eq: () => conteo,
              is: (col: string) => (escrito.filtrosConteo.push(`is:${col}`), conteo),
              gt: (col: string) => (escrito.filtrosConteo.push(`gt:${col}`), conteo),
              then: (res: (v: unknown) => void) =>
                res({ count: estado.vigentes, error: estado.errorConteo }),
            };
            return conteo;
          }
          return q;
        },
        insert: (fila: Record<string, unknown>) => {
          escrito.inserts.push(fila);
          return { select: async () => estado.insertDevuelve };
        },
        update: (valores: Record<string, unknown>) => {
          escrito.updates.push(valores);
          const u = { eq: () => u, is: () => u, select: async () => estado.revocaDevuelve };
          return u;
        },
      };
      return q;
    },
  }),
}));

import { crearVistaPrevia, revocarVistasPrevias } from "@/lib/previews/actions";
import { hashToken, MAX_LIGAS_VIGENTES, tieneFormatoDeToken } from "@/lib/previews/token";

beforeEach(() => {
  estado = {
    usuario: { id: "u1" },
    esSuya: true,
    vigentes: 0,
    errorConteo: null,
    insertDevuelve: { data: [{ id: "p1" }], error: null },
    revocaDevuelve: { data: [{ id: "p1" }, { id: "p2" }], error: null },
  };
  escrito.inserts = [];
  escrito.updates = [];
  escrito.filtrosConteo = [];
  process.env.NEXT_PUBLIC_SITE_URL = "https://sobrely.test/";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("crearVistaPrevia", () => {
  it("crea la liga: URL absoluta con el token, y en la base queda SOLO el hash", async () => {
    const r = await crearVistaPrevia("inv1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const m = r.url.match(/^https:\/\/sobrely\.test\/vista-previa\/([A-Za-z0-9_-]+)$/);
    expect(m, r.url).not.toBeNull();
    const token = m![1];
    expect(tieneFormatoDeToken(token)).toBe(true);

    expect(escrito.inserts).toHaveLength(1);
    const fila = escrito.inserts[0];
    expect(fila.token_hash).toBe(hashToken(token));
    // El token en claro NO se escribe en ninguna columna.
    expect(JSON.stringify(fila)).not.toContain(token);
    expect(fila.invitation_id).toBe("inv1");
  });

  it("vence a los 7 días y lo devuelve", async () => {
    const antes = Date.now();
    const r = await crearVistaPrevia("inv1");
    if (!r.ok) throw new Error("debía crear");
    const dias = (new Date(r.expiresAt).getTime() - antes) / 86_400_000;
    expect(dias).toBeGreaterThan(6.99);
    expect(dias).toBeLessThan(7.01);
    expect(escrito.inserts[0].expires_at).toBe(r.expiresAt);
  });

  it("cada llamada crea una liga DISTINTA (el token no se puede volver a mostrar)", async () => {
    const a = await crearVistaPrevia("inv1");
    const b = await crearVistaPrevia("inv1");
    if (!a.ok || !b.ok) throw new Error("debían crear");
    expect(a.url).not.toBe(b.url);
    expect(escrito.inserts[0].token_hash).not.toBe(escrito.inserts[1].token_hash);
  });

  it("sin sesión: error y NADA escrito", async () => {
    estado.usuario = null;
    const r = await crearVistaPrevia("inv1");
    expect(r).toEqual({ ok: false, error: "Sesión expirada." });
    expect(escrito.inserts).toHaveLength(0);
  });

  it("invitación AJENA: error y NADA escrito", async () => {
    estado.esSuya = false;
    const r = await crearVistaPrevia("inv-de-otro");
    expect(r.ok).toBe(false);
    expect(escrito.inserts).toHaveLength(0);
  });

  it(`con ${MAX_LIGAS_VIGENTES} ligas vigentes no crea otra`, async () => {
    estado.vigentes = MAX_LIGAS_VIGENTES;
    const r = await crearVistaPrevia("inv1");
    expect(r.ok).toBe(false);
    expect(escrito.inserts).toHaveLength(0);
  });

  it("con una menos del tope sí crea", async () => {
    estado.vigentes = MAX_LIGAS_VIGENTES - 1;
    expect((await crearVistaPrevia("inv1")).ok).toBe(true);
  });

  it("el conteo solo cuenta las VIGENTES: ni revocadas ni vencidas", async () => {
    await crearVistaPrevia("inv1");
    expect(escrito.filtrosConteo).toContain("is:revoked_at");
    expect(escrito.filtrosConteo).toContain("gt:expires_at");
  });

  it("migración sin aplicar (error al contar): mensaje amable, nada escrito, sin romper", async () => {
    estado.errorConteo = { message: 'relation "invitation_previews" does not exist' };
    const r = await crearVistaPrevia("inv1");
    expect(r).toEqual({
      ok: false,
      error: "La vista previa todavía no está disponible. Inténtalo más tarde.",
    });
    expect(escrito.inserts).toHaveLength(0);
  });

  it("un insert que NO escribe filas no se entrega como si sirviera", async () => {
    estado.insertDevuelve = { data: [], error: null };
    const r = await crearVistaPrevia("inv1");
    expect(r.ok).toBe(false);
  });

  it("un error del insert tampoco entrega una liga", async () => {
    estado.insertDevuelve = { data: null, error: { message: "boom" } };
    expect((await crearVistaPrevia("inv1")).ok).toBe(false);
  });

  it("sin la variable de sitio, el origen sale de la petición", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const r = await crearVistaPrevia("inv1");
    if (!r.ok) throw new Error("debía crear");
    expect(r.url.startsWith("http://sobrely.test/vista-previa/")).toBe(true);
  });
});

describe("revocarVistasPrevias", () => {
  it("revoca y devuelve cuántas", async () => {
    const r = await revocarVistasPrevias("inv1");
    expect(r).toEqual({ ok: true, revocadas: 2 });
    expect(escrito.updates).toHaveLength(1);
    expect(typeof escrito.updates[0].revoked_at).toBe("string");
  });

  it("sin ligas que revocar devuelve 0, no un error", async () => {
    estado.revocaDevuelve = { data: [], error: null };
    expect(await revocarVistasPrevias("inv1")).toEqual({ ok: true, revocadas: 0 });
  });

  it("sin sesión o con invitación ajena: no escribe NADA", async () => {
    estado.usuario = null;
    expect((await revocarVistasPrevias("inv1")).ok).toBe(false);
    estado.usuario = { id: "u1" };
    estado.esSuya = false;
    expect((await revocarVistasPrevias("inv-de-otro")).ok).toBe(false);
    expect(escrito.updates).toHaveLength(0);
  });

  it("un error de la base se reporta como error, no como «0 revocadas»", async () => {
    estado.revocaDevuelve = { data: null, error: { message: "boom" } };
    expect((await revocarVistasPrevias("inv1")).ok).toBe(false);
  });
});
