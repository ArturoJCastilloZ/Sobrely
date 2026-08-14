import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { createClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/seo/json-ld";
import { EVENT_LANDING_LIST } from "@/lib/seo/event-landings";

export const metadata: Metadata = {
  // Homepage: título absoluto (ignora el template "%s · Sobrely") con keywords.
  title: {
    absolute: "Invitaciones digitales para boda, XV años y más — Sobrely",
  },
  description:
    "Crea invitaciones digitales personalizables para bodas, XV años, cumpleaños, baby showers y eventos. Elige un diseño, personalízalo y comparte tu invitación con confirmación de asistencia y acceso por QR.",
  alternates: { canonical: "/" },
};

// Preguntas frecuentes: contenido visible + FAQPage JSON-LD (deben coincidir).
const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Qué es una invitación digital?",
    a: "Es una invitación que se comparte por un enlace en lugar de en papel. Tus invitados la abren en el celular, ven todos los detalles del evento (fecha, ubicación, itinerario) y confirman su asistencia en línea.",
  },
  {
    q: "¿Para qué eventos puedo usar Sobrely?",
    a: "Para bodas, XV años, cumpleaños, baby showers y eventos corporativos. Eliges un diseño según el tipo de evento y lo personalizas a tu gusto.",
  },
  {
    q: "¿Cuánto cuesta hacer una invitación digital?",
    a: "Puedes crearla gratis y solo pagas una vez, por evento, cuando decides publicarla. No hay cobros recurrentes ni suscripción. Consulta los planes en la página de precios.",
  },
  {
    q: "¿Mis invitados necesitan instalar una app?",
    a: "No. La invitación se abre en cualquier navegador con solo el enlace; tus invitados no descargan nada.",
  },
  {
    q: "¿Puedo saber quién confirmó su asistencia?",
    a: "Sí. Recibes las confirmaciones en tu panel y ves cuántas personas asistirán. Con la lista de invitados también puedes darle a cada invitado un pase con código QR para el control de acceso en la entrada.",
  },
];

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Sobrely — inicio">
          <LogoLockup />
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            render={<Link href="/blog" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Blog
          </Button>
          <Button
            render={<Link href="/pricing" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            Precios
          </Button>
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

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
        <span className="rounded-full border border-brand-gold/30 bg-brand-cream/50 px-3 py-1 text-xs font-medium text-brand-gold-deep">
          Invitaciones digitales, sin complicaciones
        </span>
        <h1 className="font-display text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Crea invitaciones digitales dinámicas y{" "}
          <span className="text-brand-gold-deep italic">personalizables</span>
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          <strong className="font-semibold text-foreground">Sobrely</strong> es
          la plataforma para crear invitaciones digitales para bodas, XV años,
          cumpleaños, baby showers y eventos corporativos: elige un template,
          personaliza módulos y publica tu invitación en una URL única para
          compartirla y recibir confirmaciones de tus invitados.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            render={<Link href={user ? "/dashboard" : "/register"} />}
            nativeButton={false}
            size="lg"
            className="bg-brand-gold text-brand-ink hover:bg-brand-gold-deep hover:text-white"
          >
            {user ? "Ir al dashboard" : "Empieza gratis"}
          </Button>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            size="lg"
            variant="outline"
          >
            Ya tengo cuenta
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Invitaciones para cada evento
        </h2>
        <ul className="mt-6 flex flex-wrap justify-center gap-3">
          {EVENT_LANDING_LIST.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/${e.slug}`}
                className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {e.eyebrow}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-16">
        <JsonLd data={FAQ_LD} />
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Preguntas frecuentes
        </h2>
        <dl className="mt-8 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-border pb-6">
              <dt className="font-semibold text-foreground">{f.q}</dt>
              <dd className="mt-2 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link href="/privacidad" className="hover:text-foreground">
            Aviso de Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos y Condiciones
          </Link>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} Sobrely</p>
      </footer>
    </main>
  );
}
