import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { JsonLd } from "@/components/seo/json-ld";
import { LocalLine } from "@/components/seo/local-line";
import type { EventLanding } from "@/lib/seo/event-landings";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const STEPS: { title: string; body: string }[] = [
  {
    title: "Elige un diseño",
    body: "Empieza desde una plantilla y personalízala a tu gusto.",
  },
  {
    title: "Personaliza y publica",
    body: "Ajusta módulos, colores y fotos, y publica con un enlace.",
  },
  {
    title: "Comparte y confirma",
    body: "Envía el enlace por WhatsApp y recibe las confirmaciones.",
  },
];

export function EventLandingPage({ data }: { data: EventLanding }) {
  const url = `${SITE_URL}/${data.slug}`;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: data.eyebrow, item: url },
    ],
  };

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={[faqLd, breadcrumbLd]} />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Sobrely — inicio">
          <LogoLockup />
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            render={<Link href="/pricing" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Precios
          </Button>
          <Button render={<Link href="/register" />} nativeButton={false} size="sm">
            Crear cuenta
          </Button>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-20">
        <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-xs font-medium text-brand-gold-deep dark:text-brand-gold">
          {data.eyebrow}
        </span>
        <h1 className="font-display text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          {data.h1}
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">{data.intro}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            render={<Link href="/register" />}
            nativeButton={false}
            size="lg"
            className="bg-brand-gold text-brand-ink hover:bg-brand-gold-deep hover:text-white"
          >
            Empieza gratis
          </Button>
          <Button
            render={<Link href="/pricing" />}
            nativeButton={false}
            size="lg"
            variant="outline"
          >
            Ver precios
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 sm:grid-cols-3">
        {data.benefits.map((b) => (
          <div key={b.title} className="rounded-xl border border-border p-5">
            <h2 className="font-semibold">{b.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Cómo funciona
        </h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand-gold text-sm font-bold text-brand-ink">
                {i + 1}
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-12">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Preguntas frecuentes
        </h2>
        <dl className="mt-8 space-y-6">
          {data.faqs.map((f) => (
            <div key={f.q} className="border-b border-border pb-6">
              <dt className="font-semibold text-foreground">{f.q}</dt>
              <dd className="mt-2 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Crea tu invitación de {data.eventName} hoy
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Empieza gratis y publica cuando estés listo. Sin suscripción.
        </p>
        <div className="mt-6">
          <Button
            render={<Link href="/register" />}
            nativeButton={false}
            size="lg"
            className="bg-brand-gold text-brand-ink hover:bg-brand-gold-deep hover:text-white"
          >
            Empieza gratis
          </Button>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/pricing" className="hover:text-foreground">
            Precios
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Aviso de Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos y Condiciones
          </Link>
        </div>
        <LocalLine className="mt-2" />
        <p className="mt-1">© {new Date().getFullYear()} Sobrely</p>
      </footer>
    </main>
  );
}
