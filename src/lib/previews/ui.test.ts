import { describe, expect, it } from "vitest";
import {
  AVISO_CAMBIOS_SIN_GUARDAR,
  estadoDelBoton,
  mensajeDeLigaCopiada,
  mensajeDeRevocadas,
} from "@/lib/previews/ui";
import { textoDeDias } from "@/lib/previews/vigencia";

const AHORA = new Date("2026-10-23T12:00:00.000Z");
const enDias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000).toISOString();

describe("estadoDelBoton", () => {
  it("libre y sin cambios pendientes: habilitado, sin avisos", () => {
    expect(estadoDelBoton({ dirty: false, pendiente: false })).toEqual({
      deshabilitado: false,
      motivo: null,
    });
  });

  it("con cambios sin guardar: DESHABILITADO y dice por qué (la vista previa muestra lo guardado)", () => {
    const e = estadoDelBoton({ dirty: true, pendiente: false });
    expect(e.deshabilitado).toBe(true);
    expect(e.motivo).toBe(AVISO_CAMBIOS_SIN_GUARDAR);
  });

  it("mientras crea una liga: deshabilitado (un doble clic no crea dos), sin aviso de guardar", () => {
    expect(estadoDelBoton({ dirty: false, pendiente: true })).toEqual({
      deshabilitado: true,
      motivo: null,
    });
  });

  it("si hay cambios Y está creando, manda el aviso de guardar", () => {
    expect(estadoDelBoton({ dirty: true, pendiente: true }).motivo).toBe(
      AVISO_CAMBIOS_SIN_GUARDAR,
    );
  });
});

describe("textos", () => {
  it("la liga copiada dice los días que le quedan, con el plural correcto", () => {
    expect(mensajeDeLigaCopiada(enDias(7), AHORA)).toBe("Liga copiada. Vence en 7 días.");
    expect(mensajeDeLigaCopiada(enDias(1), AHORA)).toBe("Liga copiada. Vence en 1 día.");
  });

  it("textoDeDias: singular y plural", () => {
    expect(textoDeDias(1)).toBe("1 día");
    expect(textoDeDias(0)).toBe("0 días");
    expect(textoDeDias(7)).toBe("7 días");
  });

  it("revocar: 0, 1 y varias, sin decir «0 ligas revocadas» como si hubiera pasado algo", () => {
    expect(mensajeDeRevocadas(0)).toBe("No había ligas vigentes que revocar.");
    expect(mensajeDeRevocadas(1)).toBe("Se revocó 1 liga.");
    expect(mensajeDeRevocadas(3)).toBe("Se revocaron 3 ligas.");
    expect(mensajeDeRevocadas(-1)).toBe("No había ligas vigentes que revocar.");
  });
});
