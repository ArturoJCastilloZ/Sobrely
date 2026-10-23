import { timingSafeEqual } from "node:crypto";
import { applyMercadoPagoPayment } from "@/lib/billing/fulfillment";
import { reconciliarPagos } from "@/lib/billing/reconciliar";
import {
  crearAlmacenDeOrdenes,
  crearBuscadorDePagosMp,
} from "@/lib/billing/reconciliar-adaptadores";

/**
 * Cron diario de reconciliación de pagos (Vercel Cron llama con GET y
 * `Authorization: Bearer $CRON_SECRET`). Red de seguridad del webhook: ver
 * `src/lib/billing/reconciliar.ts` para el porqué.
 *
 * Las mismas puertas que el cron de recordatorios, en el mismo orden:
 *   1. Sin `CRON_SECRET` → 503. Una ruta que MUEVE DINERO no puede quedar abierta
 *      por un despliegue al que le faltó una variable.
 *   2. Credencial incorrecta → 401, comparada en tiempo constante.
 *   3. `RECONCILE_ENABLED` distinto de "1" → 200 «desactivado». Es el estado de
 *      fábrica: desplegar esto no activa nada por sí solo.
 *   4. Corre. Un error devuelve 500 SIN detalle: el mensaje de una base o de
 *      Mercado Pago puede traer fragmentos de datos del cliente.
 *
 * La respuesta lleva solo conteos y los ids de las órdenes aplicadas (UUID, sin
 * datos personales).
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
  if (process.env.RECONCILE_ENABLED !== "1") {
    return Response.json({ desactivado: true });
  }

  try {
    const resumen = await reconciliarPagos({
      almacen: crearAlmacenDeOrdenes(),
      buscarPagos: crearBuscadorDePagosMp(),
      aplicar: (p) => applyMercadoPagoPayment(p),
      ahora: new Date(),
    });
    return Response.json(resumen);
  } catch {
    return Response.json({ error: "falló la corrida" }, { status: 500 });
  }
}
