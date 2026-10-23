import { timingSafeEqual } from "node:crypto";
import { leerConfiguracion } from "@/lib/recordatorios/config";
import { ejecutarRecordatorios } from "@/lib/recordatorios/ejecutar";
import { crearAlmacenSupabase } from "@/lib/recordatorios/almacen";
import { crearEnviadorResend } from "@/lib/recordatorios/resend";

/**
 * Cron diario de recordatorios (Vercel Cron llama con GET y
 * `Authorization: Bearer $CRON_SECRET`).
 *
 * Orden de las puertas, y cada una responde distinto a propósito:
 *   1. Sin `CRON_SECRET` configurado → 503. Una ruta que dispara correos NO puede
 *      quedar abierta por un despliegue al que le faltó una variable.
 *   2. Credencial incorrecta → 401, comparada en tiempo constante.
 *   3. `REMINDERS_ENABLED` distinto de "1" → 200 «desactivado». Es el estado de
 *      fábrica: desplegar esto no envía nada.
 *   4. Encendido pero con configuración incompleta → 500 con los NOMBRES de lo
 *      que falta (nunca valores), para que un cron que no envía no pase por sano.
 *
 * La respuesta lleva solo conteos: ni direcciones, ni títulos, ni ids.
 */
export const dynamic = "force-dynamic";

const LIMITE_POR_CORRIDA = 50;

function credencialValida(recibida: string | null, esperada: string): boolean {
  if (!recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(`Bearer ${esperada}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "cron no configurado" }, { status: 503 });
  }
  if (!credencialValida(request.headers.get("authorization"), cronSecret)) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  const config = leerConfiguracion(process.env);
  if (config.estado === "apagado") {
    return Response.json({ desactivado: true });
  }
  if (config.estado === "invalido") {
    return Response.json({ error: "configuración incompleta", falta: config.falta }, { status: 500 });
  }

  try {
    const resumen = await ejecutarRecordatorios({
      almacen: crearAlmacenSupabase(),
      enviar: config.seco
        ? null
        : crearEnviadorResend({ apiKey: config.apiKey, apiUrl: config.apiUrl }),
      ahora: new Date(),
      origen: config.origen,
      secreto: config.secreto,
      de: config.de,
      seco: config.seco,
      limite: LIMITE_POR_CORRIDA,
    });
    return Response.json(resumen);
  } catch {
    // Sin detalle: el mensaje de un error de base puede traer fragmentos de datos.
    return Response.json({ error: "falló la corrida" }, { status: 500 });
  }
}
