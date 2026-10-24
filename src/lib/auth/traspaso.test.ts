import { describe, expect, it } from "vitest";
import { esAnonimo, MAX_INVITACIONES_ANONIMO } from "@/lib/auth/sesion";
import { decidirTraspaso, type EstadoDeUsuario } from "@/lib/auth/traspaso-regla";
import { ejecutarTraspaso, type DepsTraspaso } from "@/lib/auth/traspaso-ejecucion";

const ANON: EstadoDeUsuario = { existe: true, esAnonimo: true };
const REAL: EstadoDeUsuario = { existe: true, esAnonimo: false };
const NO_EXISTE: EstadoDeUsuario = { existe: false, esAnonimo: false };

describe("esAnonimo", () => {
  it("solo `is_anonymous: true` es anónimo", () => {
    expect(esAnonimo({ is_anonymous: true })).toBe(true);
    expect(esAnonimo({ is_anonymous: false })).toBe(false);
  });
  it("sin el campo, sin usuario o con valores raros: se trata como REGISTRADO (la dirección segura)", () => {
    expect(esAnonimo({})).toBe(false);
    expect(esAnonimo(null)).toBe(false);
    expect(esAnonimo(undefined)).toBe(false);
    expect(esAnonimo({ is_anonymous: "true" as unknown as boolean })).toBe(false);
    expect(esAnonimo({ is_anonymous: 1 as unknown as boolean })).toBe(false);
  });
  it("el tope de invitaciones coincide con el de la migración 0062", () => {
    expect(MAX_INVITACIONES_ANONIMO).toBe(3);
  });
});

describe("decidirTraspaso", () => {
  const base = { origenId: "A", destinoId: "B", origen: ANON, destino: REAL };

  it("anónimo → cuenta real: se traslada", () => {
    expect(decidirTraspaso(base)).toEqual({ trasladar: true });
  });
  it.each([
    ["sin origen (id nulo)", { ...base, origenId: null }, "sin_origen"],
    ["mismo usuario (la conversión conserva el id)", { ...base, destinoId: "A" }, "mismo_usuario"],
    ["origen que no existe", { ...base, origen: NO_EXISTE }, "origen_inexistente"],
    ["origen ausente", { ...base, origen: null }, "origen_inexistente"],
    ["origen que es una cuenta REAL (nunca se mueve su contenido)", { ...base, origen: REAL }, "origen_no_anonimo"],
    ["destino que no existe", { ...base, destino: NO_EXISTE }, "destino_inexistente"],
    ["destino ausente", { ...base, destino: null }, "destino_inexistente"],
    ["destino anónimo (no se mueve entre anónimos)", { ...base, destino: ANON }, "destino_anonimo"],
  ])("rechaza: %s", (_n, e, motivo) => {
    expect(decidirTraspaso(e)).toEqual({ trasladar: false, motivo });
  });

  it("el id vacío cuenta como sin origen", () => {
    expect(decidirTraspaso({ ...base, origenId: "" })).toEqual({ trasladar: false, motivo: "sin_origen" });
  });
});

/** Dobles que registran qué se llamó y en qué orden. */
function dobles(o: {
  estados?: Record<string, EstadoDeUsuario>;
  cuenta?: number;
  mueve?: number;
  borra?: boolean;
  falla?: "leer" | "contar" | "mover" | "borrar";
}) {
  const llamadas: string[] = [];
  const estados = o.estados ?? { A: ANON, B: REAL };
  const deps: DepsTraspaso = {
    async leerUsuario(id) {
      llamadas.push(`leer:${id}`);
      if (o.falla === "leer") throw new Error("x");
      return estados[id] ?? NO_EXISTE;
    },
    async contarInvitaciones(id) {
      llamadas.push(`contar:${id}`);
      if (o.falla === "contar") throw new Error("x");
      return o.cuenta ?? 2;
    },
    async moverInvitaciones(a, b) {
      llamadas.push(`mover:${a}->${b}`);
      if (o.falla === "mover") throw new Error("x");
      return o.mueve ?? o.cuenta ?? 2;
    },
    async borrarUsuario(id) {
      llamadas.push(`borrar:${id}`);
      if (o.falla === "borrar") throw new Error("x");
      return o.borra ?? true;
    },
  };
  return { deps, llamadas };
}

