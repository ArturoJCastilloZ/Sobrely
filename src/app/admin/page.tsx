import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/billing";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBreakdown } from "@/components/admin/metric-table";
import {
  ServiceRequestsTable,
  type AdminServiceRequest,
} from "@/components/admin/service-requests-table";
import { AdminManager, type AdminEntry } from "@/components/admin/admin-manager";

/** Métricas devueltas por `get_admin_metrics()`. */
interface AdminMetrics {
  users_total: number;
  orders_by_status: Record<string, number>;
  revenue_paid: number;
  refunds_total: number;
  orders_paid_count: number;
  paying_users: number;
  conversion_rate: number;
  service_requests_by_status: Record<string, number>;
  referrals_by_status: Record<string, number>;
  referral_credit_granted: number;
}

const ORDER_LABELS: Record<string, string> = {
  paid: "Pagadas",
  pending: "Pendientes",
  failed: "Fallidas",
  cancelled: "Canceladas",
  refunded: "Reembolsadas",
};
const SERVICE_LABELS: Record<string, string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
};
const REFERRAL_LABELS: Record<string, string> = {
  pending: "Pendiente",
  qualified: "Calificado",
  credited: "Acreditado",
  cancelled: "Cancelado",
};

export default async function AdminPage() {
  const { userId } = await requireAdmin();
  const supabase = await createClient();

  // Todo detrás de funciones SECURITY DEFINER con gate admin interno.
  const [{ data: metricsRaw }, { data: adminsRaw }, { data: requestsRaw }] =
    await Promise.all([
      supabase.rpc("get_admin_metrics"),
      supabase.rpc("admin_list_admins"),
      supabase.rpc("admin_recent_service_requests", { p_limit: 50 }),
    ]);

  const m = (metricsRaw ?? {}) as Partial<AdminMetrics>;
  const admins = ((adminsRaw ?? []) as Array<{
    user_id: string;
    email: string | null;
    granted_at: string;
  }>).map<AdminEntry>((a) => ({
    userId: a.user_id,
    email: a.email,
    grantedAt: a.granted_at,
  }));
  const requests = ((requestsRaw ?? []) as Array<{
    id: string;
    service_code: string;
    service_name: string;
    status: string;
    email: string | null;
    contact_note: string | null;
    created_at: string;
  }>).map<AdminServiceRequest>((r) => ({
    id: r.id,
    serviceCode: r.service_code,
    serviceName: r.service_name,
    status: r.status,
    email: r.email,
    contactNote: r.contact_note,
    createdAt: r.created_at,
  }));

  const conversionPct = ((m.conversion_rate ?? 0) * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>

      {/* Métricas principales */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Usuarios" value={String(m.users_total ?? 0)} />
        <StatCard
          label="Ingresos"
          value={formatPrice(Number(m.revenue_paid ?? 0))}
          hint={`${m.orders_paid_count ?? 0} órdenes pagadas`}
        />
        <StatCard
          label="Conversión"
          value={`${conversionPct}%`}
          hint={`${m.paying_users ?? 0} usuarios pagando`}
        />
        <StatCard
          label="Reembolsos"
          value={formatPrice(Number(m.refunds_total ?? 0))}
        />
        <StatCard
          label="Crédito referidos"
          value={formatPrice(Number(m.referral_credit_granted ?? 0))}
          hint="otorgado"
        />
        <StatCard
          label="Órdenes pagadas"
          value={String(m.orders_paid_count ?? 0)}
        />
      </section>

      {/* Desgloses por estado */}
      <section className="grid gap-3 md:grid-cols-3">
        <StatusBreakdown
          title="Órdenes por estado"
          data={m.orders_by_status ?? {}}
          labels={ORDER_LABELS}
        />
        <StatusBreakdown
          title="Servicios por estado"
          data={m.service_requests_by_status ?? {}}
          labels={SERVICE_LABELS}
        />
        <StatusBreakdown
          title="Referidos por estado"
          data={m.referrals_by_status ?? {}}
          labels={REFERRAL_LABELS}
        />
      </section>

      {/* Solicitudes de servicio (con acciones de estado) */}
      <ServiceRequestsTable requests={requests} />

      {/* Gestión de administradores */}
      <AdminManager admins={admins} currentUserId={userId} />
    </div>
  );
}
