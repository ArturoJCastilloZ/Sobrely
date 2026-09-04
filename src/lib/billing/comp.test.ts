import { describe, expect, it } from "vitest";
import {
  canAddGuest,
  getInvitationEffectivePlan,
  isEntitlementActive,
  isOwnerComped,
} from "@/lib/billing/entitlements";

/**
 * El comp de admin vive en la BD (migración 0013). Estas pruebas fijan el
 * CONTRATO del lado TS: que consuma la RPC `invitation_owner_is_comped` y no
 * reimplemente la regla — la divergencia TS/SQL fue justo el bug que se arregló.
 */

type Row = Record<string, unknown>;

interface FakeOpts {
  /** Respuesta de la RPC del comp. `"error"` simula fallo. */
  comped: boolean | "error";
  /** Fila de `invitation_entitlements`, o null si no hay. */
  entitlement?: Row | null;
  /** Filas de `rsvp_responses`. */
  rsvp?: Row[];
}

/** Cliente Supabase mínimo: solo lo que tocan las funciones bajo prueba. */
function fakeClient(opts: FakeOpts) {
  const calls: string[] = [];

  function builder(result: { data: unknown }) {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => result,
      then: (
        resolve: (v: { data: unknown }) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    return chain;
  }

  return {
    calls,
    rpc: async (name: string) => {
      calls.push(`rpc:${name}`);
      if (opts.comped === "error") {
        return { data: null, error: { message: "boom" } };
      }
      return { data: opts.comped, error: null };
    },
    from: (table: string) => {
      calls.push(`from:${table}`);
      if (table === "invitation_entitlements") {
        return builder({ data: opts.entitlement ?? null });
      }
      if (table === "rsvp_responses") {
        return builder({ data: opts.rsvp ?? [] });
      }
      return builder({ data: null });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/** Entitlement Free vigente, como el que crea la publicación DEMO. */
const FREE_DEMO_ENTITLEMENT: Row = {
  status: "active",
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  guest_limit: 25,
  plan: { code: "free" },
};

describe("comp de admin — el TS consume la fuente SQL", () => {
  it("pregunta a la RPC de la BD, no reimplementa la regla", async () => {
    const c = fakeClient({ comped: true });
    expect(await isOwnerComped(c, "inv-1")).toBe(true);
    expect(c.calls).toContain("rpc:invitation_owner_is_comped");
    // No resuelve el dueño ni lee admin_users por su cuenta.
    expect(c.calls).not.toContain("from:admin_users");
  });

  it("fail-closed: si la RPC falla, NO hay comp", async () => {
    const c = fakeClient({ comped: "error" });
    expect(await isOwnerComped(c, "inv-1")).toBe(false);
    expect((await getInvitationEffectivePlan(c, "inv-1")).code).toBe("free");
  });

  it("dueño admin → plan efectivo Premium aunque no haya comprado", async () => {
    const c = fakeClient({ comped: true, entitlement: null });
    expect((await getInvitationEffectivePlan(c, "inv-1")).code).toBe("premium");
  });

  it("dueño admin → entitlement vigente (visibilidad pública sin compra)", async () => {
    const c = fakeClient({ comped: true, entitlement: null });
    expect(await isEntitlementActive(c, "inv-1")).toBe(true);
  });

  it("sin comp y sin entitlement → Free", async () => {
    const c = fakeClient({ comped: false, entitlement: null });
    expect((await getInvitationEffectivePlan(c, "inv-1")).code).toBe("free");
    expect(await isEntitlementActive(c, "inv-1")).toBe(false);
  });

  it("sin comp: manda el entitlement comprado", async () => {
    const c = fakeClient({
      comped: false,
      entitlement: { ...FREE_DEMO_ENTITLEMENT, plan: { code: "celebracion" } },
    });
    expect((await getInvitationEffectivePlan(c, "inv-1")).code).toBe(
      "celebracion",
    );
  });
});

describe("canAddGuest — el tope con comp no cae al snapshot Free", () => {
  it("comp con demo Free encima → sin tope (Premium), no 25", async () => {
    const c = fakeClient({
      comped: true,
      entitlement: FREE_DEMO_ENTITLEMENT,
      rsvp: [{ guest_count: 30 }],
    });
    const check = await canAddGuest(c, "inv-1", 1);
    // Premium es ilimitado: `null`. Lo que esta prueba defiende es que NO se
    // caiga al snapshot Free de la fila, sea cual sea el tope de Premium.
    expect(check.limit).toBeNull();
    expect(check.limit).not.toBe(25);
    expect(check.remaining).toBeNull();
    expect(check.used).toBe(30);
    expect(check.allowed).toBe(true);
  });

  it("un plan sin tope deja pasar una petición enorme", async () => {
    const c = fakeClient({
      comped: true,
      entitlement: FREE_DEMO_ENTITLEMENT,
      rsvp: [{ guest_count: 900 }],
    });
    const check = await canAddGuest(c, "inv-1", 500);
    expect(check.allowed).toBe(true);
    expect(check.used).toBe(900);
  });

  it("sin comp → respeta el guest_limit de la fila", async () => {
    const c = fakeClient({
      comped: false,
      entitlement: FREE_DEMO_ENTITLEMENT,
      rsvp: [{ guest_count: 25 }],
    });
    const check = await canAddGuest(c, "inv-1", 1);
    expect(check.limit).toBe(25);
    expect(check.allowed).toBe(false);
    expect(check.remaining).toBe(0);
  });

  it("sin comp y sin entitlement → tope del plan Free", async () => {
    const c = fakeClient({ comped: false, entitlement: null, rsvp: [] });
    expect((await canAddGuest(c, "inv-1", 1)).limit).toBe(25);
  });
});
