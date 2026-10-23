import { describe, expect, it } from "vitest";
import { firmarBaja, verificarBaja } from "@/lib/recordatorios/baja-token";

const SECRETO = "s".repeat(32);
const OTRO = "o".repeat(32);
const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";

describe("token de baja", () => {
  it("el token firmado verifica", () => {
    expect(verificarBaja(U1, firmarBaja(U1, SECRETO), SECRETO)).toBe(true);
  });
  it("es determinista: el mismo enlace sirve en todos los correos", () => {
    expect(firmarBaja(U1, SECRETO)).toBe(firmarBaja(U1, SECRETO));
  });
  it("un token de OTRA persona no sirve", () => {
    expect(verificarBaja(U2, firmarBaja(U1, SECRETO), SECRETO)).toBe(false);
  });
  it("firmado con otro secreto no sirve", () => {
    expect(verificarBaja(U1, firmarBaja(U1, OTRO), SECRETO)).toBe(false);
  });
  it("un token alterado un carácter no sirve", () => {
    const t = firmarBaja(U1, SECRETO);
    const alterado = (t[0] === "A" ? "B" : "A") + t.slice(1);
    expect(verificarBaja(U1, alterado, SECRETO)).toBe(false);
  });
  it("un token truncado o con relleno no sirve", () => {
    const t = firmarBaja(U1, SECRETO);
    expect(verificarBaja(U1, t.slice(0, -2), SECRETO)).toBe(false);
    expect(verificarBaja(U1, `${t}AA`, SECRETO)).toBe(false);
  });
  it("vacío o sin id no sirve", () => {
    expect(verificarBaja(U1, "", SECRETO)).toBe(false);
    expect(verificarBaja("", firmarBaja(U1, SECRETO), SECRETO)).toBe(false);
  });
  it("sin secreto configurado SIEMPRE da falso (no hay token «vacío» válido)", () => {
    expect(verificarBaja(U1, firmarBaja(U1, SECRETO), undefined)).toBe(false);
    expect(verificarBaja(U1, firmarBaja(U1, SECRETO), "")).toBe(false);
  });
  it("un secreto corto se rechaza al firmar y al verificar", () => {
    expect(() => firmarBaja(U1, "corto")).toThrow();
    expect(verificarBaja(U1, "x", "corto")).toBe(false);
  });
  it("el dominio `baja:` separa: no equivale al HMAC del id a secas", async () => {
    const { createHmac } = await import("node:crypto");
    const sinPrefijo = createHmac("sha256", SECRETO).update(U1).digest("base64url");
    expect(verificarBaja(U1, sinPrefijo, SECRETO)).toBe(false);
  });
});
