import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { createClient } from "@/lib/supabase/server";
import {
  formatPrice,
  getEffectivePrice,
  getPlan,
  type PlanCode,
} from "@/lib/billing";

/**
 * Punto de compra de un plan por evento: el usuario elige a qué invitación
 * aplicarlo y arranca el checkout de Mercado Pago. Se llega desde `/pricing`
 * (usuarios con sesión) o desde un CTA de mejora.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planParam } = await searchParams;
  const plan = planParam ? getPlan(planParam as PlanCode) : undefined;

  if (!plan || plan.billingType !== "per_event" || !plan.isActive) {
    redirect("/pricing");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=/billing/checkout?plan=${plan.code}`);
  }

  const { data: invitations } = await supabase
    .from("invitations")
    .select("id, title, is_published, status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const list = invitations ?? [];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Plan {plan.name} —{" "}
          {formatPrice(getEffectivePrice(plan), plan.currency)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pago único por evento. Elige la invitación a la que aplicar el plan.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Primero crea una invitación</CardTitle>
            <CardDescription>
              Necesitas una invitación para aplicarle el plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/dashboard" />} nativeButton={false}>
              Ir al dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((inv) => (
            <li key={inv.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {inv.title || "Sin título"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.is_published ? "Publicada" : "Borrador"}
                    </p>
                  </div>
                  <CheckoutButton planCode={plan.code} invitationId={inv.id}>
                    Pagar
                  </CheckoutButton>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Button
        render={<Link href="/pricing" />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="self-start"
      >
        ← Ver todos los planes
      </Button>
    </main>
  );
}
