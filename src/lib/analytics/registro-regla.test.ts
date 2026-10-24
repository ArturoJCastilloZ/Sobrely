import { describe, expect, it } from "vitest";
import { decidirRegistro, VENTANA_CUENTA_NUEVA_MS } from "./registro-regla";

const ahora = Date.parse("2026-10-24T12:00:00Z");
const hace = (ms: number) => new Date(ahora - ms).toISOString();

describe("decidirRegistro", () => {
  it("un invitado que convierte su sesión es un registro aunque su cuenta sea de ayer", () => {
    const r = decidirRegistro({
      userId: "u1", creadoEn: hace(24 * 3600_000), invitadoId: "u1", proveedor: "email", ahora,
    });
    expect(r).toEqual({ registrar: true, metodo: "correo" });
  });

  it("una cuenta recién creada con Google es un registro", () => {
    const r = decidirRegistro({
      userId: "u2", creadoEn: hace(5_000), invitadoId: null, proveedor: "google", ahora,
    });
    expect(r).toEqual({ registrar: true, metodo: "google" });
  });

  it("un invitado que entra con una cuenta que ya existía NO es un registro", () => {
    const r = decidirRegistro({
      userId: "u3", creadoEn: hace(90 * 24 * 3600_000), invitadoId: "otro", proveedor: "google", ahora,
    });
    expect(r.registrar).toBe(false);
  });

  it("un inicio de sesión normal de una cuenta vieja NO es un registro", () => {
    expect(
      decidirRegistro({ userId: "u4", creadoEn: hace(10 * 24 * 3600_000), invitadoId: null, proveedor: "email", ahora }).registrar,
    ).toBe(false);
  });

  it("la frontera de la ventana es inclusiva y una fecha ilegible no registra", () => {
    expect(decidirRegistro({ userId: "u5", creadoEn: hace(VENTANA_CUENTA_NUEVA_MS), invitadoId: null, proveedor: "google", ahora }).registrar).toBe(true);
    expect(decidirRegistro({ userId: "u5", creadoEn: hace(VENTANA_CUENTA_NUEVA_MS + 1), invitadoId: null, proveedor: "google", ahora }).registrar).toBe(false);
    expect(decidirRegistro({ userId: "u6", creadoEn: undefined, invitadoId: null, proveedor: "google", ahora }).registrar).toBe(false);
  });
});
