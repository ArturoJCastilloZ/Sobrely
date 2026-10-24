import { timingSafeEqual } from "node:crypto";
import { limpiarInvitados } from "@/lib/auth/limpiar-invitados";
import { crearDepsLimpieza } from "@/lib/auth/limpiar-invitados-adaptadores";

/**
 * Cron diario que borra invitados abandonados (ver `limpiar-invitados.ts`). Mismas
 * puertas que los otros crons, en el mismo orden:
 *   1. Sin `CRON_SECRET` → 503.
 *   2. Credencial incorrecta → 401 (tiempo constante).
 *   3. `CLEANUP_INVITADOS_ENABLED` distinto de "1" → 200 «desactivado» (estado de fábrica).
 *   4. Corre. `?dry=1` solo lista lo que borraría. Un error devuelve 500 SIN detalle.
 * La respuesta lleva conteos y UUID, sin datos personales.
 */
export const dynamic = "force-dynamic";

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
  if (process.env.CLEANUP_INVITADOS_ENABLED !== "1") {
    return Response.json({ desactivado: true });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  try {
    const resumen = await limpiarInvitados(crearDepsLimpieza(), {
      ahora: new Date(),
      dryRun,
    });
    return Response.json(resumen);
  } catch {
    return Response.json({ error: "falló la corrida" }, { status: 500 });
  }
}
