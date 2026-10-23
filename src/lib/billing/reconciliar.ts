/**
 * Reconciliación de pagos: la red de seguridad del cobro. PURO (sin base de
 * datos ni red): recibe sus dependencias.
 *
 * Por qué existe. Aplicar un pago depende de que el webhook de Mercado Pago
 * llegue Y de que su firma valide. Probado en sandbox (2026-10-23): las
 * notificaciones de pagos reales recibieron 401 con el secreto del panel, y un
 * cliente que paga así se queda sin su invitación publicada, sin que nadie lo
 * sepa. Este job no depende de la notificación: toma las órdenes `pending` y le
 * pregunta a Mercado Pago, por `external_reference`, si tienen un pago aprobado.
 *
 * Qué NO hace, a propósito:
 *   - No decide nada por su cuenta: aplica con la MISMA función que el webhook
 *     (`applyMercadoPagoPayment`), que ya es idempotente y re-entrante. Si el
 *     webhook llega después, no duplica nada.
 *   - No confía en un pago solo porque trae el `external_reference`: exige estado
 *     `approved`, monto y moneda IGUALES a los de la orden. Un monto distinto o
 *     ausente no se aplica y se reporta (`montoNoCoincide`); es una alerta, no un
 *     detalle: significa que algo se cobró distinto de lo que se vendió.
 *   - No toca órdenes recientes: el webhook normal tiene `MARGEN_MS` para llegar
 *     antes de que este job se meta.
 *   - No mira órdenes de hace más de `VENTANA_MS`: una orden `pending` de hace
 *     meses es un checkout abandonado, no un pago perdido.
 */
import { montoYMonedaCoinciden } from "@/lib/billing/monto-pago";

export const MARGEN_MS = 10 * 60 * 1000;
export const VENTANA_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_ORDENES_POR_CORRIDA = 50;
const MAX_IDS_EN_RESUMEN = 20;

export type OrdenPendiente = {
  id: string;
  amount: number;
  currency: string;
};

export type PagoMp = {
  id: string;
  status: string;
  externalReference: string | null;
  amount: number | null;
  currency: string | null;
};

export interface AlmacenDeOrdenes {
  /** Órdenes `pending` de Mercado Pago creadas entre `desde` y `hasta`, más viejas primero. */
  ordenesPendientes(desde: Date, hasta: Date, limite: number): Promise<OrdenPendiente[]>;
}

export type BuscarPagos = (externalReference: string) => Promise<PagoMp[]>;

export type AplicarPago = (p: {
  orderId: string;
  paymentId: string;
  mpStatus: string;
  /** Lo que Mercado Pago dice que se cobró: `applyMercadoPagoPayment` lo vuelve a comparar. */
  pago: { amount: number | null; currency: string | null };
}) => Promise<{ ok: boolean; reason?: string }>;

export type ResumenDeReconciliacion = {
  revisadas: number;
  /** Pagos aprobados que SÍ se aplicaron en esta corrida. */
  aplicadas: number;
  sinPagoAprobado: number;
  /** Aprobado, pero con monto/moneda distintos o ausentes: NO se aplicó. */
  montoNoCoincide: number;
  /** Fallos al consultar a Mercado Pago o al aplicar. */
  errores: number;
  /** Ids de las órdenes aplicadas (acotado), para trazabilidad. */
  ordenesAplicadas: string[];
};

export async function reconciliarPagos(o: {
  almacen: AlmacenDeOrdenes;
  buscarPagos: BuscarPagos;
  aplicar: AplicarPago;
  ahora: Date;
  limite?: number;
}): Promise<ResumenDeReconciliacion> {
  const resumen: ResumenDeReconciliacion = {
    revisadas: 0,
    aplicadas: 0,
    sinPagoAprobado: 0,
    montoNoCoincide: 0,
    errores: 0,
    ordenesAplicadas: [],
  };

  const hasta = new Date(o.ahora.getTime() - MARGEN_MS);
  const desde = new Date(o.ahora.getTime() - VENTANA_MS);
  const ordenes = await o.almacen.ordenesPendientes(
    desde,
    hasta,
    Math.min(o.limite ?? MAX_ORDENES_POR_CORRIDA, MAX_ORDENES_POR_CORRIDA),
  );

  for (const orden of ordenes) {
    resumen.revisadas += 1;

    let pagos: PagoMp[];
    try {
      pagos = await o.buscarPagos(orden.id);
    } catch {
      resumen.errores += 1;
      continue;
    }

    // Solo cuenta un pago que apunte a ESTA orden y esté aprobado.
    const aprobados = pagos.filter(
      (p) => p.status === "approved" && p.externalReference === orden.id,
    );
    if (aprobados.length === 0) {
      resumen.sinPagoAprobado += 1;
      continue;
    }

    // Si hubiera varios aprobados para la misma orden, se aplica el primero que
    // cuadre en monto y moneda; si ninguno cuadra, se reporta y no se aplica.
    const valido = aprobados.find((p) =>
      montoYMonedaCoinciden(
        { amount: p.amount, currency: p.currency },
        { amount: orden.amount, currency: orden.currency },
      ),
    );
    if (!valido) {
      resumen.montoNoCoincide += 1;
      continue;
    }

    try {
      const r = await o.aplicar({
        orderId: orden.id,
        paymentId: valido.id,
        mpStatus: valido.status,
        pago: { amount: valido.amount, currency: valido.currency },
      });
      if (r.ok) {
        resumen.aplicadas += 1;
        if (resumen.ordenesAplicadas.length < MAX_IDS_EN_RESUMEN) {
          resumen.ordenesAplicadas.push(orden.id);
        }
      } else {
        resumen.errores += 1;
      }
    } catch {
      resumen.errores += 1;
    }
  }

  return resumen;
}
