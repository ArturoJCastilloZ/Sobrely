import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El flujo de `applyMercadoPagoPayment`, probado por COMPORTAMIENTO.
 *
 * Hasta ahora todo el punto 8 estaba fijado por FORMA (leyendo el fuente) y por
 * mutación, con este razonamiento escrito en el repo: «`fulfillment.ts` es
 * `server-only` y habla con la base de PRODUCCIÓN, así que ahí la conducta no
 * se puede probar». La primera mitad resultó ser falsa: `vi.mock("server-only")`
 * más un doble de `createAdminClient` permiten ejecutar el flujo entero sin
 * tocar ni Supabase ni Mercado Pago. Lo que no se podía era hablar con la base
 * REAL — no ejecutar el módulo.
 *
 * Qué defiende esto que la forma no podía: la SECUENCIA. Que un conflicto no
 * deje escrituras a medias, que la reentrada complete el trabajo pendiente, y
 * que un fallo de escritura no se reporte como éxito. Son desenlaces sobre
 * dinero de un cliente que ya pagó.
 */

vi.mock("server-only", () => ({}));

/** `canPublishInvitation` tiene su propia lógica y sus propias pruebas: aquí se
 *  dobla para que el sujeto sea el FLUJO y no el gate. */
const permitirPublicar = { valor: true };
vi.mock("@/lib/billing/entitlements", () => ({
  canPublishInvitation: async () => ({ allowed: permitirPublicar.valor }),
}));

type Resp = { data: unknown; error: unknown };
/** Respuesta por `tabla:verbo`; si falta, se usa un vacío no-error. */
let respuestas: Record<string, Resp>;
/** Toda operación que el flujo ejecuta, en orden. Es lo que se afirma. */
let registro: string[];

/**
 * Doble de PostgREST, fiel en lo que decide los desenlaces de este módulo:
 * un `update` que no encuentra fila **no es un error** — devuelve
 * `{ data: [], error: null }`. Ese detalle es justo el que produce los fallos
 * silenciosos que el punto 7 y el punto 8 vinieron a cerrar, así que el doble
 * tiene que reproducirlo o las pruebas no valdrían nada.
 */
function hacerAdmin() {
  const constructor = (tabla: string) => {
    let verbo = "select";
    const api: Record<string, unknown> = {
      select: () => api,
      eq: () => api,
      maybeSingle: () => resolver(),
      then: (res: (v: Resp) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(resolver()).then(res, rej),
    };
    for (const v of ["update", "upsert", "insert", "delete"]) {
      api[v] = () => {
        verbo = v;
        return api;
      };
    }
    const resolver = (): Resp => {
      const clave = `${tabla}:${verbo}`;
      registro.push(clave);
      return respuestas[clave] ?? { data: verbo === "select" ? null : [], error: null };
    };
    return api;
  };
  return { from: (t: string) => constructor(t) };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => hacerAdmin(),
}));

const { applyMercadoPagoPayment } = await import("@/lib/billing/fulfillment");

const ORDEN_PAGABLE = {
  id: "ord-1",
  user_id: "usr-1",
  status: "pending",
  product_type: "plan",
  invitation_id: "inv-1",
  plan_id: "plan-esencial",
  metadata: null,
};

function escenario(over: Record<string, Resp> = {}) {
  respuestas = {
    "orders:select": { data: { ...ORDEN_PAGABLE }, error: null },
    "orders:update": { data: [{ id: "ord-1" }], error: null },
    "plans:select": { data: { code: "esencial" }, error: null },
    "invitations:select": { data: { event_date: "2026-12-01" }, error: null },
    "invitation_entitlements:select": { data: null, error: null },
    "invitation_entitlements:upsert": { data: [{ invitation_id: "inv-1" }], error: null },
    "invitations:update": { data: [{ id: "inv-1" }], error: null },
    "referrals:select": { data: null, error: null },
    ...over,
  };
  registro = [];
}

beforeEach(() => {
  permitirPublicar.valor = true;
  escenario();
});

describe("un pago aprobado activa el acceso", () => {
  it("marca la orden y escribe el entitlement, en ese orden", async () => {
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1",
      paymentId: "pay-1",
      mpStatus: "approved",
    });
    expect(r).toMatchObject({ ok: true, orderStatus: "paid", entitlementActivated: true });
    // La ORDEN se marca antes que el acceso: si se invirtiera, un fallo al
    // marcar dejaría acceso regalado sin orden que lo respalde.
    expect(registro.indexOf("orders:update")).toBeLessThan(
      registro.indexOf("invitation_entitlements:upsert"),
    );
  });
});

