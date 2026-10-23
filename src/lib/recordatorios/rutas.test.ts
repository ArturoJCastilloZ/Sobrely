import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Las rutas EJECUTADAS: lo que se mira es la consecuencia (qué código HTTP, qué
 * se escribe, qué se envía), no que el fuente tenga ciertas palabras.
 */
const SECRETO = "s".repeat(32);
const U1 = "11111111-1111-1111-1111-111111111111";

const escrituras: { tabla: string; fila: Record<string, unknown> }[] = [];
let upsertDevuelve: { data: { user_id: string }[] | null; error: { message: string } | null };
let sesion: { id: string } | null;
let corridas = 0;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabla: string) => ({
      upsert: (fila: Record<string, unknown>) => {
        escrituras.push({ tabla, fila });
        return { select: async () => upsertDevuelve };
      },
    }),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: sesion } }) },
  }),
}));

vi.mock("@/lib/recordatorios/almacen", () => ({
  crearAlmacenSupabase: () => {
    corridas += 1;
    return {
      candidatos: async () => [],
      yaEnviados: async () => new Map(),
      conCorreoReciente: async () => new Set(),
      reclamar: async () => "reclamado",
      soltar: async () => true,
      correoDe: async () => null,
    };
  },
}));

const ENV_BASE = {
  CRON_SECRET: "cron-secreto",
  REMINDERS_ENABLED: "1",
  REMINDERS_DRY_RUN: "1",
  NEXT_PUBLIC_SITE_URL: "https://sobrely.test",
  REMINDER_SECRET: SECRETO,
};

function ponerEnv(env: Record<string, string | undefined>) {
  for (const k of ["CRON_SECRET", "REMINDERS_ENABLED", "REMINDERS_DRY_RUN", "NEXT_PUBLIC_SITE_URL", "REMINDER_SECRET", "REMINDER_FROM", "RESEND_API_KEY"]) {
    vi.stubEnv(k, env[k] as string);
    if (env[k] === undefined) delete process.env[k];
  }
}

beforeEach(() => {
  escrituras.length = 0;
  corridas = 0;
  upsertDevuelve = { data: [{ user_id: U1 }], error: null };
  sesion = { id: U1 };
});
afterEach(() => vi.unstubAllEnvs());

