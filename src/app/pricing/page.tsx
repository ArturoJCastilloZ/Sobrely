import type { Metadata } from "next";
import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo-lockup";

import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/billing/plan-card";
import { ComparisonTable } from "@/components/billing/comparison-table";
import { createClient } from "@/lib/supabase/server";
import {
  getActivePlans,
  isLaunchCampaignActive,
  getEffectivePrice,
} from "@/lib/billing";
import { JsonLd } from "@/components/seo/json-ld";
import { LocalLine } from "@/components/seo/local-line";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  // El layout raíz aplica el template "%s · Sobrely"; aquí solo el nombre.
  title: "Planes y precios",
  description:
    "Crea gratis y paga solo cuando quieras publicar. Planes por evento en pesos mexicanos, sin cobros recurrentes.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Planes y precios · Sobrely",
    description:
      "Crea gratis y paga solo cuando quieras publicar. Planes por evento en pesos mexicanos, sin cobros recurrentes.",
  },
};

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans = getActivePlans();
  const launch = isLaunchCampaignActive();

  // Datos estructurados: es una app web (SaaS), no un producto físico → usamos
  // SoftwareApplication para no arrastrar requisitos de tienda (envío/devolución).
  // Los precios van como AggregateOffer (rango) + una oferta por plan.
  const prices = plans.map((p) => getEffectivePrice(p));
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sobrely",
    description:
      "Invitaciones digitales para bodas, XV años, cumpleaños y eventos, con pago único por evento.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    image: `${SITE_URL}/sobrely-logo-horizontal.png`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: plans[0]?.currency ?? "MXN",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: plans.length,
      offers: plans.map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: getEffectivePrice(p),
        priceCurrency: p.currency,
        url: `${SITE_URL}/pricing`,
        availability: "https://schema.org/InStock",
        category: p.billingType === "free" ? "free" : "per-event",
      })),
    },
  };

  // CTA por plan: Free → crear cuenta / dashboard; planes de pago → checkout
  // (o registro si no hay sesión).
  function hrefFor(planCode: string, isFree: boolean): string {
    if (isFree) return user ? "/dashboard" : "/register";
    if (!user) return `/register?redirectTo=/billing/checkout?plan=${planCode}`;
    return `/billing/checkout?plan=${planCode}`;
  }

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={appLd} />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Sobrely — inicio">
          <LogoLockup />
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <Button render={<Link href="/dashboard" />} nativeButton={false} size="sm">
              Ir al dashboard
            </Button>
          ) : (
            <>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
              >
                Iniciar sesión
              </Button>
              <Button render={<Link href="/register" />} nativeButton={false} size="sm">
                Crear cuenta
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 pt-10 pb-6 text-center">
        <h1 className="font-display text-balance text-3xl font-bold tracking-tight sm:text-5xl">
          Crea gratis y paga solo cuando quieras publicar
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          Elige un plan por evento, sin suscripciones ni cobros recurrentes.
          Precios en pesos mexicanos (MXN).
        </p>
        {launch && (
          <span className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Precios de lanzamiento por tiempo limitado
          </span>
        )}
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            ctaHref={hrefFor(plan.code, plan.billingType === "free")}
            ctaLabel={plan.billingType === "free" ? "Empieza gratis" : "Elegir plan"}
          />
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="mb-4 text-xl font-bold tracking-tight">
          Compara los planes
        </h2>
        <ComparisonTable plans={plans} />
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-16">
        <h2 className="mb-4 text-xl font-bold tracking-tight">
          Lo que debes saber
        </h2>
        <dl className="flex flex-col gap-4 text-sm">
          <div>
            <dt className="font-medium">Pago único por evento</dt>
            <dd className="text-muted-foreground">
              Cada plan de pago es un cobro único por evento. No hay
              suscripciones ni cargos automáticos recurrentes.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Vigencia</dt>
            <dd className="text-muted-foreground">
              Tu invitación permanece publicada hasta la fecha de tu evento más
              un margen según el plan (7, 30 o 90 días). Si publicas en el plan
              Free, es una demo que expira a los 14 días. Al expirar, la
              invitación deja de estar publicada; tu contenido no se borra y
              puedes renovarla.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Impuestos</dt>
            <dd className="text-muted-foreground">
              Los precios mostrados están en MXN. Los impuestos aplicables se
              indican en el checkout antes de pagar.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Reembolsos</dt>
            <dd className="text-muted-foreground">
              La política de reembolsos se detalla durante el checkout. Los
              servicios adicionales con intervención del equipo tienen
              condiciones propias.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Actualiza cuando quieras</dt>
            <dd className="text-muted-foreground">
              Puedes mejorar tu plan o renovar una invitación después de
              publicarla.
            </dd>
          </div>
        </dl>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
        <LocalLine />
        <p className="mt-1">
          © {new Date().getFullYear()} Sobrely · Sin apps para tus invitados
        </p>
      </footer>
    </main>
  );
}
