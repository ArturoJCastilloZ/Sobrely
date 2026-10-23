import { describe, expect, it, vi } from "vitest";
import { leerConfiguracion } from "@/lib/recordatorios/config";
import { crearEnviadorResend, type Correo } from "@/lib/recordatorios/resend";

const SECRETO = "s".repeat(32);
const COMPLETO = {
  REMINDERS_ENABLED: "1",
  NEXT_PUBLIC_SITE_URL: "https://sobrely.test/",
  REMINDER_SECRET: SECRETO,
  REMINDER_FROM: "Sobrely <hola@sobrely.test>",
  RESEND_API_KEY: "llave-de-prueba",
};

describe("leerConfiguracion: falla cerrado", () => {
  it("de fábrica está APAGADO", () => {
    expect(leerConfiguracion({})).toEqual({ estado: "apagado" });
  });
  it("solo el valor exacto «1» enciende (no «true», no «yes», no «0»)", () => {
    for (const v of ["true", "yes", "0", "", "on", "1 "]) {
      expect(leerConfiguracion({ ...COMPLETO, REMINDERS_ENABLED: v }).estado).toBe("apagado");
    }
  });
  it("encendido y completo → listo, origen sin barra final", () => {
    const c = leerConfiguracion(COMPLETO);
    expect(c).toMatchObject({ estado: "listo", seco: false, origen: "https://sobrely.test" });
  });
  it("cada pieza que falta se NOMBRA, sin valores", () => {
    for (const k of ["NEXT_PUBLIC_SITE_URL", "REMINDER_FROM", "RESEND_API_KEY"] as const) {
      const env = { ...COMPLETO, [k]: undefined };
      const c = leerConfiguracion(env);
      expect(c.estado).toBe("invalido");
      if (c.estado === "invalido") {
        expect(c.falta.join(" ")).toContain(k);
        expect(JSON.stringify(c)).not.toContain(SECRETO);
      }
    }
  });
  it("un secreto corto es inválido", () => {
    const c = leerConfiguracion({ ...COMPLETO, REMINDER_SECRET: "corto" });
    expect(c.estado).toBe("invalido");
  });
  it("corrida en seco: no exige llave ni remitente, pero sí el secreto y el origen", () => {
    const seco = { REMINDERS_ENABLED: "1", REMINDERS_DRY_RUN: "1", NEXT_PUBLIC_SITE_URL: "https://x.test", REMINDER_SECRET: SECRETO };
    expect(leerConfiguracion(seco)).toMatchObject({ estado: "listo", seco: true });
    expect(leerConfiguracion({ ...seco, REMINDER_SECRET: undefined }).estado).toBe("invalido");
  });
  it("sin dry-run explícito NO es seco", () => {
    expect(leerConfiguracion({ ...COMPLETO, REMINDERS_DRY_RUN: "0" })).toMatchObject({ seco: false });
  });
});

const CORREO: Correo = {
  para: "ana@ejemplo.test",
  de: "Sobrely <hola@sobrely.test>",
  asunto: "Asunto",
  html: "<p>x</p>",
  texto: "x",
  llaveIdempotencia: "inv1:borrador_24h",
  cabeceras: { "List-Unsubscribe": "<https://x.test/baja>" },
};

describe("crearEnviadorResend", () => {
  it("manda lo esperado a /emails con llave e idempotencia", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const r = await crearEnviadorResend({ apiKey: "k", fetchImpl: f as unknown as typeof fetch })(CORREO);
    expect(r).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const h = init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer k");
    expect(h["Idempotency-Key"]).toBe("inv1:borrador_24h");
    const cuerpo = JSON.parse(init.body as string);
    expect(cuerpo.to).toEqual(["ana@ejemplo.test"]);
    expect(cuerpo.headers["List-Unsubscribe"]).toContain("baja");
  });
  it("apiUrl configurable y sin barra doble", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    await crearEnviadorResend({ apiKey: "k", apiUrl: "http://localhost:9999/", fetchImpl: f as unknown as typeof fetch })(CORREO);
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("http://localhost:9999/emails");
  });
  it("un 4xx/5xx es fallo, y el mensaje NO trae la dirección ni la llave", async () => {
    const f = async () => new Response('{"to":"ana@ejemplo.test"}', { status: 422 });
    const r = await crearEnviadorResend({ apiKey: "llave-secreta", fetchImpl: f as unknown as typeof fetch })(CORREO);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("422");
      expect(r.error).not.toContain("ana@ejemplo.test");
      expect(r.error).not.toContain("llave-secreta");
    }
  });
  it("un fallo de red es fallo, no excepción", async () => {
    const f = async () => {
      throw new TypeError("fetch failed ana@ejemplo.test");
    };
    const r = await crearEnviadorResend({ apiKey: "k", fetchImpl: f as unknown as typeof fetch })(CORREO);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).not.toContain("ana@ejemplo.test");
  });
  it("lleva un tiempo máximo (la señal de aborto está presente)", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    await crearEnviadorResend({ apiKey: "k", fetchImpl: f as unknown as typeof fetch })(CORREO);
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBeInstanceOf(AbortSignal);
  });
});
