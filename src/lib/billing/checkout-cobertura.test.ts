import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `createPlanCheckout` EJECUTADO, con dobles de Supabase y Mercado Pago. La
 * guarda de texto de `publicar-sin-demo.test.ts` dice que la validación está
 * ANTES de crear la orden; esto demuestra que, con un plan que no cubre, la
 * orden NO se crea y no se llama a Mercado Pago. Lo que cuesta dinero es que
 * se cobre algo que no sirve, así que aquí se mira la consecuencia, no el texto.
 */
const llamadas = { ordenesInsertadas: 0, preferenciasCreadas: 0 };
let contenido: {
  modulosVisibles: string[];
  themePack?: string;
  usaArtePropio: boolean;
} = { modulosVisibles: ["hero", "rsvp"], usaArtePropio: false };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: (tabla: string) => {
      expect(tabla).toBe("invitations");
      const cadena = {
        select: () => cadena,
        eq: () => cadena,
        maybeSingle: async () => ({
          data: { id: "inv1", user_id: "u1", title: "Mi boda" },
          error: null,
        }),
      };
      return cadena;
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabla: string) => {
      if (tabla === "plans") {
        const c = {
          select: () => c,
          eq: () => c,
          maybeSingle: async () => ({ data: { id: "plan-uuid" }, error: null }),
        };
        return c;
      }
      // orders
      return {
        insert: () => {
          llamadas.ordenesInsertadas++;
          return {
            select: () => ({
              single: async () => ({ data: { id: "orden1" }, error: null }),
            }),
          };
        },
        update: () => ({
          eq: () => ({ select: async () => ({ data: [{ id: "orden1" }], error: null }) }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/billing/mercadopago", () => ({
  mpPreference: () => ({
    create: async () => {
      llamadas.preferenciasCreadas++;
      return { id: "pref1", init_point: "https://mp.test/pagar" };
    },
  }),
}));

// El contenido de la invitación se controla por prueba; el resto de
// `entitlements` (que es `server-only` y habla con la BD) no se necesita.
vi.mock("@/lib/billing/entitlements", () => ({
  getStorageStatus: vi.fn(),
  leerContenidoPublicable: async () => contenido,
}));

import { createPlanCheckout } from "@/lib/billing/actions";

beforeEach(() => {
  llamadas.ordenesInsertadas = 0;
  llamadas.preferenciasCreadas = 0;
  contenido = { modulosVisibles: ["hero", "rsvp"], usaArtePropio: false };
  process.env.NEXT_PUBLIC_SITE_URL = "https://sobrely.test";
});

describe("createPlanCheckout · no cobra un plan que no cubre la invitación", () => {
  it("un plan que SÍ cubre crea la orden y devuelve el enlace de pago", async () => {
    const r = await createPlanCheckout("esencial", "inv1");
    expect(r).toEqual({ ok: true, url: "https://mp.test/pagar" });
    expect(llamadas.ordenesInsertadas).toBe(1);
    expect(llamadas.preferenciasCreadas).toBe(1);
  });

  it("un plan que NO cubre (módulo de Celebración con plan Esencial) NO crea orden ni llama a Mercado Pago", async () => {
    contenido = { modulosVisibles: ["hero", "gallery"], usaArtePropio: false };
    const r = await createPlanCheckout("esencial", "inv1");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Esencial");
    expect(r.error).toContain("Celebración"); // dice cuál sí hace falta
    expect(llamadas.ordenesInsertadas).toBe(0);
    expect(llamadas.preferenciasCreadas).toBe(0);
  });

  it("pagar el plan MÁS CARO que lo necesario sí se permite (no se bloquea comprar de más)", async () => {
    contenido = { modulosVisibles: ["hero"], usaArtePropio: false };
    const r = await createPlanCheckout("premium", "inv1");
    expect(r.ok).toBe(true);
    expect(llamadas.ordenesInsertadas).toBe(1);
  });

  it("un theme pack premium con plan Esencial NO crea orden", async () => {
    contenido = { modulosVisibles: ["hero"], themePack: "boda-lujo", usaArtePropio: false };
    const r = await createPlanCheckout("esencial", "inv1");
    expect(r.ok).toBe(false);
    expect(llamadas.ordenesInsertadas).toBe(0);
  });

  it("arte propio con plan Esencial NO crea orden", async () => {
    contenido = { modulosVisibles: ["hero"], usaArtePropio: true };
    const r = await createPlanCheckout("esencial", "inv1");
    expect(r.ok).toBe(false);
    expect(llamadas.ordenesInsertadas).toBe(0);
  });

  it("un plan que no es de pago (free) se rechaza antes de cualquier consulta", async () => {
    const r = await createPlanCheckout("free", "inv1");
    expect(r.ok).toBe(false);
    expect(llamadas.ordenesInsertadas).toBe(0);
  });

  it("si ningún plan activo cubre el contenido, lo dice y no cobra", async () => {
    // Un módulo inexistente en todos los planes: ninguno lo cubre.
    contenido = { modulosVisibles: ["modulo-fantasma"], usaArtePropio: false };
    const r = await createPlanCheckout("premium", "inv1");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("ningún plan activo");
    expect(llamadas.ordenesInsertadas).toBe(0);
  });
});
