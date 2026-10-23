import { describe, expect, it } from "vitest";
import { esInicioReciente, VENTANA_INICIO_RECIENTE_MS } from "@/lib/auth/inicio-reciente";

const AHORA = new Date("2026-10-23T12:00:00.000Z");
const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString();

describe("esInicioReciente", () => {
  it("un inicio de hace segundos cuenta", () => {
    expect(esInicioReciente(hace(5_000), AHORA)).toBe(true);
    expect(esInicioReciente(hace(0), AHORA)).toBe(true);
  });

  it("justo en el borde de la ventana todavía cuenta; un milisegundo después ya no", () => {
    expect(esInicioReciente(hace(VENTANA_INICIO_RECIENTE_MS), AHORA)).toBe(true);
    expect(esInicioReciente(hace(VENTANA_INICIO_RECIENTE_MS + 1), AHORA)).toBe(false);
  });

  it("una sesión de días NO cuenta: es la que un enlace ajeno encontraría abierta", () => {
    expect(esInicioReciente(hace(3 * 24 * 3600 * 1000), AHORA)).toBe(false);
  });

  it("tolera unos segundos de adelanto del reloj del servidor de auth", () => {
    expect(esInicioReciente(hace(-5_000), AHORA)).toBe(true);
  });

  it("pero un inicio «en el futuro» lejano no cuenta (dato falso, no reloj desfasado)", () => {
    expect(esInicioReciente(hace(-60_000), AHORA)).toBe(false);
  });

  it("sin dato o con dato roto devuelve falso: ante la duda no se crea nada", () => {
    expect(esInicioReciente(null, AHORA)).toBe(false);
    expect(esInicioReciente(undefined, AHORA)).toBe(false);
    expect(esInicioReciente("", AHORA)).toBe(false);
    expect(esInicioReciente("no es una fecha", AHORA)).toBe(false);
  });

  it("la ventana es configurable", () => {
    expect(esInicioReciente(hace(30_000), AHORA, 10_000)).toBe(false);
    expect(esInicioReciente(hace(30_000), AHORA, 60_000)).toBe(true);
  });
});
