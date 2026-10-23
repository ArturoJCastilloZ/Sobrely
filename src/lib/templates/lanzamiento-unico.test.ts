import { describe, expect, it } from "vitest";
import {
  reclamarLanzamiento,
  VENTANA_LANZAMIENTO_MS,
} from "@/lib/templates/lanzamiento-unico";

const almacenFalso = () => {
  const d = new Map<string, string>();
  return {
    getItem: (k: string) => d.get(k) ?? null,
    setItem: (k: string, v: string) => void d.set(k, v),
    datos: d,
  };
};

describe("reclamarLanzamiento", () => {
  it("la primera vez deja pasar", () => {
    expect(reclamarLanzamiento("t1", new Map(), almacenFalso(), 1000)).toBe(true);
  });

  it("REPRODUCE EL DEFECTO MEDIDO: una segunda INSTANCIA (mismo módulo) no pasa", () => {
    // Dos montajes del componente comparten la memoria del módulo, no el `ref`.
    const memoriaDelModulo = new Map<string, number>();
    const instanciaA = reclamarLanzamiento("t1", memoriaDelModulo, null, 1000);
    const instanciaB = reclamarLanzamiento("t1", memoriaDelModulo, null, 1100);
    expect([instanciaA, instanciaB]).toEqual([true, false]);
  });

  it("una recarga (memoria nueva, mismo sessionStorage) tampoco pasa", () => {
    const almacen = almacenFalso();
    expect(reclamarLanzamiento("t1", new Map(), almacen, 1000)).toBe(true);
    expect(reclamarLanzamiento("t1", new Map(), almacen, 2000)).toBe(false);
  });

  it("distintas plantillas no se bloquean entre sí", () => {
    const memoria = new Map<string, number>();
    expect(reclamarLanzamiento("t1", memoria, null, 1000)).toBe(true);
    expect(reclamarLanzamiento("t2", memoria, null, 1000)).toBe(true);
  });

  it("caduca: pasada la ventana se puede crear otra (no bloquea de por vida)", () => {
    const memoria = new Map<string, number>();
    expect(reclamarLanzamiento("t1", memoria, null, 1000)).toBe(true);
    expect(reclamarLanzamiento("t1", memoria, null, 1000 + VENTANA_LANZAMIENTO_MS - 1)).toBe(false);
    expect(reclamarLanzamiento("t1", memoria, null, 1000 + VENTANA_LANZAMIENTO_MS)).toBe(true);
  });

  it("un almacenamiento que lanza (modo privado) no rompe y la memoria del módulo sigue protegiendo", () => {
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    };
    const memoria = new Map<string, number>();
    expect(reclamarLanzamiento("t1", memoria, roto, 1000)).toBe(true);
    expect(reclamarLanzamiento("t1", memoria, roto, 1100)).toBe(false);
  });

  it("sin almacenamiento (null) funciona solo con la memoria", () => {
    const memoria = new Map<string, number>();
    expect(reclamarLanzamiento("t1", memoria, null, 1000)).toBe(true);
    expect(reclamarLanzamiento("t1", memoria, null, 1001)).toBe(false);
  });

  it("un valor basura en el almacén no bloquea ni rompe", () => {
    const almacen = almacenFalso();
    almacen.datos.set("t1", "no-es-un-numero");
    expect(reclamarLanzamiento("t1", new Map(), almacen, 1000)).toBe(true);
  });

  it("una marca del futuro (reloj raro) no bloquea para siempre", () => {
    const almacen = almacenFalso();
    almacen.datos.set("t1", String(9_999_999_999));
    expect(reclamarLanzamiento("t1", new Map(), almacen, 1000)).toBe(true);
  });
});
