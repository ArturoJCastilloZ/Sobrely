import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { leerContenidoPublicable } from "@/lib/billing/entitlements";
import {
  planCubreContenido,
  planDePagoRequerido,
} from "@/lib/billing/plan-requerido";
import { enlaceConDestino } from "@/lib/auth/ruta-interna";
import { cn } from "@/lib/utils";

/**
 * Punto de compra de un plan por evento: la persona ve lo que cuesta publicar
 * SU invitación y arranca el checkout de Mercado Pago. Se llega desde
 * `/pricing`, desde un CTA de mejora o desde el botón «Publicar» del editor.
 *
 * Parámetros:
 *   - `plan`        el plan a comprar (obligatorio).
 *   - `invitation`  una invitación concreta: se muestra solo esa, ya elegida.
 *   - `publicar=1`  el cobro salió del botón «Publicar»: al pagarse, la
 *                   invitación se publica sola (`publishOnPaid`).
 *
 * Cada invitación muestra el plan que SÍ la cubre y su precio. Si el plan de la
 * URL no la cubre, no se ofrece cobrarlo (el servidor también lo rechaza en
 * `createPlanCheckout`): se ofrece el que hace falta.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; invitation?: string; publicar?: string }>;
}) {
  const { plan: planParam, invitation: invitationParam, publicar } =
    await searchParams;
  const plan = planParam ? getPlan(planParam as PlanCode) : undefined;

  if (!plan || plan.billingType !== "per_event" || !plan.isActive) {
    redirect("/pricing");
  }

  const publicarAlPagar = publicar === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Un invitado no puede pagar: se le manda a iniciar sesión (que traslada su borrador).
  if (!user || user.is_anonymous === true) {
    // Con `enlaceConDestino` y no a mano: la URL de vuelta lleva `&`, que sin
    // codificar cortaría el `redirectTo` y perdería la invitación elegida.
    const vuelta = new URLSearchParams({ plan: plan.code });
    if (invitationParam) vuelta.set("invitation", invitationParam);
    if (publicarAlPagar) vuelta.set("publicar", "1");
    redirect(enlaceConDestino("/login", "redirectTo", `/billing/checkout?${vuelta}`));
  }

  let consulta = supabase
    .from("invitations")
    .select("id, title, is_published, status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (invitationParam) consulta = consulta.eq("id", invitationParam);
  const { data: invitations } = await consulta;
  const list = invitations ?? [];

  // Para cada invitación: ¿este plan la cubre? y, si no, ¿cuál sí? Con el mismo
  // contenido y la misma regla que `setPublished` y que el cobro del servidor.
  const opciones = await Promise.all(
    list.map(async (inv) => {
      const contenido = await leerContenidoPublicable(supabase, inv.id);
      const cubre = planCubreContenido(plan, contenido);
      return { inv, cubre, necesario: cubre ? plan : planDePagoRequerido(contenido) };
    }),
  );

  const unaSola = Boolean(invitationParam) && list.length === 1;
  const precioDelPlan = formatPrice(getEffectivePrice(plan), plan.currency);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {unaSola
            ? `Publicar «${list[0].title || "Sin título"}»`
            : `Plan ${plan.name} — ${precioDelPlan}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {unaSola
            ? "Pago único por evento. Diseñar y editar sigue siendo gratis."
            : "Pago único por evento. Elige la invitación a la que aplicar el plan."}
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {invitationParam
                ? "No encontramos esa invitación"
                : "Primero crea una invitación"}
            </CardTitle>
            <CardDescription>
              {invitationParam
                ? "Puede que ya no exista o que sea de otra cuenta."
                : "Necesitas una invitación para aplicarle el plan."}
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
          {opciones.map(({ inv, cubre, necesario }) => {
            const precioNecesario = necesario
              ? formatPrice(getEffectivePrice(necesario), necesario.currency)
              : null;
            const volver = new URLSearchParams({
              plan: necesario?.code ?? plan.code,
              invitation: inv.id,
            });
            if (publicarAlPagar) volver.set("publicar", "1");

            return (
              <li key={inv.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {inv.title || "Sin título"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.is_published ? "Publicada" : "Borrador"}
                        </p>
                      </div>
                      {cubre && (
                        <CheckoutButton
                          planCode={plan.code}
                          invitationId={inv.id}
                          publishOnPaid={publicarAlPagar}
                          // 44 px en móvil: es la pantalla donde se paga.
                          className="h-11 shrink-0 lg:h-9"
                        >
                          {publicarAlPagar
                            ? `Pagar ${precioDelPlan} y publicar`
                            : `Pagar ${precioDelPlan}`}
                        </CheckoutButton>
                      )}
                    </div>

                    {cubre ? (
                      <p className="text-sm text-muted-foreground">
                        Plan {plan.name}, pago único por evento.
                        {publicarAlPagar && " Al pagar, tu invitación se publica sola."}
                      </p>
                    ) : necesario ? (
                      <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                        <p>
                          El plan {plan.name} no cubre lo que usa esta invitación.
                          Necesita el plan <strong>{necesario.name}</strong>{" "}
                          ({precioNecesario}, pago único).
                        </p>
                        <Link
                          href={`/billing/checkout?${volver}`}
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "h-11 self-start lg:h-9",
                          )}
                        >
                          Ver el plan {necesario.name}
                        </Link>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Esta invitación usa elementos que no están disponibles en
                        ningún plan activo.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
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
