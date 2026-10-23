import { describe, expect, it } from "vitest";
import {
  diasParaElEvento,
  PRIORIDAD,
  tipoDeRecordatorio,
  type TipoRecordatorio,
} from "@/lib/recordatorios/ventanas";

const AHORA = new Date("2026-10-23T15:00:00.000Z");
const H = 3600_000;
const D = 24 * H;
const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString();
const dentroDe = (ms: number) => new Date(AHORA.getTime() + ms).toISOString();
const NADA = new Set<TipoRecordatorio>();

function tipo(
  inactivoMs: number,
  fechaEvento: string | null = null,
  yaEnviados: Set<TipoRecordatorio> = NADA,
) {
  return tipoDeRecordatorio({
    ahora: AHORA,
    actualizadoEn: hace(inactivoMs),
    fechaEvento,
    yaEnviados,
  });
}

describe("borradores por inactividad: bordes exactos", () => {
  it("menos de 24 h: nada", () => {
    expect(tipo(24 * H - 1)).toBeNull();
  });
  it("24 h justas: borrador_24h (el borde inferior ES inclusivo)", () => {
    expect(tipo(24 * H)).toBe("borrador_24h");
  });
  it("justo antes de 72 h sigue siendo borrador_24h", () => {
    expect(tipo(72 * H - 1)).toBe("borrador_24h");
  });
  it("72 h justas: borrador_3d", () => {
    expect(tipo(72 * H)).toBe("borrador_3d");
  });
  it("justo antes de 7 días sigue siendo borrador_3d", () => {
    expect(tipo(7 * D - 1)).toBe("borrador_3d");
  });
  it("7 días justos: ya nada (un borrador viejo no recibe un correo de «¿sigues?»)", () => {
    expect(tipo(7 * D)).toBeNull();
  });
  it("un borrador de hace 90 días no recibe nada", () => {
    expect(tipo(90 * D)).toBeNull();
  });
});

describe("lo ya enviado no se repite", () => {
  it("borrador_24h ya enviado → null (no salta al siguiente tipo)", () => {
    expect(tipo(30 * H, null, new Set(["borrador_24h"]))).toBeNull();
  });
  it("borrador_3d ya enviado → null", () => {
    expect(tipo(80 * H, null, new Set(["borrador_3d"]))).toBeNull();
  });
  it("haber enviado el de 24 h NO impide el de 3 días", () => {
    expect(tipo(80 * H, null, new Set(["borrador_24h"]))).toBe("borrador_3d");
  });
});

describe("evento cercano", () => {
  it("evento dentro de 7 días y sin publicar: evento_7d, aunque el borrador sea reciente", () => {
    expect(tipo(1 * H, dentroDe(5 * D))).toBe("evento_7d");
  });
  it("evento a justo 7 días: evento_7d (borde inclusivo)", () => {
    expect(tipo(1 * H, dentroDe(7 * D))).toBe("evento_7d");
  });
  it("evento a 7 días y 1 ms: todavía no", () => {
    expect(tipo(1 * H, dentroDe(7 * D + 1))).toBeNull();
  });
  it("con evento cercano NO se mandan los de inactividad (el de evento los reemplaza)", () => {
    expect(tipo(30 * H, dentroDe(3 * D))).toBe("evento_7d");
    expect(tipo(80 * H, dentroDe(3 * D))).toBe("evento_7d");
  });
  it("evento_7d ya enviado → null, y tampoco cae a un recordatorio de inactividad", () => {
    expect(tipo(30 * H, dentroDe(3 * D), new Set(["evento_7d"]))).toBeNull();
  });
  it("evento pasado anula TODO, aunque el borrador esté en ventana", () => {
    expect(tipo(30 * H, hace(1 * H))).toBeNull();
    expect(tipo(80 * H, hace(5 * D))).toBeNull();
  });
  it("evento exactamente ahora cuenta como pasado", () => {
    expect(tipo(30 * H, AHORA.toISOString())).toBeNull();
  });
  it("evento lejano (más de 7 días) se rige por la inactividad", () => {
    expect(tipo(30 * H, dentroDe(40 * D))).toBe("borrador_24h");
  });
  it("evento_7d llega aunque el borrador esté abandonado hace más de 7 días", () => {
    expect(tipo(30 * D, dentroDe(3 * D))).toBe("evento_7d");
  });
});

describe("datos malos: ante la duda, silencio", () => {
  it("updatedAt ilegible → null", () => {
    expect(
      tipoDeRecordatorio({ ahora: AHORA, actualizadoEn: "no-es-fecha", fechaEvento: null, yaEnviados: NADA }),
    ).toBeNull();
  });
  it("updatedAt en el futuro (reloj desfasado) → null", () => {
    expect(
      tipoDeRecordatorio({ ahora: AHORA, actualizadoEn: dentroDe(2 * H), fechaEvento: null, yaEnviados: NADA }),
    ).toBeNull();
  });
  it("fecha de evento ilegible = sin fecha: se rige por inactividad", () => {
    expect(tipo(30 * H, "mañana")).toBe("borrador_24h");
  });
  it("fecha de evento vacía = sin fecha", () => {
    expect(tipo(30 * H, "")).toBe("borrador_24h");
  });
});

describe("diasParaElEvento", () => {
  it("redondea hacia arriba", () => {
    expect(diasParaElEvento(dentroDe(2 * D + 1), AHORA)).toBe(3);
    expect(diasParaElEvento(dentroDe(2 * D), AHORA)).toBe(2);
    expect(diasParaElEvento(dentroDe(1), AHORA)).toBe(1);
  });
  it("null si no hay fecha, es ilegible o ya pasó", () => {
    expect(diasParaElEvento(null, AHORA)).toBeNull();
    expect(diasParaElEvento("x", AHORA)).toBeNull();
    expect(diasParaElEvento(AHORA.toISOString(), AHORA)).toBeNull();
    expect(diasParaElEvento(hace(D), AHORA)).toBeNull();
  });
});

describe("prioridad", () => {
  it("el evento va primero, luego 3 días, luego 24 h", () => {
    expect(PRIORIDAD).toEqual(["evento_7d", "borrador_3d", "borrador_24h"]);
  });
});
