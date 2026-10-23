import { describe, expect, it } from "vitest";
import {
  calcularVencimiento,
  diasRestantes,
  estadoDeLiga,
  generarToken,
  hashToken,
  tieneFormatoDeToken,
  VIGENCIA_DIAS,
} from "@/lib/previews/token";

const AHORA = new Date("2026-10-23T12:00:00.000Z");
const enDias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000).toISOString();

describe("generarToken / hashToken", () => {
  it("el token tiene la forma que `tieneFormatoDeToken` exige (43 caracteres base64url)", () => {
    for (let i = 0; i < 50; i++) expect(tieneFormatoDeToken(generarToken())).toBe(true);
  });

  it("dos tokens nunca coinciden (256 bits de azar)", () => {
    const vistos = new Set(Array.from({ length: 500 }, generarToken));
    expect(vistos.size).toBe(500);
  });

  it("el hash tiene 64 caracteres hex, es determinista y NO contiene el token", () => {
    const t = generarToken();
    const h = hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(h);
    expect(h).not.toContain(t);
  });

  it("vector conocido: sha256('abc') — si cambia el algoritmo, las ligas viejas dejarían de abrir", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("tokens distintos dan hashes distintos", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("tieneFormatoDeToken", () => {
  const bueno = "A".repeat(43);

  it("acepta exactamente 43 caracteres base64url", () => {
    expect(tieneFormatoDeToken(bueno)).toBe(true);
    expect(tieneFormatoDeToken("a-_Z0".padEnd(43, "x"))).toBe(true);
  });

  it("rechaza largo incorrecto, caracteres fuera del alfabeto y tipos raros", () => {
    for (const malo of [
      "", "A".repeat(42), "A".repeat(44), bueno + "\n", " " + bueno.slice(1),
      "A".repeat(42) + "+", "A".repeat(42) + "/", "A".repeat(42) + "=",
      "../" + "A".repeat(40), "A".repeat(42) + "'", "A".repeat(42) + ";",
      null, undefined, 42, {}, [],
    ]) {
      expect(tieneFormatoDeToken(malo), JSON.stringify(malo)).toBe(false);
    }
  });
});

describe("calcularVencimiento", () => {
  it("vence a los 7 días exactos (decisión del dev)", () => {
    expect(VIGENCIA_DIAS).toBe(7);
    expect(calcularVencimiento(AHORA).toISOString()).toBe(enDias(7));
  });
});

describe("estadoDeLiga", () => {
  it("vigente cuando falta tiempo y no está revocada", () => {
    expect(estadoDeLiga({ expires_at: enDias(3), revoked_at: null }, AHORA)).toBe("vigente");
  });

  it("vencida cuando ya pasó; en el instante exacto del vencimiento ya NO sirve", () => {
    expect(estadoDeLiga({ expires_at: enDias(-1), revoked_at: null }, AHORA)).toBe("vencida");
    expect(estadoDeLiga({ expires_at: AHORA.toISOString(), revoked_at: null }, AHORA)).toBe("vencida");
  });

  it("revocada manda sobre vigente, y también sobre vencida", () => {
    const revocada = AHORA.toISOString();
    expect(estadoDeLiga({ expires_at: enDias(3), revoked_at: revocada }, AHORA)).toBe("revocada");
    expect(estadoDeLiga({ expires_at: enDias(-3), revoked_at: revocada }, AHORA)).toBe("revocada");
  });

  it("un vencimiento ilegible cuenta como vencida: ante la duda, cerrada", () => {
    expect(estadoDeLiga({ expires_at: "no-es-fecha", revoked_at: null }, AHORA)).toBe("vencida");
    expect(estadoDeLiga({ expires_at: "", revoked_at: null }, AHORA)).toBe("vencida");
  });
});

describe("diasRestantes", () => {
  it("cuenta días enteros hacia arriba y nunca baja de 0", () => {
    expect(diasRestantes(enDias(7), AHORA)).toBe(7);
    expect(diasRestantes(new Date(AHORA.getTime() + 3_600_000).toISOString(), AHORA)).toBe(1);
    expect(diasRestantes(enDias(-2), AHORA)).toBe(0);
    expect(diasRestantes("basura", AHORA)).toBe(0);
  });
});
