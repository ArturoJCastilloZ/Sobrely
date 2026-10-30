import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanCode } from "@/lib/billing/types";

/**
 * La lista de invitados (link único y QR de acceso) es de Premium, y se cobra
 * AL PUBLICAR: decisiones del dueño del 2026-10-30, «Solo Premium» y «Sí,
 * Premium al publicar». Un borrador la arma gratis; publicada sin Premium no;
 * el ingreso en la puerta (QR y manual) solo con Premium.
 *
 * Aquí se EJECUTAN los gates (`canUseGuestManagement`, `canManageGuestList`),
 * el de publicación (`canPublishInvitation`) y las server actions de
 * `./actions` con un doble de Supabase, y se mira la consecuencia: cuando el
 * gate rechaza no se escribe nada en la BD y la respuesta trae el camino a
 * mejorar. Supabase aquí es solo producción, así que no hay otra forma de
 * verlo sin tocarla.
 */

type Escena = {
  /** Plan del entitlement activo; `null` = sin entitlement (Free). */
  plan: PlanCode | null;
  /** Dueño con comp de admin (`invitation_owner_is_comped`). */
  comped?: boolean;
  rsvpMode?: "open" | "guest_list";
  /** `invitations.is_published`. Por omisión, borrador. */
  publicada?: boolean;
  /** La invitación no se puede leer (RLS o no existe). */
  sinInvitacion?: boolean;
  /**
   * Estado de la fila AL ESCRIBIR, si cambió después de que la acción la leyó:
   * otra pestaña publicó o activó la lista en medio (TOCTOU). Un update con
   * `.eq()` sobre esa columna afecta 0 filas si ya no coincide.
   */
  alEscribir?: { publicada?: boolean; rsvpMode?: "open" | "guest_list" };
  /** Suma de `max_guests` que ya hay en la lista (una sola fila). */
  lugaresUsados?: number;
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
      /** Filtros de la escritura: columna y valores admitidos (`eq` = uno). */
      const filtros: [string, unknown[]][] = [];
      const resultado = () => {
        if (operacion !== "select") {
          if (tabla === "invitations" && operacion === "update") {
            const fila = {
              is_published:
                escena.alEscribir?.publicada ?? escena.publicada ?? false,
              rsvp_mode:
                escena.alEscribir?.rsvpMode ?? escena.rsvpMode ?? "open",
            };
            const coincide = filtros.every(([col, vals]) =>
              col in fila
                ? vals.includes(fila[col as keyof typeof fila])
                : true,
            );
            if (!coincide) return { data: [], error: null };
          }
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
          if (escena.sinInvitacion) return { data: null };
          return {
            data: {
              id: "inv1",
              theme_config: {},
              rsvp_mode: escena.rsvpMode ?? "open",
              is_published: escena.publicada ?? false,
            },
          };
        }
        if (tabla === "invitation_guests") {
          return {
            data: {
              id: "g1",
              invitation_id: "inv1",
              name: "Ana",
              max_guests: escena.lugaresUsados ?? 2,
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
        eq: (col: string, val: unknown) => {
          filtros.push([col, [val]]);
          return cadena;
        },
        in: (col: string, vals: unknown[]) => {
          filtros.push([col, vals]);
          return cadena;
        },
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
// `setPublished` revalida rutas y registra errores: fuera de Next no aplica.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/errores/registrar", () => ({ registrarError: async () => {} }));

const { canUseGuestManagement, canManageGuestList, canPublishInvitation } =
  await import("@/lib/billing/entitlements");
const { planDePagoRequerido } = await import("@/lib/billing/plan-requerido");
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
  accesoALista,
} = await import("@/lib/guests/actions");
const {
  enlaceMejorarParaLista,
  ERROR_LISTA_REQUIERE_PREMIUM,
  ERROR_PUBLICAR_LISTA_REQUIERE_PREMIUM,
  TOPE_LISTA_EN_BORRADOR,
} = await import("@/lib/guests/premium");
const { setPublished } = await import("@/lib/invitations/actions");
const { MAX_GUESTS_PER_BULK } = await import("@/lib/guests/schemas");

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

describe("canManageGuestList: armar la lista = Premium O borrador", () => {
  it.each(SIN_PREMIUM)("borrador con plan %s: sí (se cobra al publicar)", async (plan) => {
    escena = { plan, publicada: false };
    expect(await canManageGuestList(cliente(), "inv1")).toBe(true);
  });

  it.each(SIN_PREMIUM)("publicada con plan %s: no", async (plan) => {
    escena = { plan, publicada: true };
    expect(await canManageGuestList(cliente(), "inv1")).toBe(false);
  });

  it("publicada con Premium: sí", async () => {
    escena = { plan: "premium", publicada: true };
    expect(await canManageGuestList(cliente(), "inv1")).toBe(true);
  });

  it("publicada con comp de admin: sí", async () => {
    escena = { plan: null, comped: true, publicada: true };
    expect(await canManageGuestList(cliente(), "inv1")).toBe(true);
  });

  it("fail-closed: si no se puede leer la invitación, no", async () => {
    escena = { plan: null, sinInvitacion: true };
    expect(await canManageGuestList(cliente(), "inv1")).toBe(false);
  });
});

describe("publicar en modo lista sin Premium sigue bloqueado", () => {
  it.each(["esencial", "celebracion"] as const)(
    "borrador armado gratis con %s: no publica y pide Premium",
    async (plan) => {
      escena = { plan, rsvpMode: "guest_list", publicada: false };
      const r = await canPublishInvitation(cliente(), "inv1");
      expect(r.allowed).toBe(false);
      expect(r.requiredPlanCode).toBe("premium");
    },
  );

  it("sin plan, el checkout para publicar una invitación con lista es Premium", () => {
    const plan = planDePagoRequerido({
      modulosVisibles: ["hero", "rsvp"],
      usaArtePropio: false,
      usaListaDeInvitados: true,
    });
    expect(plan?.code).toBe("premium");
  });
});

/** Acciones que ARMAN la lista: libres en borrador, Premium al publicar. */
const accionesDeArmar = {
  "setRsvpMode(guest_list)": () => setRsvpMode("inv1", "guest_list"),
  addGuest: () =>
    addGuest({ invitationId: inv(), name: "Ana", maxGuests: 1, phone: "" }),
  addGuestsBulk: () => addGuestsBulk({ invitationId: inv(), raw: "Ana, 2" }),
  editGuest: () =>
    editGuest({ id: inv(), name: "Ana", maxGuests: 1, phone: "" }),
  setGuestInvited: () => setGuestInvited("g1", true),
  markGuestReminded: () => markGuestReminded("g1"),
};

/** Ingreso en la puerta: solo Premium, publicada o no. */
const accionesDeIngreso = {
  checkInByToken: () => checkInByToken("a".repeat(32)),
  setGuestCheckIn: () => setGuestCheckIn("g1", true),
};

async function esperarRechazoSinEscribir(
  r: Awaited<ReturnType<(typeof accionesDeArmar)["addGuest"]>>,
) {
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.error).toBe(ERROR_LISTA_REQUIERE_PREMIUM);
  expect(r.mejorarHref).toMatch(
    /^\/billing\/checkout\?plan=premium&invitation=[\w-]+$/,
  );
  expect(escrituras).toEqual([]);
}

describe("server actions que ARMAN la lista", () => {
  for (const [nombre, correr] of Object.entries(accionesDeArmar)) {
    it.each(SIN_PREMIUM)(
      `${nombre}: borrador con plan %s → pasa y escribe`,
      async (plan) => {
        escena = { plan, rsvpMode: "guest_list", publicada: false };
        const r = await correr();
        expect(r).toEqual({ ok: true });
        expect(escrituras.length).toBeGreaterThan(0);
      },
    );

    it.each(["esencial", "celebracion"] as const)(
      `${nombre}: publicada con %s → rechazo con camino a Premium, sin escrituras`,
      async (plan) => {
        escena = { plan, rsvpMode: "guest_list", publicada: true };
        await esperarRechazoSinEscribir(await correr());
      },
    );

    it(`${nombre}: publicada con Premium → pasa y escribe`, async () => {
      escena = { plan: "premium", rsvpMode: "guest_list", publicada: true };
      const r = await correr();
      expect(r.ok).toBe(true);
      expect(escrituras.length).toBeGreaterThan(0);
    });
  }

  it("el borrador gratis se arma con el cupo de Premium, no con el tope de Free", async () => {
    // Free topa en 25; la lista ya tiene 2 lugares. 20 + 20 más (el máximo
    // por invitado es 20) pasarían el tope de Free.
    expect(getPlan("free")!.maxGuests).toBe(25);
    escena = { plan: null, rsvpMode: "guest_list", publicada: false };
    const r = await addGuestsBulk({
      invitationId: inv(),
      raw: "Ana, 20\nLuis, 20",
    });
    expect(r).toEqual({ ok: true });
    expect(escrituras).toEqual(["invitation_guests:insert"]);
  });

  it("volver a confirmación abierta NO exige Premium (es la salida)", async () => {
    escena = { plan: "esencial", rsvpMode: "guest_list", publicada: true };
    expect((await setRsvpMode("inv1", "open")).ok).toBe(true);
    expect(escrituras).toEqual(["invitations:update"]);
  });

  it("borrar un invitado NO exige Premium (es la salida)", async () => {
    escena = { plan: null, rsvpMode: "guest_list", publicada: true };
    expect((await deleteGuest("g1")).ok).toBe(true);
    expect(escrituras).toEqual(["invitation_guests:delete"]);
  });
});

describe("ingreso en la puerta (QR y manual): gate ESTRICTO, solo Premium", () => {
  for (const [nombre, correr] of Object.entries(accionesDeIngreso)) {
    it.each([false, true])(
      `${nombre}: Celebración (publicada=%s) → rechazo, sin escrituras`,
      async (publicada) => {
        escena = { plan: "celebracion", rsvpMode: "guest_list", publicada };
        await esperarRechazoSinEscribir(await correr());
      },
    );

    it(`${nombre}: borrador sin plan → rechazo (el borrador no da ingreso)`, async () => {
      escena = { plan: null, rsvpMode: "guest_list", publicada: false };
      await esperarRechazoSinEscribir(await correr());
    });

    it(`${nombre}: Premium → pasa y escribe`, async () => {
      escena = { plan: "premium", rsvpMode: "guest_list", publicada: true };
      const r = await correr();
      expect(r.ok).toBe(true);
      expect(escrituras.length).toBeGreaterThan(0);
    });
  }
});

describe("accesoALista: lo que el gestor explica", () => {
  it("borrador sin Premium → borrador, con el checkout de Premium", async () => {
    escena = { plan: null, publicada: false };
    expect(await accesoALista("inv1")).toEqual({
      estado: "borrador",
      mejorarHref: "/billing/checkout?plan=premium&invitation=inv1",
      planPagado: null,
    });
  });

  it.each([
    ["esencial", "Esencial"],
    ["celebracion", "Celebración"],
  ] as const)(
    "borrador con %s ya pagado → borrador, y dice qué plan tiene (el aviso sale también)",
    async (plan, nombre) => {
      escena = { plan, publicada: false };
      expect(await accesoALista("inv1")).toEqual({
        estado: "borrador",
        mejorarHref: "/billing/checkout?plan=premium&invitation=inv1",
        planPagado: nombre,
      });
    },
  );

  it("un entitlement Free (demo vieja) no cuenta como plan pagado", async () => {
    escena = { plan: "free", publicada: false };
    expect((await accesoALista("inv1"))?.planPagado).toBeNull();
  });

  it("publicada con Esencial → bloqueada", async () => {
    escena = { plan: "esencial", publicada: true };
    expect((await accesoALista("inv1"))?.estado).toBe("bloqueada");
  });

  it("Premium → premium (sin aviso)", async () => {
    escena = { plan: "premium", publicada: false };
    expect((await accesoALista("inv1"))?.estado).toBe("premium");
  });
});

/** Uuid válido para los esquemas zod que lo exigen. */
function inv() {
  return "00000000-0000-4000-8000-000000000001";
}

describe("TOCTOU: publicar y activar la lista a la vez (dos pestañas)", () => {
  it("setRsvpMode(guest_list) sin Premium: si se publicó en medio, rechaza y no queda en lista", async () => {
    // La acción lee borrador; al escribir ya está publicada.
    escena = {
      plan: "esencial",
      rsvpMode: "open",
      publicada: false,
      alEscribir: { publicada: true },
    };
    const r = await setRsvpMode("inv1", "guest_list");
    expect(r).toEqual({
      ok: false,
      error: ERROR_LISTA_REQUIERE_PREMIUM,
      mejorarHref: enlaceMejorarParaLista("inv1"),
    });
  });

  it("control: setRsvpMode(guest_list) sin Premium en borrador que sigue en borrador, pasa", async () => {
    escena = { plan: "esencial", rsvpMode: "open", publicada: false };
    expect(await setRsvpMode("inv1", "guest_list")).toEqual({ ok: true });
  });

  it("setRsvpMode(guest_list) con Premium no depende de estar en borrador", async () => {
    escena = {
      plan: "premium",
      rsvpMode: "open",
      publicada: false,
      alEscribir: { publicada: true },
    };
    expect(await setRsvpMode("inv1", "guest_list")).toEqual({ ok: true });
  });

  it("setPublished sin guest_management: si la lista se activó en medio, rechaza con Premium", async () => {
    // El gate lee 'open' y deja publicar con Celebración; al escribir ya es
    // 'guest_list'.
    escena = {
      plan: "celebracion",
      rsvpMode: "open",
      publicada: false,
      alEscribir: { rsvpMode: "guest_list" },
    };
    const r = await setPublished("inv1", true);
    expect(r).toEqual({
      ok: false,
      error: ERROR_PUBLICAR_LISTA_REQUIERE_PREMIUM,
      requiredPlan: "premium",
      needsPayment: true,
      needsUpgrade: true,
      porListaDeInvitados: true,
    });
  });

  it("control: setPublished con Celebración en confirmación abierta que no cambió, publica", async () => {
    escena = { plan: "celebracion", rsvpMode: "open", publicada: false };
    expect(await setPublished("inv1", true)).toEqual({
      ok: true,
      is_published: true,
    });
  });

  it("setPublished con Premium publica aunque el modo cambie a lista en medio", async () => {
    escena = {
      plan: "premium",
      rsvpMode: "open",
      publicada: false,
      alEscribir: { rsvpMode: "guest_list" },
    };
    expect((await setPublished("inv1", true)).ok).toBe(true);
  });
});

describe("el cobro por la lista se nombra al publicar", () => {
  it("con Celebración y lista: pide Premium y marca que el motivo es la lista", async () => {
    escena = { plan: "celebracion", rsvpMode: "guest_list", publicada: false };
    const r = await setPublished("inv1", true);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.requiredPlan).toBe("premium");
    expect(r.porListaDeInvitados).toBe(true);
  });

  it("sin plan y con lista: el checkout es Premium y el motivo es la lista", async () => {
    escena = { plan: null, rsvpMode: "guest_list", publicada: false };
    const r = await setPublished("inv1", true);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.requiredPlan).toBe("premium");
    expect(r.porListaDeInvitados).toBe(true);
  });

  it("sin plan y en confirmación abierta: cobra, pero NO por la lista", async () => {
    escena = { plan: null, rsvpMode: "open", publicada: false };
    const r = await setPublished("inv1", true);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.porListaDeInvitados).toBe(false);
  });
});

