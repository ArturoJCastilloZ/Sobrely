import { describe, expect, it, vi } from "vitest";
import {
  ejecutarRecordatorios,
  type Almacen,
  type Candidato,
  type ResultadoDeReclamo,
} from "@/lib/recordatorios/ejecutar";
import type { Correo, Enviar } from "@/lib/recordatorios/resend";
import { verificarBaja } from "@/lib/recordatorios/baja-token";
import type { TipoRecordatorio } from "@/lib/recordatorios/ventanas";

const AHORA = new Date("2026-10-23T15:00:00.000Z");
const H = 3600_000;
const D = 24 * H;
const SECRETO = "s".repeat(32);
const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString();
const dentroDe = (ms: number) => new Date(AHORA.getTime() + ms).toISOString();

function cand(id: string, user: string, inactivoMs: number, evento: string | null = null): Candidato {
  return { invitationId: id, userId: user, titulo: `Titulo ${id}`, actualizadoEn: hace(inactivoMs), fechaEvento: evento };
}

/** Almacén en memoria que respeta lo que importa del real: el reclamo es único. */
function almacenFalso(candidatos: Candidato[], o: { correos?: Record<string, string | null>; previos?: [string, TipoRecordatorio][]; recientes?: string[]; reclamoForzado?: ResultadoDeReclamo; soltarFalla?: boolean } = {}) {
  const log = new Set<string>((o.previos ?? []).map(([i, k]) => `${i}:${k}`));
  const correos = o.correos ?? {};
  const a: Almacen & { log: Set<string>; consultasDeCandidatos: number } = {
    log,
    consultasDeCandidatos: 0,
    async candidatos() {
      a.consultasDeCandidatos += 1;
      return candidatos;
    },
    async yaEnviados(ids) {
      const m = new Map<string, Set<TipoRecordatorio>>();
      for (const k of log) {
        const [inv, tipo] = k.split(":");
        if (!ids.includes(inv)) continue;
        if (!m.has(inv)) m.set(inv, new Set());
        m.get(inv)!.add(tipo as TipoRecordatorio);
      }
      return m;
    },
    async conCorreoReciente() {
      return new Set(o.recientes ?? []);
    },
    async reclamar(c, tipo) {
      if (o.reclamoForzado) return o.reclamoForzado;
      const k = `${c.invitationId}:${tipo}`;
      if (log.has(k)) return "ya_existia";
      log.add(k);
      return "reclamado";
    },
    async soltar(inv, tipo) {
      if (o.soltarFalla) return false;
      return log.delete(`${inv}:${tipo}`);
    },
    async correoDe(u) {
      return u in correos ? correos[u] : `${u}@ejemplo.test`;
    },
  };
  return a;
}

function enviadorQueGuarda(r: { ok: true } | { ok: false; error: string } = { ok: true }) {
  const enviados: Correo[] = [];
  const enviar: Enviar = async (c) => {
    enviados.push(c);
    return r;
  };
  return { enviar, enviados };
}

const base = { ahora: AHORA, origen: "https://sobrely.test", secreto: SECRETO, de: "Sobrely <hola@sobrely.test>", seco: false, limite: 50 };

describe("envío básico", () => {
  it("manda un correo a un borrador en ventana, con baja firmada y cabeceras RFC 8058", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)]);
    const { enviar, enviados } = enviadorQueGuarda();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar });

    expect(r).toMatchObject({ candidatos: 1, elegibles: 1, enviados: 1, fallos: 0 });
    expect(enviados).toHaveLength(1);
    const c = enviados[0];
    expect(c.para).toBe("u1@ejemplo.test");
    expect(c.llaveIdempotencia).toBe("i1:borrador_24h");
    expect(c.texto).toContain("https://sobrely.test/editor/i1");
    expect(c.cabeceras?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    // El token del enlace verifica para ESA persona y no para otra.
    const m = /baja\?u=([^&>]+)&t=([^&>\s]+)/.exec(c.cabeceras!["List-Unsubscribe"])!;
    expect(verificarBaja(decodeURIComponent(m[1]), m[2], SECRETO)).toBe(true);
    expect(verificarBaja("otro-usuario", m[2], SECRETO)).toBe(false);
    expect(c.cabeceras!["List-Unsubscribe"]).toContain("/api/recordatorios/baja");
    expect(c.texto).toContain("/recordatorios/baja?u=");
  });

  it("sin candidatos no consulta nada más ni envía", async () => {
    const a = almacenFalso([]);
    const { enviar, enviados } = enviadorQueGuarda();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(r.enviados).toBe(0);
    expect(enviados).toHaveLength(0);
  });

  it("un borrador fuera de ventana no recibe nada", async () => {
    const a = almacenFalso([cand("i1", "u1", 2 * H), cand("i2", "u2", 30 * D)]);
    const { enviar, enviados } = enviadorQueGuarda();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(r.elegibles).toBe(0);
    expect(enviados).toHaveLength(0);
  });
});

