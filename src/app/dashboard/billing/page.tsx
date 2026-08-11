import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, getActiveServices } from "@/lib/billing";
import { ServiceRequestSection } from "@/components/billing/service-request-section";

/** Etiqueta y variante visual de un estado de orden. */
const ORDER_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  paid: { label: "Pagado", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
  failed: { label: "Fallido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
  refunded: { label: "Reembolsado", variant: "outline" },
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type PlanRel = { name?: string; code?: string } | { name?: string; code?: string }[] | null;
type InvRel =
  | { title?: string; slug?: string }
  | { title?: string; slug?: string }[]
  | null;

function one<T>(rel: T | T[] | null): T | undefined {
  return Array.isArray(rel) ? rel[0] : (rel ?? undefined);
}

export default async function BillingPage() {
  const supabase = await createClient();

  const [{ data: orders }, { data: entitlements }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, amount, currency, status, product_type, created_at, plan:plans(name), invitation:invitations(title)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("invitation_entitlements")
      .select(
        "status, expires_at, plan:plans(name), invitation:invitations(title, slug)",
      )
      .eq("status", "active"),
  ]);

  const orderList = orders ?? [];
  const activePlans = (entitlements ?? []).filter((e) => {
    const exp = e.expires_at ? new Date(e.expires_at as string) : null;
    return !exp || exp > new Date();
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
        <Button
          render={<Link href="/pricing" />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          Ver planes
        </Button>
      </div>

      {/* Planes activos por invitación */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Planes activos</h2>
        {activePlans.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sin planes activos</CardTitle>
              <CardDescription>
                Publica una invitación con un plan para verla aquí.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          activePlans.map((e, i) => {
            const plan = one<{ name?: string }>(e.plan as PlanRel);
            const inv = one<{ title?: string }>(e.invitation as InvRel);
            return (
              <Card key={i}>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {inv?.title || "Invitación"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plan {plan?.name ?? "—"} · vigente hasta{" "}
                      {fmtDate(e.expires_at as string | null)}
                    </p>
                  </div>
                  <Badge>Activo</Badge>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {/* Servicios adicionales (asistidos, flujo manual) */}
      <ServiceRequestSection
        services={getActiveServices().filter((s) => s.isManual)}
      />

      {/* Historial de compras */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historial de compras</h2>
        {orderList.length === 0 ? (
          <Card>
            <CardHeader>
              <CardDescription>Aún no tienes compras.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 font-medium">Fecha</th>
                  <th className="p-3 font-medium">Concepto</th>
                  <th className="p-3 font-medium">Monto</th>
                  <th className="p-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orderList.map((o) => {
                  const plan = one<{ name?: string }>(o.plan as PlanRel);
                  const inv = one<{ title?: string }>(o.invitation as InvRel);
                  const st = ORDER_STATUS[o.status as string] ?? {
                    label: o.status as string,
                    variant: "outline" as const,
                  };
                  return (
                    <tr key={o.id as string} className="border-b last:border-b-0">
                      <td className="p-3">{fmtDate(o.created_at as string)}</td>
                      <td className="p-3">
                        {plan?.name ? `Plan ${plan.name}` : o.product_type}
                        {inv?.title ? ` · ${inv.title}` : ""}
                      </td>
                      <td className="p-3">
                        {formatPrice(
                          Number(o.amount),
                          (o.currency as "MXN") ?? "MXN",
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