describe("un fallo de escritura NO se reporta como éxito", () => {
  it("si el upsert del entitlement falla, `ok` es false", async () => {
    escenario({
      "invitation_entitlements:upsert": { data: null, error: { message: "boom" } },
    });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("entitlement_upsert_failed");
  });

  it("y si el upsert afecta 0 filas tampoco —eso en PostgREST no es error", async () => {
    escenario({ "invitation_entitlements:upsert": { data: [], error: null } });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("entitlement_upsert_sin_filas");
  });

  it("un update de la ORDEN con 0 filas corta ANTES de tocar el acceso", async () => {
    escenario({ "orders:update": { data: [], error: null } });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r.ok).toBe(false);
    expect(registro).not.toContain("invitation_entitlements:upsert");
  });
});

describe("la reentrada: el reintento de MP tiene que servir de algo", () => {
  it("una orden ya `paid` SIN entitlement NO se corta: completa el trabajo", async () => {
    // Es el desenlace que el arreglo de esta sesión cierra. Antes, el reintento
    // entraba al guard de idempotencia y devolvía `ok:true` sin crear el acceso:
    // el cliente pagaba y no tenía nada.
    escenario({
      "orders:select": { data: { ...ORDEN_PAGABLE, status: "paid" }, error: null },
      "invitation_entitlements:select": { data: null, error: null },
    });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r).toMatchObject({ ok: true, entitlementActivated: true });
    expect(registro).toContain("invitation_entitlements:upsert");
    expect(r.idempotent).toBeUndefined();
  });

  it("pero una orden `paid` CON entitlement activo se corta y no escribe nada", async () => {
    escenario({
      "orders:select": { data: { ...ORDEN_PAGABLE, status: "paid" }, error: null },
      "invitation_entitlements:select": { data: { status: "active" }, error: null },
    });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r).toMatchObject({ ok: true, idempotent: true });
    expect(registro).not.toContain("orders:update");
    expect(registro).not.toContain("invitation_entitlements:upsert");
  });

  it("y si no se puede LEER el entitlement, falla en vez de cortar alegremente", async () => {
    escenario({
      "orders:select": { data: { ...ORDEN_PAGABLE, status: "paid" }, error: null },
      "invitation_entitlements:select": { data: null, error: { message: "sin red" } },
    });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("reentrada_lookup_failed");
  });
});

describe("un reembolso sólo toca lo suyo", () => {
  it("si no revocó nada, NO despublica: ese acceso lo pagó otra orden", async () => {
    escenario({
      "orders:select": {
        data: { ...ORDEN_PAGABLE, status: "paid" }, error: null,
      },
      "invitation_entitlements:update": { data: [], error: null },
    });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "refunded",
    });
    expect(r).toMatchObject({ ok: true, entitlementActivated: false });
    expect(r.reason).toBe("entitlement_de_otro_plan_no_se_revoca");
    expect(registro).not.toContain("invitations:update");
  });

  it("un reembolso sin `plan_id` no revoca NADA y lo dice", async () => {
    escenario({
      "orders:select": {
        data: { ...ORDEN_PAGABLE, status: "paid", plan_id: null }, error: null,
      },
    });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "refunded",
    });
    expect(r.reason).toBe("refund_sin_plan_id_revision_manual");
    expect(registro).not.toContain("invitation_entitlements:update");
  });
});

describe("la auto-publicación no puede mentir", () => {
  const conPublishOnPaid = {
    "orders:select": {
      data: { ...ORDEN_PAGABLE, metadata: { publish_on_paid: true } },
      error: null,
    },
  };

  it("publica y lo reporta cuando de verdad afectó una fila", async () => {
    escenario(conPublishOnPaid);
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r.published).toBe(true);
  });

  it("con 0 filas afectadas, `published` es FALSE y no true", async () => {
    // El defecto que esto cierra: `published = !pubErr`, y en PostgREST un
    // update sin filas no da error. El cliente pagó desde el botón «Publicar»,
    // no se publicó nada, y el resultado decía que sí.
    escenario({ ...conPublishOnPaid, "invitations:update": { data: [], error: null } });
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r.ok).toBe(true);
    expect(r.published).toBe(false);
  });

  it("y si el gate de plan no lo permite, no se publica ni se pretende", async () => {
    permitirPublicar.valor = false;
    escenario(conPublishOnPaid);
    const r = await applyMercadoPagoPayment({
      orderId: "ord-1", paymentId: "pay-1", mpStatus: "approved",
    });
    expect(r.published).toBe(false);
    expect(registro).not.toContain("invitations:update");
  });
});
