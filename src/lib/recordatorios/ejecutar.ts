import { armarCorreo } from "@/lib/recordatorios/contenido";
import { firmarBaja } from "@/lib/recordatorios/baja-token";
import type { Enviar } from "@/lib/recordatorios/resend";
import {
  diasParaElEvento,
  PRIORIDAD,
  tipoDeRecordatorio,
  type TipoRecordatorio,
} from "@/lib/recordatorios/ventanas";

/**
 * Una corrida de recordatorios. Aquí vive la POLÍTICA (a quién, cuánto, qué
 * pasa si algo falla); el acceso a la base está detrás de `Almacen` para poder
 * probar cada decisión sin base de datos.
 *
 * Tres garantías, cada una con su prueba:
 *   - A lo sumo UN correo por persona por corrida y por día.
 *   - A lo sumo UNA vez cada (invitación, tipo), aunque dos corridas se
 *     solapen: se RECLAMA la fila antes de enviar y la segunda choca.
 *   - Si el envío falla se SUELTA el reclamo, para que el siguiente día reintente
 *     en vez de perder el recordatorio para siempre. Se prefiere «a lo sumo una
 *     vez» sobre «al menos una»: si el proceso muere entre reclamar y enviar, ese
 *     correo se pierde, pero nunca se duplica.
 */
export type Candidato = {
  invitationId: string;
  userId: string;
  titulo: string;
  actualizadoEn: string;
  fechaEvento: string | null;
};

export type ResultadoDeReclamo = "reclamado" | "ya_existia" | "error";

export interface Almacen {
  /** Borradores SIN publicar de personas que aceptaron recordatorios. */
  candidatos(ahora: Date, limite: number): Promise<Candidato[]>;
  /** Tipos ya reclamados por invitación. */
  yaEnviados(invitationIds: string[]): Promise<Map<string, Set<TipoRecordatorio>>>;
  /** Personas a las que ya se les escribió en las últimas 24 h. */
  conCorreoReciente(userIds: string[], ahora: Date): Promise<Set<string>>;
  reclamar(c: Candidato, tipo: TipoRecordatorio): Promise<ResultadoDeReclamo>;
  /** Devuelve `true` si de verdad retiró el reclamo. */
  soltar(invitationId: string, tipo: TipoRecordatorio): Promise<boolean>;
  correoDe(userId: string): Promise<string | null>;
}

export type Resumen = {
  candidatos: number;
  /** Personas a las que les toca algo (ya con el tope de uno por persona). */
  elegibles: number;
  enviados: number;
  /** Corrida en seco: cuántos SE HABRÍAN enviado. */
  habriaEnviado: number;
  yaReclamados: number;
  sinCorreo: number;
  fallos: number;
  sinSoltar: number;
  seco: boolean;
};

export async function ejecutarRecordatorios(o: {
  almacen: Almacen;
  enviar: Enviar | null;
  ahora: Date;
  origen: string;
  secreto: string;
  de: string;
  seco: boolean;
  /** Tope de correos por corrida: un error de lógica no puede mandar miles. */
  limite: number;
}): Promise<Resumen> {
  const resumen: Resumen = {
    candidatos: 0,
    elegibles: 0,
    enviados: 0,
    habriaEnviado: 0,
    yaReclamados: 0,
    sinCorreo: 0,
    fallos: 0,
    sinSoltar: 0,
    seco: o.seco,
  };

  const candidatos = await o.almacen.candidatos(o.ahora, 500);
  resumen.candidatos = candidatos.length;
  if (candidatos.length === 0) return resumen;

  const previos = await o.almacen.yaEnviados(candidatos.map((c) => c.invitationId));
  const recientes = await o.almacen.conCorreoReciente(
    [...new Set(candidatos.map((c) => c.userId))],
    o.ahora,
  );

  // Por persona: el candidato de MAYOR prioridad; a igualdad, el más reciente.
  const mejorPorPersona = new Map<string, { c: Candidato; tipo: TipoRecordatorio }>();
  for (const c of candidatos) {
    if (recientes.has(c.userId)) continue;
    const tipo = tipoDeRecordatorio({
      ahora: o.ahora,
      actualizadoEn: c.actualizadoEn,
      fechaEvento: c.fechaEvento,
      yaEnviados: previos.get(c.invitationId) ?? new Set(),
    });
    if (!tipo) continue;
    const actual = mejorPorPersona.get(c.userId);
    const gana =
      !actual ||
      PRIORIDAD.indexOf(tipo) < PRIORIDAD.indexOf(actual.tipo) ||
      (tipo === actual.tipo &&
        new Date(c.actualizadoEn).getTime() > new Date(actual.c.actualizadoEn).getTime());
    if (gana) mejorPorPersona.set(c.userId, { c, tipo });
  }

  const elegidos = [...mejorPorPersona.values()].slice(0, o.limite);
  resumen.elegibles = elegidos.length;

  for (const { c, tipo } of elegidos) {
    if (o.seco || !o.enviar) {
      resumen.habriaEnviado += 1;
      continue;
    }

    const reclamo = await o.almacen.reclamar(c, tipo);
    if (reclamo === "ya_existia") {
      resumen.yaReclamados += 1;
      continue;
    }
    if (reclamo === "error") {
      resumen.fallos += 1;
      continue;
    }

    const soltarYContar = async (campo: "sinCorreo" | "fallos") => {
      resumen[campo] += 1;
      if (!(await o.almacen.soltar(c.invitationId, tipo))) resumen.sinSoltar += 1;
    };

    const correo = await o.almacen.correoDe(c.userId);
    if (!correo) {
      await soltarYContar("sinCorreo");
      continue;
    }

    const consulta = `u=${encodeURIComponent(c.userId)}&t=${firmarBaja(c.userId, o.secreto)}`;
    // El cuerpo del correo manda a la página (pide confirmación); la cabecera de
    // un clic apunta a la API, que es la que acepta el POST de RFC 8058.
    const bajaUrl = `${o.origen}/recordatorios/baja?${consulta}`;
    const bajaUnClic = `${o.origen}/api/recordatorios/baja?${consulta}`;
    const armado = armarCorreo({
      tipo,
      titulo: c.titulo,
      diasParaEvento: diasParaElEvento(c.fechaEvento, o.ahora),
      editorUrl: `${o.origen}/editor/${c.invitationId}`,
      bajaUrl,
    });

    const r = await o.enviar({
      para: correo,
      de: o.de,
      asunto: armado.asunto,
      html: armado.html,
      texto: armado.texto,
      llaveIdempotencia: `${c.invitationId}:${tipo}`,
      cabeceras: {
        "List-Unsubscribe": `<${bajaUnClic}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (r.ok) resumen.enviados += 1;
    else await soltarYContar("fallos");
  }

  return resumen;
}
