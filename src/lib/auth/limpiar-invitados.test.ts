import { describe, expect, it } from "vitest";
import { limpiarInvitados, type DepsLimpieza } from "@/lib/auth/limpiar-invitados";

const AHORA = new Date("2026-10-24T12:00:00Z");
const VIEJO = "2026-08-01T00:00:00.000Z";
const RECIENTE = "2026-10-20T00:00:00.000Z";

function dobles(o: {
  candidatos: { id: string; ultimaActividad: string }[];
  protegidos?: string[];
  fallaProteccion?: string;
  borraFalla?: string;
}) {
  const borrados: string[] = [];
  const deps: DepsLimpieza = {
    async candidatos() {
      return o.candidatos;
    },
    async tieneAlgoQueProteger(id) {
      if (id === o.fallaProteccion) throw new Error("x");
      return (o.protegidos ?? []).includes(id);
    },
    async borrar(id) {
      if (id === o.borraFalla) return false;
      borrados.push(id);
      return true;
    },
  };
  return { deps, borrados };
}

describe("limpiarInvitados", () => {
  it("borra al inactivo sin nada que proteger", async () => {
    const { deps, borrados } = dobles({ candidatos: [{ id: "a", ultimaActividad: VIEJO }] });
    const r = await limpiarInvitados(deps, { ahora: AHORA, dryRun: false });
    expect(borrados).toEqual(["a"]);
    expect(r).toMatchObject({ revisados: 1, borrados: 1, protegidos: 0, errores: 0, ids: ["a"] });
  });

  it("NO borra al que tiene publicaciones u órdenes", async () => {
    const { deps, borrados } = dobles({
      candidatos: [{ id: "a", ultimaActividad: VIEJO }],
      protegidos: ["a"],
    });
    const r = await limpiarInvitados(deps, { ahora: AHORA, dryRun: false });
    expect(borrados).toEqual([]);
    expect(r.protegidos).toBe(1);
  });

  it("NO borra al reciente aunque el adaptador lo devuelva por error", async () => {
    const { deps, borrados } = dobles({ candidatos: [{ id: "a", ultimaActividad: RECIENTE }] });
    const r = await limpiarInvitados(deps, { ahora: AHORA, dryRun: false });
    expect(borrados).toEqual([]);
    expect(r.protegidos).toBe(1);
  });

  it("dry-run: lista lo que borraría y no borra nada", async () => {
    const { deps, borrados } = dobles({ candidatos: [{ id: "a", ultimaActividad: VIEJO }] });
    const r = await limpiarInvitados(deps, { ahora: AHORA, dryRun: true });
    expect(borrados).toEqual([]);
    expect(r).toMatchObject({ dryRun: true, borrados: 0, ids: ["a"] });
  });

  it("si la consulta de protección falla, se omite (no se borra) y se cuenta como error", async () => {
    const { deps, borrados } = dobles({
      candidatos: [{ id: "a", ultimaActividad: VIEJO }],
      fallaProteccion: "a",
    });
    const r = await limpiarInvitados(deps, { ahora: AHORA, dryRun: false });
    expect(borrados).toEqual([]);
    expect(r.errores).toBe(1);
  });

  it("un fallo al borrar a uno no detiene a los demás", async () => {
    const { deps, borrados } = dobles({
      candidatos: [
        { id: "a", ultimaActividad: VIEJO },
        { id: "b", ultimaActividad: VIEJO },
      ],
      borraFalla: "a",
    });
    const r = await limpiarInvitados(deps, { ahora: AHORA, dryRun: false });
    expect(borrados).toEqual(["b"]);
    expect(r).toMatchObject({ borrados: 1, errores: 1 });
  });

  it("respeta el tope por corrida aunque el adaptador devuelva de más", async () => {
    const muchos = Array.from({ length: 80 }, (_, i) => ({ id: `u${i}`, ultimaActividad: VIEJO }));
    const { deps, borrados } = dobles({ candidatos: muchos });
    const r = await limpiarInvitados(deps, { ahora: AHORA, dryRun: false, limite: 500 });
    expect(borrados).toHaveLength(50);
    expect(r.revisados).toBe(50);
  });
});
