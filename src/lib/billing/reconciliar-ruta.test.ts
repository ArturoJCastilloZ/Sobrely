import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La ruta EJECUTADA (las puertas, en orden) más guardas estructurales de las
 * decisiones que un cambio «inocente» podría deshacer sin que se note.
 */
let corridas = 0;
let ordenes: { id: string; amount: number; currency: string }[] = [];
const aplicados: { orderId: string; paymentId: string }[] = [];

vi.mock("@/lib/billing/fulfillment", () => ({
  applyMercadoPagoPayment: async (p: { orderId: string; paymentId: string }) => {
    aplicados.push(p);
    return { ok: true, orderStatus: "paid" };
  },
}));

vi.mock("@/lib/billing/reconciliar-adaptadores", () => ({
  crearAlmacenDeOrdenes: () => {
    corridas += 1;
    return { ordenesPendientes: async () => ordenes };
  },
  crearBuscadorDePagosMp: () => async (ref: string) => [
    { id: "pago-1", status: "approved", externalReference: ref, amount: 399, currency: "MXN" },
  ],
}));

const ENV = { CRON_SECRET: "cron-secreto", RECONCILE_ENABLED: "1" };
function ponerEnv(env: Record<string, string | undefined>) {
  for (const k of ["CRON_SECRET", "RECONCILE_ENABLED"]) {
    vi.stubEnv(k, env[k] as string);
    if (env[k] === undefined) delete process.env[k];
  }
}
function pedir(auth?: string) {
  return new Request("https://sobrely.test/api/cron/reconciliar-pagos", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  corridas = 0;
  aplicados.length = 0;
  ordenes = [{ id: "o1", amount: 399, currency: "MXN" }];
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/reconciliar-pagos: las puertas, en orden", () => {
  it("sin CRON_SECRET → 503 y NO corre ni aplica nada (aunque llegue «Bearer undefined»)", async () => {
    ponerEnv({ ...ENV, CRON_SECRET: undefined });
    const { GET } = await import("@/app/api/cron/reconciliar-pagos/route");
    for (const h of [undefined, "Bearer undefined", "Bearer "]) {
      expect((await GET(pedir(h))).status).toBe(503);
    }
    expect(corridas).toBe(0);
    expect(aplicados).toHaveLength(0);
  });

  it("credencial ausente o incorrecta → 401 y NO corre", async () => {
    ponerEnv(ENV);
    const { GET } = await import("@/app/api/cron/reconciliar-pagos/route");
    for (const h of [undefined, "Bearer otro", "cron-secreto", "bearer cron-secreto", "Bearer cron-secreto2"]) {
      expect((await GET(pedir(h))).status).toBe(401);
    }
    expect(corridas).toBe(0);
    expect(aplicados).toHaveLength(0);
  });

  it("autorizado pero apagado → 200 «desactivado» y NO aplica nada", async () => {
    ponerEnv({ ...ENV, RECONCILE_ENABLED: undefined });
    const { GET } = await import("@/app/api/cron/reconciliar-pagos/route");
    const r = await GET(pedir("Bearer cron-secreto"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ desactivado: true });
    expect(corridas).toBe(0);
    expect(aplicados).toHaveLength(0);
  });

  it("solo el valor exacto «1» enciende", async () => {
    const { GET } = await import("@/app/api/cron/reconciliar-pagos/route");
    for (const v of ["true", "yes", "0", "", "on"]) {
      ponerEnv({ ...ENV, RECONCILE_ENABLED: v });
      expect(await (await GET(pedir("Bearer cron-secreto"))).json()).toEqual({ desactivado: true });
    }
    expect(corridas).toBe(0);
  });

  it("autorizado y encendido → aplica y devuelve solo conteos e ids", async () => {
    ponerEnv(ENV);
    const { GET } = await import("@/app/api/cron/reconciliar-pagos/route");
    const r = await GET(pedir("Bearer cron-secreto"));
    expect(r.status).toBe(200);
    expect(aplicados).toEqual([{ orderId: "o1", paymentId: "pago-1", mpStatus: "approved" }]);
    const cuerpo = await r.json();
    expect(Object.keys(cuerpo).sort()).toEqual(
      ["aplicadas", "errores", "montoNoCoincide", "ordenesAplicadas", "revisadas", "sinPagoAprobado"].sort(),
    );
    expect(cuerpo).toMatchObject({ revisadas: 1, aplicadas: 1 });
  });
});

const RAIZ = fileURLToPath(new URL("../../../", import.meta.url));
const fuente = (rel: string) =>
  readFileSync(join(RAIZ, rel), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("guardas estructurales", () => {
  const ruta = fuente("src/app/api/cron/reconciliar-pagos/route.ts");

  it("primero el secreto del cron, luego la credencial, luego el interruptor, luego corre", () => {
    const i = [
      ruta.indexOf("process.env.CRON_SECRET"),
      ruta.indexOf("credencialValida(request"),
      ruta.indexOf("RECONCILE_ENABLED"),
      ruta.indexOf("reconciliarPagos("),
    ];
    expect(i.every((x) => x > -1)).toBe(true);
    expect([...i].sort((a, b) => a - b)).toEqual(i);
  });

  it("aplica con la MISMA función que el webhook (no una versión paralela)", () => {
    expect(ruta).toContain("applyMercadoPagoPayment(");
    expect(ruta).toMatch(/from "@\/lib\/billing\/fulfillment"/);
  });

  it("compara la credencial en tiempo constante y es dinámica", () => {
    expect(ruta).toContain("timingSafeEqual");
    expect(ruta).toMatch(/export const dynamic = "force-dynamic"/);
  });

  it("la política exige estado approved, monto Y moneda antes de aplicar", () => {
    const p = fuente("src/lib/billing/reconciliar.ts");
    expect(p).toContain('p.status === "approved"');
    expect(p).toContain("p.externalReference === orden.id");
    expect(p).toContain("mismoMonto(p.amount, orden.amount)");
    expect(p).toContain("toUpperCase() === orden.currency.toUpperCase()");
    // Y el monto se valida ANTES de llamar a `aplicar`.
    expect(p.indexOf("mismoMonto(p.amount")).toBeLessThan(p.indexOf("o.aplicar("));
  });

  it("los adaptadores solo LEEN: no escriben en la base", () => {
    const a = fuente("src/lib/billing/reconciliar-adaptadores.ts");
    expect(a).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(a).toMatch(/import "server-only"/);
  });

  it("ningún módulo del job usa `console.`", () => {
    for (const rel of [
      "src/lib/billing/reconciliar.ts",
      "src/lib/billing/reconciliar-adaptadores.ts",
      "src/app/api/cron/reconciliar-pagos/route.ts",
    ]) {
      expect(fuente(rel), rel).not.toMatch(/console\./);
    }
  });

  it("vercel.json lo programa una vez al día, apuntando a una ruta que existe", () => {
    const v = JSON.parse(readFileSync(join(RAIZ, "vercel.json"), "utf8")) as {
      crons: { path: string; schedule: string }[];
    };
    const suyo = v.crons.filter((c) => c.path === "/api/cron/reconciliar-pagos");
    expect(suyo).toHaveLength(1);
    expect(suyo[0].schedule).toMatch(/^\d+ \d+ \* \* \*$/);
    expect(ruta.length).toBeGreaterThan(0);
  });
});
