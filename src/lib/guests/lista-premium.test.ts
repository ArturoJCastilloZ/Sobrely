import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanCode } from "@/lib/billing/types";

/**
 * La lista de invitados (link único y QR de acceso) es SOLO de Premium:
 * decisión del dueño del 2026-10-30, «Solo Premium».
 *
 * Aquí se EJECUTAN el gate (`canUseGuestManagement`), el de publicación
 * (`canPublishInvitation`) y las server actions de `./actions` con un doble de
 * Supabase, y se mira la consecuencia: con un plan sin la feature no se escribe
 * nada en la BD y la respuesta trae el camino a mejorar. Supabase aquí es solo
 * producción, así que no hay otra forma de verlo sin tocarla.
 */

type Escena = {
  /** Plan del entitlement activo; `null` = sin entitlement (Free). */
  plan: PlanCode | null;
  /** Dueño con comp de admin (`invitation_owner_is_comped`). */
  comped?: boolean;
  rsvpMode?: "open" | "guest_list";
};

let escena: Escena = { plan: null };
/** Escrituras que llegaron a la BD falsa: `tabla:operación`. */
let escrituras: string[] = [];

function clienteFalso() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    rpc: async (fn: string) => {
      if (fn === "invitation_owner_is_comped") {
        return { data: escena.comped === true, error: null };
      }
      return { data: null, error: null };
    },
    from(tabla: string) {
      let operacion = "select";
      const resultado = () => {
        if (operacion !== "select") {
          return { data: [{ id: "fila1" }], error: null };
        }
        if (tabla === "invitation_entitlements") {
          return {
            data: escena.plan
              ? {
                  status: "active",
                  expires_at: null,
                  guest_limit: null,
                  plan: { code: escena.plan },
                }
              : null,
          };
        }
        if (tabla === "invitations") {
          return {
            data: {
              id: "inv1",
              theme_config: {},
              rsvp_mode: escena.rsvpMode ?? "open",
            },
          };
        }
        if (tabla === "invitation_guests") {
          return {
            data: {
              id: "g1",
              invitation_id: "inv1",
              name: "Ana",
              max_guests: 2,
              checked_in_at: null,
              invited_at: null,
              reminder_count: 0,
            },
          };
        }
        // invitation_modules: la invitación solo tiene módulos de Free.
        return {
          data: [
            { module_type: "hero", is_visible: true, config: {} },
            { module_type: "rsvp", is_visible: true, config: {} },
          ],
        };
      };
      const cadena: Record<string, unknown> = {
        select: () => cadena,
        eq: () => cadena,
        order: () => cadena,
        insert: () => {
          operacion = "insert";
          escrituras.push(`${tabla}:insert`);
          return cadena;
        },
        update: () => {
          operacion = "update";
          escrituras.push(`${tabla}:update`);
          return cadena;
        },
        delete: () => {
          operacion = "delete";
          escrituras.push(`${tabla}:delete`);
          return cadena;
        },
        maybeSingle: async () => resultado(),
        single: async () => resultado(),
        // Esperar la cadena sin `maybeSingle` es leer una LISTA (`currentAllotment`).
        then: (r: (v: unknown) => unknown) => {
          const res = resultado();
          if (tabla === "invitation_guests" && operacion === "select") {
            return r({ data: [res.data] });
          }
          return r(res);
        },
      };
      return cadena;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => clienteFalso(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => clienteFalso(),
}));

