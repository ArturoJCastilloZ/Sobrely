import { describe, expect, it } from "vitest";
import { agruparErrores, type FilaError } from "./agrupar";

const fila = (o: Partial<FilaError>): FilaError => ({
  created_at: "2026-10-24T10:00:00Z",
  origen: "servidor",
  severidad: "aviso",
  huella: "h1",
  mensaje: "m",
  contexto: {},
  alertado_en: null,
  ...o,
});

describe("agruparErrores", () => {
  it("junta repeticiones, cuenta y toma primera y última vez", () => {
    const g = agruparErrores([
      fila({ created_at: "2026-10-24T10:00:00Z" }),
      fila({ created_at: "2026-10-24T12:00:00Z", mensaje: "más nuevo", contexto: { order_id: "x" } }),
      fila({ created_at: "2026-10-24T11:00:00Z" }),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({
      veces: 3,
      primera: "2026-10-24T10:00:00Z",
      ultima: "2026-10-24T12:00:00Z",
      mensaje: "más nuevo",
      contexto: { order_id: "x" },
    });
  });

  it("pone primero los críticos y luego los más recientes", () => {
    const g = agruparErrores([
      fila({ huella: "a", created_at: "2026-10-24T09:00:00Z", severidad: "critico" }),
      fila({ huella: "b", created_at: "2026-10-24T13:00:00Z" }),
      fila({ huella: "c", created_at: "2026-10-24T12:00:00Z" }),
    ]);
    expect(g.map((x) => x.huella)).toEqual(["a", "b", "c"]);
  });

  it("una causa que alguna vez fue crítica o alertada lo refleja", () => {
    const g = agruparErrores([
      fila({ severidad: "aviso" }),
      fila({ severidad: "critico", alertado_en: "2026-10-24T10:01:00Z" }),
    ]);
    expect(g[0].severidad).toBe("critico");
    expect(g[0].alertado).toBe(true);
  });

  it("sin filas no hay grupos", () => {
    expect(agruparErrores([])).toEqual([]);
  });
});