describe("idempotencia: ninguna combinación duplica un correo", () => {
  it("dos corridas seguidas: la segunda no envía", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)]);
    const { enviar, enviados } = enviadorQueGuarda();
    await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    const r2 = await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados).toHaveLength(1);
    expect(r2.enviados).toBe(0);
  });

  it("dos corridas SOLAPADAS (misma foto de candidatos): solo una envía", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)]);
    const { enviar, enviados } = enviadorQueGuarda();
    const [r1, r2] = await Promise.all([
      ejecutarRecordatorios({ ...base, almacen: a, enviar }),
      ejecutarRecordatorios({ ...base, almacen: a, enviar }),
    ]);
    expect(enviados).toHaveLength(1);
    expect(r1.enviados + r2.enviados).toBe(1);
    expect(r1.yaReclamados + r2.yaReclamados).toBe(1);
  });

  it("si el reclamo da «ya existía», NO se envía", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)], { reclamoForzado: "ya_existia" });
    const { enviar, enviados } = enviadorQueGuarda();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados).toHaveLength(0);
    expect(r.yaReclamados).toBe(1);
  });

  it("si el reclamo ERRORA, NO se envía a ciegas", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)], { reclamoForzado: "error" });
    const { enviar, enviados } = enviadorQueGuarda();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados).toHaveLength(0);
    expect(r.fallos).toBe(1);
  });

  it("lo ya enviado antes no se vuelve a enviar", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)], { previos: [["i1", "borrador_24h"]] });
    const { enviar, enviados } = enviadorQueGuarda();
    await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados).toHaveLength(0);
  });
});

describe("si el envío falla, el recordatorio no se pierde", () => {
  it("falla el envío → se SUELTA el reclamo y la siguiente corrida reintenta", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)]);
    const malo = enviadorQueGuarda({ ok: false, error: "Resend respondió 500" });
    const r1 = await ejecutarRecordatorios({ ...base, almacen: a, enviar: malo.enviar });
    expect(r1).toMatchObject({ enviados: 0, fallos: 1, sinSoltar: 0 });
    expect(a.log.size).toBe(0);

    const bueno = enviadorQueGuarda();
    const r2 = await ejecutarRecordatorios({ ...base, almacen: a, enviar: bueno.enviar });
    expect(r2.enviados).toBe(1);
  });

  it("si además no se puede soltar, se REPORTA (no queda mudo)", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)], { soltarFalla: true });
    const malo = enviadorQueGuarda({ ok: false, error: "x" });
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar: malo.enviar });
    expect(r.sinSoltar).toBe(1);
  });

  it("persona sin correo resoluble: no se envía, se suelta y se cuenta", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)], { correos: { u1: null } });
    const { enviar, enviados } = enviadorQueGuarda();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados).toHaveLength(0);
    expect(r.sinCorreo).toBe(1);
    expect(a.log.size).toBe(0);
  });

  it("un fallo con una persona no impide enviar a las demás", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H), cand("i2", "u2", 30 * H)]);
    const enviados: Correo[] = [];
    const enviar: Enviar = async (c) => {
      if (c.para.startsWith("u1")) return { ok: false, error: "x" };
      enviados.push(c);
      return { ok: true };
    };
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(r).toMatchObject({ enviados: 1, fallos: 1 });
    expect(enviados[0].para).toBe("u2@ejemplo.test");
  });
});

describe("tope por persona y por día", () => {
  it("quien ya recibió un correo en las últimas 24 h no recibe otro", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)], { recientes: ["u1"] });
    const { enviar, enviados } = enviadorQueGuarda();
    await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados).toHaveLength(0);
  });

  it("una persona con varios borradores recibe UN solo correo por corrida", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H), cand("i2", "u1", 40 * H), cand("i3", "u1", 50 * H)]);
    const { enviar, enviados } = enviadorQueGuarda();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados).toHaveLength(1);
    expect(r.elegibles).toBe(1);
  });

  it("a igual prioridad gana el borrador más reciente", async () => {
    const a = almacenFalso([cand("viejo", "u1", 50 * H), cand("nuevo", "u1", 26 * H)]);
    const { enviar, enviados } = enviadorQueGuarda();
    await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados[0].llaveIdempotencia).toBe("nuevo:borrador_24h");
  });

  it("el evento cercano gana sobre un borrador por inactividad", async () => {
    const a = almacenFalso([cand("i-inactivo", "u1", 30 * H), cand("i-evento", "u1", 1 * H, dentroDe(3 * D))]);
    const { enviar, enviados } = enviadorQueGuarda();
    await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados).toHaveLength(1);
    expect(enviados[0].llaveIdempotencia).toBe("i-evento:evento_7d");
    expect(enviados[0].asunto).toContain("3 días");
  });

  it("3 días gana sobre 24 h", async () => {
    const a = almacenFalso([cand("a", "u1", 30 * H), cand("b", "u1", 80 * H)]);
    const { enviar, enviados } = enviadorQueGuarda();
    await ejecutarRecordatorios({ ...base, almacen: a, enviar });
    expect(enviados[0].llaveIdempotencia).toBe("b:borrador_3d");
  });
});

describe("límite por corrida", () => {
  it("nunca envía más que `limite`, aunque haya más elegibles", async () => {
    const cs = Array.from({ length: 10 }, (_, i) => cand(`i${i}`, `u${i}`, 30 * H));
    const a = almacenFalso(cs);
    const { enviar, enviados } = enviadorQueGuarda();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar, limite: 3 });
    expect(enviados).toHaveLength(3);
    expect(r.enviados).toBe(3);
    expect(r.elegibles).toBe(3);
  });
});

describe("corrida en seco", () => {
  it("cuenta a quién se le escribiría y NO reclama ni envía nada", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H), cand("i2", "u2", 30 * H)]);
    const enviar = vi.fn<Enviar>();
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar, seco: true });
    expect(r).toMatchObject({ seco: true, habriaEnviado: 2, enviados: 0 });
    expect(enviar).not.toHaveBeenCalled();
    expect(a.log.size).toBe(0);
  });

  it("sin enviador (null) tampoco envía aunque `seco` fuera falso por error", async () => {
    const a = almacenFalso([cand("i1", "u1", 30 * H)]);
    const r = await ejecutarRecordatorios({ ...base, almacen: a, enviar: null });
    expect(r.enviados).toBe(0);
    expect(a.log.size).toBe(0);
  });
});