describe("ejecutarTraspaso", () => {
  it("camino feliz: cuenta, mueve TODO y solo entonces borra al anónimo, en ese orden", async () => {
    const { deps, llamadas } = dobles({ cuenta: 2 });
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
    expect(r).toEqual({ trasladadas: 2, anonimoBorrado: true });
    const pasos = llamadas.filter((l) => !l.startsWith("leer"));
    expect(pasos).toEqual(["contar:A", "mover:A->B", "borrar:A"]);
  });

  it("origen que NO es anónimo → no cuenta, no mueve, no borra", async () => {
    const { deps, llamadas } = dobles({ estados: { A: REAL, B: REAL } });
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
    expect(r).toEqual({ trasladadas: 0, anonimoBorrado: false, motivo: "origen_no_anonimo" });
    expect(llamadas.some((l) => /^(contar|mover|borrar)/.test(l))).toBe(false);
  });

  it("destino anónimo → no mueve ni borra", async () => {
    const { deps, llamadas } = dobles({ estados: { A: ANON, B: ANON } });
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
    expect(r.motivo).toBe("destino_anonimo");
    expect(llamadas.some((l) => /^(contar|mover|borrar)/.test(l))).toBe(false);
  });

  it("mismo usuario (conversión) → ni siquiera consulta nada", async () => {
    const { deps, llamadas } = dobles({});
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "A" });
    expect(r).toEqual({ trasladadas: 0, anonimoBorrado: false, motivo: "mismo_usuario" });
    expect(llamadas).toEqual([]);
  });

  it("sin sesión anónima previa (el caso normal de un login) → no hace nada", async () => {
    const { deps, llamadas } = dobles({});
    const r = await ejecutarTraspaso(deps, { origenId: null, destinoId: "B" });
    expect(r.motivo).toBe("sin_origen");
    expect(llamadas).toEqual([]);
  });

  it("si se movieron MENOS de las que había, NO se borra al anónimo (se perdería el resto en cascada)", async () => {
    const { deps, llamadas } = dobles({ cuenta: 3, mueve: 2 });
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
    expect(r).toEqual({ trasladadas: 2, anonimoBorrado: false, motivo: "traslado_incompleto" });
    expect(llamadas.some((l) => l.startsWith("borrar"))).toBe(false);
  });

  it("si se movieron MÁS de las contadas (carrera) tampoco se borra: no cuadra", async () => {
    const { deps, llamadas } = dobles({ cuenta: 1, mueve: 2 });
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
    expect(r.motivo).toBe("traslado_incompleto");
    expect(llamadas.some((l) => l.startsWith("borrar"))).toBe(false);
  });

  it("un anónimo sin invitaciones: no mueve nada y se borra (no hay qué perder)", async () => {
    const { deps, llamadas } = dobles({ cuenta: 0 });
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
    expect(r).toEqual({ trasladadas: 0, anonimoBorrado: true });
    expect(llamadas.some((l) => l.startsWith("mover"))).toBe(false);
  });

  it.each(["leer", "contar", "mover"] as const)(
    "si falla «%s», no lanza, devuelve `error` y NO borra",
    async (falla) => {
      const { deps, llamadas } = dobles({ falla });
      const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
      expect(r).toEqual({ trasladadas: 0, anonimoBorrado: false, motivo: "error" });
      expect(llamadas.some((l) => l.startsWith("borrar"))).toBe(false);
    },
  );

  it("si el borrado del anónimo falla, lo trasladado cuenta y no se reporta error (la limpieza lo recogerá)", async () => {
    const { deps } = dobles({ borra: false });
    expect(await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" })).toEqual({
      trasladadas: 2,
      anonimoBorrado: false,
    });
  });

  it("si el borrado LANZA, devuelve `error` sin propagar", async () => {
    const { deps } = dobles({ falla: "borrar" });
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
    expect(r.motivo).toBe("error");
  });

  it("el motivo de error no filtra el mensaje de la excepción", async () => {
    const deps = dobles({}).deps;
    deps.contarInvitaciones = async () => {
      throw new Error("password=secreto host=db.interno");
    };
    const r = await ejecutarTraspaso(deps, { origenId: "A", destinoId: "B" });
    expect(JSON.stringify(r)).not.toContain("secreto");
    expect(JSON.stringify(r)).not.toContain("db.interno");
  });
});
