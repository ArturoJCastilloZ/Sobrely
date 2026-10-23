import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `next/headers` no existe fuera de una petición; se sustituye por un almacén
 * en memoria que registra qué opciones recibió la cookie. Es el mismo contrato
 * (`set` / `get` / `delete` sobre `await cookies()`), no una versión «más fácil».
 */
type Guardada = { valor: string; opciones: Record<string, unknown> };
const tienda = new Map<string, Guardada>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (nombre: string, valor: string, opciones: Record<string, unknown>) => {
      tienda.set(nombre, { valor, opciones });
    },
    get: (nombre: string) => {
      const c = tienda.get(nombre);
      return c ? { name: nombre, value: c.valor } : undefined;
    },
    delete: (nombre: string) => {
      tienda.delete(nombre);
    },
  }),
}));

import {
  COOKIE_INTENCION,
  elegirDestinoTrasConfirmar,
  guardarIntencion,
  leerIntencion,
  olvidarIntencion,
} from "@/lib/auth/intencion";

beforeEach(() => tienda.clear());

describe("guardarIntencion", () => {
  it("guarda un destino interno con cookie httpOnly, SameSite=Lax y caducidad de un día", async () => {
    await guardarIntencion("/plantillas/boda-x?usar=1");
    const c = tienda.get(COOKIE_INTENCION)!;
    expect(c.valor).toBe("/plantillas/boda-x?usar=1");
    expect(c.opciones).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 86_400,
    });
  });

  it("NO guarda un destino que sale del sitio", async () => {
    for (const malo of ["//evil.com", "/\\evil.com", "https://evil.com", null, 5]) {
      await guardarIntencion(malo);
    }
    expect(tienda.size).toBe(0);
  });

  it("NO guarda el destino por defecto: no es una intención", async () => {
    await guardarIntencion("/dashboard");
    expect(tienda.size).toBe(0);
  });
});

describe("leerIntencion", () => {
  it("devuelve lo guardado", async () => {
    await guardarIntencion("/plantillas/x?usar=1");
    expect(await leerIntencion()).toBe("/plantillas/x?usar=1");
  });

  it("sin cookie devuelve null", async () => {
    expect(await leerIntencion()).toBeNull();
  });

  it("REVALIDA al leer: una cookie manipulada a mano hacia otro host se descarta", async () => {
    // La cookie es entrada del usuario. Se escribe directo en el almacén para
    // simular que alguien la editó después de que el servidor la guardó.
    tienda.set(COOKIE_INTENCION, { valor: "//evil.com", opciones: {} });
    expect(await leerIntencion()).toBeNull();
  });
});

describe("olvidarIntencion", () => {
  it("borra la cookie", async () => {
    await guardarIntencion("/plantillas/x?usar=1");
    await olvidarIntencion();
    expect(await leerIntencion()).toBeNull();
  });
});

describe("elegirDestinoTrasConfirmar", () => {
  it("con el destino por defecto en el enlace, gana lo recordado", () => {
    expect(elegirDestinoTrasConfirmar("/dashboard", "/plantillas/x?usar=1")).toBe(
      "/plantillas/x?usar=1",
    );
  });

  it("sin nada recordado se queda con el del enlace", () => {
    expect(elegirDestinoTrasConfirmar("/dashboard", null)).toBe("/dashboard");
  });

  it("un destino propio del enlace (recuperar contraseña) NO lo pisa lo recordado", () => {
    expect(elegirDestinoTrasConfirmar("/reset-password", "/plantillas/x?usar=1")).toBe(
      "/reset-password",
    );
  });
});