describe("tope duro de la lista en borrador gratis", () => {
  it("el tope es razonable y menor que «ilimitado»", () => {
    expect(TOPE_LISTA_EN_BORRADOR).toBe(500);
  });

  it.each([null, "esencial"] as const)(
    "plan %s: pasarse del tope rechaza con mensaje claro y no escribe",
    async (plan) => {
      escena = {
        plan,
        rsvpMode: "guest_list",
        publicada: false,
        lugaresUsados: TOPE_LISTA_EN_BORRADOR - 1,
      };
      const r = await addGuest({
        invitationId: inv(),
        name: "Ana",
        maxGuests: 2,
        phone: "",
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toContain(`hasta ${TOPE_LISTA_EN_BORRADOR} invitados`);
      expect(r.error).toContain("Premium");
      expect(escrituras).toEqual([]);
    },
  );

  it("justo en el tope, pasa", async () => {
    escena = {
      plan: null,
      rsvpMode: "guest_list",
      publicada: false,
      lugaresUsados: TOPE_LISTA_EN_BORRADOR - 1,
    };
    const r = await addGuest({
      invitationId: inv(),
      name: "Ana",
      maxGuests: 1,
      phone: "",
    });
    expect(r).toEqual({ ok: true });
  });

  it("con Premium no hay tope", async () => {
    escena = {
      plan: "premium",
      rsvpMode: "guest_list",
      publicada: true,
      lugaresUsados: 10_000,
    };
    const r = await addGuest({
      invitationId: inv(),
      name: "Ana",
      maxGuests: 20,
      phone: "",
    });
    expect(r).toEqual({ ok: true });
  });

  it("el alta masiva tope tambien por borrador (suma del lote)", async () => {
    escena = {
      plan: null,
      rsvpMode: "guest_list",
      publicada: false,
      lugaresUsados: TOPE_LISTA_EN_BORRADOR - 3,
    };
    const r = await addGuestsBulk({ invitationId: inv(), raw: "Ana, 2\nLuis, 2" });
    expect(r.ok).toBe(false);
    expect(escrituras).toEqual([]);
  });

  it("el pegado masivo admite como mucho MAX_GUESTS_PER_BULK líneas", async () => {
    escena = { plan: "premium", rsvpMode: "guest_list", publicada: false };
    const lineas = (n: number) =>
      Array.from({ length: n }, (_, i) => `Invitado ${i}`).join("\n");
    const r = await addGuestsBulk({
      invitationId: inv(),
      raw: lineas(MAX_GUESTS_PER_BULK + 1),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain(`hasta ${MAX_GUESTS_PER_BULK} invitados`);
    expect(escrituras).toEqual([]);

    const ok = await addGuestsBulk({
      invitationId: inv(),
      raw: lineas(MAX_GUESTS_PER_BULK),
    });
    expect(ok).toEqual({ ok: true });
  });
});
