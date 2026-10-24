import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Llamada = { tabla: string; op: string; datos?: unknown };
let llamadas: Llamada[] = [];
let conteos: number[] = [];
let falla = false;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabla: string) => {
      if (falla) throw new Error("base caída");
      const q: Record<string, unknown> = {};
      q.select = (_c?: string, o?: { count?: string }) => {
        if (o?.count) {
          const hilo = {
            eq: () => hilo,
            gte: () => hilo,
            then: (res: (v: { count: number }) => unknown) => {
              llamadas.push({ tabla, op: "count" });
              return Promise.resolve({ count: conteos.shift() ?? 0 }).then(res);
            },
          };
          return hilo;
        }
        return q;
      };
      q.insert = (datos: unknown) => {
        llamadas.push({ tabla, op: "insert", datos });
        return { select: () => ({ single: async () => ({ data: { id: "fila-1" }, error: null }) }) };
      };
      q.update = (datos: unknown) => {
        llamadas.push({ tabla, op: "update", datos });
        return { eq: async () => ({ error: null }) };
      };
      q.single = async () => ({ data: { id: "fila-1" } });
      return q;
    },
  }),
}));

import { registrarError } from "./registrar";

const ENV = { ...process.env };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  llamadas = [];
  conteos = [];
  falla = false;
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  process.env.ALERTAS_ENABLED = "1";
  process.env.ALERTAS_EMAIL = "duenio@example.test";
  process.env.RESEND_API_KEY = "re_clave_de_prueba";
  process.env.REMINDER_FROM = "Sobrely <aviso@example.test>";
  process.env.NEXT_PUBLIC_SITE_URL = "https://sobrely.example";
});
afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
});

const insertado = () => llamadas.find((l) => l.op === "insert")?.datos as Record<string, unknown>;

describe("registrarError", () => {
  it("guarda el mensaje LIMPIO, la huella y solo el contexto permitido", async () => {
    await registrarError("webhook_pago", new Error("duplicate key (ana@gmail.com) token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.firmafirmafirma"), {
      severidad: "aviso",
      contexto: { order_id: "6f1b2c3d-0000-4000-8000-123456789abc", user_email: "ana@gmail.com" },
    });
    const fila = insertado();
    expect(fila.mensaje).not.toMatch(/ana@gmail|eyJ/);
    expect(fila.contexto).toEqual({ order_id: "6f1b2c3d-0000-4000-8000-123456789abc" });
    expect(String(fila.huella)).toMatch(/^[0-9a-f]{64}$/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un error crítico nuevo manda UN correo sin datos personales y marca la fila", async () => {
    conteos = [0, 0, 0]; // tope por minuto, alerta previa de la huella, alertas en la hora
    await registrarError("checkout", "no se pudo crear la orden de ana@gmail.com", { severidad: "critico" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string; headers: Record<string, string> }];
    expect(url).toBe("https://api.resend.com/emails");
    const cuerpo = JSON.parse(init.body);
    expect(cuerpo.to).toEqual(["duenio@example.test"]);
    expect(cuerpo.subject).toBe("[Sobrely] Error crítico: checkout");
    expect(cuerpo.text).not.toContain("ana@gmail");
    expect(cuerpo.text).toContain("https://sobrely.example/admin/errores");
    expect(llamadas.some((l) => l.op === "update")).toBe(true);
  });

  it("no repite el correo si esa causa ya se avisó en la última hora", async () => {
    conteos = [0, 1, 0];
    await registrarError("checkout", "misma causa", { severidad: "critico" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(insertado()).toBeDefined(); // pero el error SÍ queda anotado
  });

  it("respeta el tope global de alertas por hora", async () => {
    conteos = [0, 0, 10];
    await registrarError("checkout", "otra causa", { severidad: "critico" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un aviso (no crítico) nunca manda correo", async () => {
    await registrarError("auth", "falló", { severidad: "aviso" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin ALERTAS_ENABLED o sin llave no se manda nada, y el error queda anotado", async () => {
    conteos = [0, 0, 0];
    delete process.env.ALERTAS_ENABLED;
    await registrarError("checkout", "x", { severidad: "critico" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(insertado()).toBeDefined();
    process.env.ALERTAS_ENABLED = "1";
    delete process.env.RESEND_API_KEY;
    conteos = [0, 0, 0];
    await registrarError("checkout", "y", { severidad: "critico" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si el correo falla, no marca la fila como alertada y no lanza", async () => {
    conteos = [0, 0, 0];
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    await expect(registrarError("checkout", "z", { severidad: "critico" })).resolves.toBeUndefined();
    expect(llamadas.some((l) => l.op === "update")).toBe(false);
  });

  it("descarta si ya hubo demasiados errores en el último minuto (anti-inundación)", async () => {
    conteos = [60];
    await registrarError("servidor", "inundación");
    expect(insertado()).toBeUndefined();
  });

  it("nunca lanza aunque la base esté caída", async () => {
    falla = true;
    await expect(registrarError("webhook_pago", "x", { severidad: "critico" })).resolves.toBeUndefined();
  });
});