const { canUseGuestManagement, canPublishInvitation } = await import(
  "@/lib/billing/entitlements"
);
const { getPlan, planHasFeature, minimalPlanForFeature } = await import(
  "@/lib/billing/plans"
);
const {
  setRsvpMode,
  addGuest,
  addGuestsBulk,
  editGuest,
  setGuestInvited,
  markGuestReminded,
  checkInByToken,
  setGuestCheckIn,
  deleteGuest,
} = await import("@/lib/guests/actions");
const { enlaceMejorarParaLista, ERROR_LISTA_REQUIERE_PREMIUM } = await import(
  "@/lib/guests/premium"
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cliente = () => clienteFalso() as any;

const SIN_PREMIUM: (PlanCode | null)[] = [null, "free", "esencial", "celebracion"];

beforeEach(() => {
  escena = { plan: null };
  escrituras = [];
});

describe("guest_management en plans.ts: solo Premium", () => {
  it("Premium la incluye; Celebración, Esencial y Free no", () => {
    expect(planHasFeature(getPlan("premium")!, "guest_management")).toBe(true);
    expect(planHasFeature(getPlan("celebracion")!, "guest_management")).toBe(false);
    expect(planHasFeature(getPlan("esencial")!, "guest_management")).toBe(false);
    expect(planHasFeature(getPlan("free")!, "guest_management")).toBe(false);
  });

  it("el plan mínimo que la desbloquea es Premium, y el checkout apunta a él", () => {
    expect(minimalPlanForFeature("guest_management")?.code).toBe("premium");
    expect(enlaceMejorarParaLista("inv1")).toBe(
      "/billing/checkout?plan=premium&invitation=inv1",
    );
  });
});

describe("canUseGuestManagement: gate por plan EFECTIVO de la invitación", () => {
  it("con entitlement Premium activo, sí", async () => {
    escena = { plan: "premium" };
    expect(await canUseGuestManagement(cliente(), "inv1")).toBe(true);
  });

  it.each(SIN_PREMIUM)("con plan %s, no", async (plan) => {
    escena = { plan };
    expect(await canUseGuestManagement(cliente(), "inv1")).toBe(false);
  });

  it("el comp de admin cuenta como Premium aunque no haya compra", async () => {
    escena = { plan: null, comped: true };
    expect(await canUseGuestManagement(cliente(), "inv1")).toBe(true);
  });
});

describe("publicar en modo lista de invitados exige Premium", () => {
  it("con Celebración no se publica y pide Premium", async () => {
    escena = { plan: "celebracion", rsvpMode: "guest_list" };
    const r = await canPublishInvitation(cliente(), "inv1");
    expect(r.allowed).toBe(false);
    expect(r.requiredPlanCode).toBe("premium");
    expect(r.reason).toContain("lista de invitados");
  });

  it("control: la MISMA invitación en confirmación abierta sí publica con Celebración", async () => {
    escena = { plan: "celebracion", rsvpMode: "open" };
    expect((await canPublishInvitation(cliente(), "inv1")).allowed).toBe(true);
  });

  it("con Premium se publica", async () => {
    escena = { plan: "premium", rsvpMode: "guest_list" };
    expect((await canPublishInvitation(cliente(), "inv1")).allowed).toBe(true);
  });
});

describe("server actions de la lista: rechazan sin Premium y no escriben", () => {
  const acciones = {
    "setRsvpMode(guest_list)": () => setRsvpMode("inv1", "guest_list"),
    addGuest: () =>
      addGuest({ invitationId: inv(), name: "Ana", maxGuests: 1, phone: "" }),
    addGuestsBulk: () => addGuestsBulk({ invitationId: inv(), raw: "Ana, 2" }),
    editGuest: () =>
      editGuest({ id: inv(), name: "Ana", maxGuests: 1, phone: "" }),
    setGuestInvited: () => setGuestInvited("g1", true),
    markGuestReminded: () => markGuestReminded("g1"),
    checkInByToken: () => checkInByToken("a".repeat(32)),
    setGuestCheckIn: () => setGuestCheckIn("g1", true),
  };

  for (const [nombre, correr] of Object.entries(acciones)) {
    it(`${nombre}: Celebración → rechazo con camino a Premium, sin escrituras`, async () => {
      escena = { plan: "celebracion", rsvpMode: "guest_list" };
      const r = await correr();
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toBe(ERROR_LISTA_REQUIERE_PREMIUM);
      expect(r.mejorarHref).toMatch(
        /^\/billing\/checkout\?plan=premium&invitation=[\w-]+$/,
      );
      expect(escrituras).toEqual([]);
    });

    it(`${nombre}: Premium → pasa y escribe`, async () => {
      escena = { plan: "premium", rsvpMode: "guest_list" };
      const r = await correr();
      expect(r.ok).toBe(true);
      expect(escrituras.length).toBeGreaterThan(0);
    });
  }

  it("volver a confirmación abierta NO exige Premium (es la salida)", async () => {
    escena = { plan: "esencial", rsvpMode: "guest_list" };
    expect((await setRsvpMode("inv1", "open")).ok).toBe(true);
    expect(escrituras).toEqual(["invitations:update"]);
  });

  it("borrar un invitado NO exige Premium (es la salida)", async () => {
    escena = { plan: null, rsvpMode: "guest_list" };
    expect((await deleteGuest("g1")).ok).toBe(true);
    expect(escrituras).toEqual(["invitation_guests:delete"]);
  });
});

/** Uuid válido para los esquemas zod que lo exigen. */
function inv() {
  return "00000000-0000-4000-8000-000000000001";
}