function cron(auth?: string) {
  return new Request("https://sobrely.test/api/cron/recordatorios", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("GET /api/cron/recordatorios: las puertas, en orden", () => {
  it("sin CRON_SECRET configurado → 503 y NO corre nada (aunque llegue «Bearer undefined»)", async () => {
    ponerEnv({ ...ENV_BASE, CRON_SECRET: undefined });
    const { GET } = await import("@/app/api/cron/recordatorios/route");
    for (const h of [undefined, "Bearer undefined", "Bearer "]) {
      const r = await GET(cron(h));
      expect(r.status).toBe(503);
    }
    expect(corridas).toBe(0);
  });

  it("sin credencial o con una incorrecta → 401 y NO corre nada", async () => {
    ponerEnv(ENV_BASE);
    const { GET } = await import("@/app/api/cron/recordatorios/route");
    // No se prueba «Bearer cron-secreto » con espacio final: `Headers` lo recorta y
    // llega idéntico a la credencial correcta (medido), así que no es un caso.
    for (const h of [undefined, "Bearer otro", "cron-secreto", "bearer cron-secreto", "Bearer cron-secreto2"]) {
      expect((await GET(cron(h))).status).toBe(401);
    }
    expect(corridas).toBe(0);
  });

  it("autorizado pero apagado → 200 «desactivado» y NO corre nada", async () => {
    ponerEnv({ ...ENV_BASE, REMINDERS_ENABLED: undefined });
    const { GET } = await import("@/app/api/cron/recordatorios/route");
    const r = await GET(cron("Bearer cron-secreto"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ desactivado: true });
    expect(corridas).toBe(0);
  });

  it("encendido pero incompleto → 500 con los NOMBRES de lo que falta, sin valores", async () => {
    ponerEnv({ ...ENV_BASE, REMINDERS_DRY_RUN: undefined, NEXT_PUBLIC_SITE_URL: undefined });
    const { GET } = await import("@/app/api/cron/recordatorios/route");
    const r = await GET(cron("Bearer cron-secreto"));
    expect(r.status).toBe(500);
    const cuerpo = JSON.stringify(await r.json());
    expect(cuerpo).toContain("NEXT_PUBLIC_SITE_URL");
    expect(cuerpo).toContain("RESEND_API_KEY");
    expect(cuerpo).not.toContain(SECRETO);
    expect(corridas).toBe(0);
  });

  it("autorizado, encendido y completo (en seco) → corre y devuelve solo conteos", async () => {
    ponerEnv(ENV_BASE);
    const { GET } = await import("@/app/api/cron/recordatorios/route");
    const r = await GET(cron("Bearer cron-secreto"));
    expect(r.status).toBe(200);
    expect(corridas).toBe(1);
    const cuerpo = await r.json();
    expect(cuerpo).toMatchObject({ seco: true, enviados: 0 });
    expect(Object.keys(cuerpo).sort()).toEqual(
      ["candidatos", "elegibles", "enviados", "fallos", "habriaEnviado", "seco", "sinCorreo", "sinSoltar", "yaReclamados"].sort(),
    );
  });
});

describe("/api/recordatorios/baja", () => {
  const URL_BASE = "https://sobrely.test/api/recordatorios/baja";

  async function tokenValido() {
    const { firmarBaja } = await import("@/lib/recordatorios/baja-token");
    return firmarBaja(U1, SECRETO);
  }

  it("POST con token válido → da de baja (opted_in=false, fuente «baja»)", async () => {
    ponerEnv(ENV_BASE);
    const { POST } = await import("@/app/api/recordatorios/baja/route");
    const t = await tokenValido();
    const r = await POST(new Request(`${URL_BASE}?u=${U1}&t=${t}`, { method: "POST" }));
    expect(r.status).toBe(200);
    expect(escrituras).toHaveLength(1);
    expect(escrituras[0].tabla).toBe("reminder_preferences");
    expect(escrituras[0].fila).toMatchObject({ user_id: U1, opted_in: false, source: "baja" });
  });

  it("POST con token de OTRA persona, mal formado, o sin secreto → 400 y NO escribe", async () => {
    ponerEnv(ENV_BASE);
    const { POST } = await import("@/app/api/recordatorios/baja/route");
    const t = await tokenValido();
    for (const url of [
      `${URL_BASE}?u=otra-persona&t=${t}`,
      `${URL_BASE}?u=${U1}&t=xxxx`,
      `${URL_BASE}?u=${U1}`,
      `${URL_BASE}`,
    ]) {
      expect((await POST(new Request(url, { method: "POST" }))).status).toBe(400);
    }
    ponerEnv({ ...ENV_BASE, REMINDER_SECRET: undefined });
    expect((await POST(new Request(`${URL_BASE}?u=${U1}&t=${t}`, { method: "POST" }))).status).toBe(400);
    expect(escrituras).toHaveLength(0);
  });

  it("POST: si la escritura no dejó fila, NO dice «ok»", async () => {
    ponerEnv(ENV_BASE);
    upsertDevuelve = { data: [], error: null };
    const { POST } = await import("@/app/api/recordatorios/baja/route");
    const t = await tokenValido();
    expect((await POST(new Request(`${URL_BASE}?u=${U1}&t=${t}`, { method: "POST" }))).status).toBe(400);
  });

  it("GET NO da de baja: redirige a la página (los escáneres de enlaces piden con GET)", async () => {
    ponerEnv(ENV_BASE);
    const { GET } = await import("@/app/api/recordatorios/baja/route");
    const t = await tokenValido();
    const r = await GET(new Request(`${URL_BASE}?u=${U1}&t=${t}`));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toContain("/recordatorios/baja?u=");
    expect(escrituras).toHaveLength(0);
  });
});

describe("acciones del panel", () => {
  it("guarda la decisión de la SESIÓN, con fuente «panel» y la versión del texto", async () => {
    const { guardarPreferenciaRecordatorios } = await import("@/lib/recordatorios/acciones");
    const { VERSION_TEXTO_CONSENTIMIENTO } = await import("@/lib/recordatorios/preferencias");
    expect(await guardarPreferenciaRecordatorios(true)).toEqual({ ok: true });
    expect(escrituras[0].fila).toMatchObject({
      user_id: U1,
      opted_in: true,
      source: "panel",
      consent_text_version: VERSION_TEXTO_CONSENTIMIENTO,
    });
  });

  it("sin sesión → error y NO escribe", async () => {
    sesion = null;
    const { guardarPreferenciaRecordatorios } = await import("@/lib/recordatorios/acciones");
    const r = await guardarPreferenciaRecordatorios(true);
    expect(r.ok).toBe(false);
    expect(escrituras).toHaveLength(0);
  });

  it("valores que no son booleano estricto se rechazan (un «false» en texto no es false)", async () => {
    const { guardarPreferenciaRecordatorios } = await import("@/lib/recordatorios/acciones");
    for (const malo of ["false", "true", 1, 0, null, undefined, {}] as unknown[]) {
      const r = await guardarPreferenciaRecordatorios(malo as boolean);
      expect(r.ok).toBe(false);
    }
    expect(escrituras).toHaveLength(0);
  });

  it("si la fila no quedó escrita, NO dice «ok»", async () => {
    upsertDevuelve = { data: [], error: null };
    const { guardarPreferenciaRecordatorios } = await import("@/lib/recordatorios/acciones");
    expect((await guardarPreferenciaRecordatorios(true)).ok).toBe(false);
    upsertDevuelve = { data: null, error: { message: "boom" } };
    expect((await guardarPreferenciaRecordatorios(true)).ok).toBe(false);
  });

  it("confirmarBaja con token inválido no escribe", async () => {
    ponerEnv(ENV_BASE);
    const { confirmarBajaRecordatorios } = await import("@/lib/recordatorios/acciones");
    const f = new FormData();
    f.set("u", U1);
    f.set("t", "falso");
    expect((await confirmarBajaRecordatorios(f)).ok).toBe(false);
    expect(escrituras).toHaveLength(0);
  });
});
