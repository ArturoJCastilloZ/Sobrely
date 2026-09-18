import { describe, expect, it } from "vitest";

import { paradaExtrema, siguienteParada, type Parada } from "@/lib/editor/recorrido";
import { mismaSeleccion, type Seleccion } from "@/lib/editor/seleccion";

/**
 * El recorrido por teclado, probado sobre una lista que REPLICA lo que el DOM
 * emite de verdad: dos modulos seguidos, el segundo con un solo bloque.
 *
 * El caso de `gifts` esta representado a proposito por `bloque("m2", "0")` sin
 * el "1": la secuencia renderizada es un PREFIJO de la tabla de `bloques.ts`,
 * asi que una seleccion guardada puede apuntar a un bloque que ya no existe.
 */
const LISTA: Parada[] = [
  { moduloId: "m1", bloque: "0" },
  { moduloId: "m1", bloque: "1" },
  { moduloId: "m2", bloque: "0" },
];

const bloque = (moduloId: string, b: string): Seleccion => ({
  tipo: "bloque",
  moduloId,
  bloque: b,
});

describe("siguienteParada", () => {
  it("avanza al siguiente bloque del mismo modulo", () => {
    expect(siguienteParada(LISTA, bloque("m1", "0"), 1)).toEqual(bloque("m1", "1"));
  });

  it("cruza al modulo siguiente cuando el bloque era el ultimo del suyo", () => {
    expect(siguienteParada(LISTA, bloque("m1", "1"), 1)).toEqual(bloque("m2", "0"));
  });

  it("retrocede cruzando el limite de modulo", () => {
    expect(siguienteParada(LISTA, bloque("m2", "0"), -1)).toEqual(bloque("m1", "1"));
  });

  it("TOPA en el final: devuelve la MISMA seleccion, no vuelve al principio", () => {
    const sel = bloque("m2", "0");
    const r = siguienteParada(LISTA, sel, 1);
    expect(r).toEqual(sel);
    // Por valor, que es lo que el provider compara para no repintar.
    expect(mismaSeleccion(r, sel)).toBe(true);
  });

  it("TOPA en el principio", () => {
    const sel = bloque("m1", "0");
    expect(siguienteParada(LISTA, sel, -1)).toEqual(sel);
  });

  it("sin seleccion entra por la PRIMERA parada", () => {
    expect(siguienteParada(LISTA, null, 1)).toEqual(bloque("m1", "0"));
  });

  it("sin seleccion y hacia atras entra por la ULTIMA", () => {
    expect(siguienteParada(LISTA, null, -1)).toEqual(bloque("m2", "0"));
  });

  it("desde un MODULO seleccionado entra por su primera parada, no por la del lienzo", () => {
    const r = siguienteParada(LISTA, { tipo: "modulo", moduloId: "m2" }, 1);
    expect(r).toEqual(bloque("m2", "0"));
  });

  it("un bloque que el render YA NO emite aterriza en su modulo, no al principio", () => {
    // `m2` solo emite el "0" en esta lista: el "1" es el hijo condicional de
    // cola que desaparecio. La seleccion guardada no debe mandar el foco al
    // otro extremo de la invitacion.
    const r = siguienteParada(LISTA, bloque("m2", "1"), 1);
    expect(r).toEqual(bloque("m2", "0"));
  });

  it("con la lista VACIA devuelve la seleccion intacta", () => {
    const sel = bloque("m1", "0");
    expect(siguienteParada([], sel, 1)).toEqual(sel);
    expect(siguienteParada([], null, 1)).toBeNull();
  });
});

describe("paradaExtrema", () => {
  it("primera y ultima", () => {
    expect(paradaExtrema(LISTA, null, "primera")).toEqual(bloque("m1", "0"));
    expect(paradaExtrema(LISTA, null, "ultima")).toEqual(bloque("m2", "0"));
  });

  it("con la lista vacia no inventa una parada", () => {
    const sel = bloque("m1", "0");
    expect(paradaExtrema([], sel, "primera")).toEqual(sel);
  });
});
