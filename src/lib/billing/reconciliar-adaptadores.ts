import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { mpPayment } from "@/lib/billing/mercadopago";
import type {
  AlmacenDeOrdenes,
  BuscarPagos,
  OrdenPendiente,
  PagoMp,
} from "@/lib/billing/reconciliar";

/**
 * Los dos bordes de `reconciliarPagos` con el mundo: la base y Mercado Pago.
 * Este módulo SOLO LEE; escribir es trabajo de `applyMercadoPagoPayment`.
 */
export function crearAlmacenDeOrdenes(): AlmacenDeOrdenes {
  const db = createAdminClient();
  return {
    async ordenesPendientes(desde, hasta, limite): Promise<OrdenPendiente[]> {
      const { data, error } = await db
        .from("orders")
        .select("id, amount, currency")
        .eq("status", "pending")
        .eq("payment_provider", "mercadopago")
        .gt("created_at", desde.toISOString())
        .lt("created_at", hasta.toISOString())
        .order("created_at", { ascending: true })
        .limit(limite);
      if (error) throw new Error("No se pudieron leer las órdenes pendientes.");
      return (data ?? []).map((o) => ({
        id: o.id as string,
        amount: Number(o.amount),
        currency: String(o.currency ?? ""),
      }));
    },
  };
}

/** Pagos de Mercado Pago cuyo `external_reference` es el id de la orden. */
export function crearBuscadorDePagosMp(): BuscarPagos {
  const pagos = mpPayment();
  return async (externalReference): Promise<PagoMp[]> => {
    const r = await pagos.search({
      options: {
        external_reference: externalReference,
        sort: "date_created",
        criteria: "desc",
      },
    });
    return (r.results ?? []).map((p) => ({
      id: String(p.id ?? ""),
      status: String(p.status ?? ""),
      externalReference: p.external_reference ?? null,
      amount: typeof p.transaction_amount === "number" ? p.transaction_amount : null,
      currency: p.currency_id ?? null,
    }));
  };
}
