import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { LocalLine } from "@/components/seo/local-line";
import { JsonLd } from "@/components/seo/json-ld";
import { TemplateMarketplace } from "@/components/dashboard/template-marketplace";
import { createClient } from "@/lib/supabase/server";
import { cargarGaleriaPublica } from "@/lib/templates/galeria-publica";
import { COLECCIONES, coleccionDe, hrefColeccion } from "@/lib/templates/colecciones";
import { metadatosSociales } from "@/lib/seo/social";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/** Solo las cinco colecciones existen; cualquier otra ruta es 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return COLECCIONES.map((c) => ({ estilo: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ estilo: string }>;
}): Promise<Metadata> {
  const c = coleccionDe((await params).estilo);
  if (!c) return {};
  return {
    title: c.metaTitulo,
    description: c.metaDescripcion,
    alternates: { canonical: hrefColeccion(c.clave) },
    ...metadatosSociales({
      titulo: `${c.metaTitulo} · Sobrely`,
      descripcion: c.metaDescripcion,
      ruta: hrefColeccion(c.clave),
    }),
  };
}

export default async function ColeccionPage({
  params,
}: {
  params: Promise<{ estilo: string }>;
}) {
  const c = coleccionDe((await params).estilo);
  if (!c) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const todas = await cargarGaleriaPublica(supabase);
  const plantillas = todas.filter((t) => t.estilo === c.clave);
  if (plantillas.length === 0) notFound();

  const lista = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.h1,
    description: c.metaDescripcion,
    url: `${SITE_URL}${hrefColeccion(c.clave)}`,
    isPartOf: { "@type": "WebSite", name: "Sobrely", url: SITE_URL },
  };

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={lista} />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Sobrely — inicio">
          <LogoLockup />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button render={<Link href="/pricing" />} nativeButton={false} variant="ghost" size="sm">
            Precios
          </Button>
          {user ? (
            <Button render={<Link href="/dashboard" />} nativeButton={false} size="sm">
              Ir al dashboard
            </Button>
          ) : (
            <Button render={<Link href="/register" />} nativeButton={false} size="sm">
              Crear cuenta
            </Button>
          )}
        </nav>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 pt-6 pb-8 sm:pt-10">
        <p className="text-sm text-muted-foreground">
          <Link href="/plantillas" className="underline underline-offset-4 hover:text-foreground">
            Todas las plantillas
          </Link>
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-balance text-3xl font-bold tracking-tight sm:text-5xl">
          {c.h1}
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-muted-foreground">{c.intro}</p>
        <p className="mt-3 max-w-xl text-pretty text-muted-foreground">{c.cuandoElegirla}</p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-10">
        <TemplateMarketplace
          modo="publico"
          autenticado={Boolean(user)}
          plantillas={plantillas}
          eventoInicial={null}
          consultaInicial=""
          ocultarEstilo
          favoritosIniciales={[]}
          soloFavoritosInicial={false}
        />
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16">
        <h2 className="text-lg font-semibold tracking-tight">Otros estilos</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {COLECCIONES.filter((o) => o.clave !== c.clave).map((o) => (
            <li key={o.clave}>
              <Link
                href={hrefColeccion(o.clave)}
                className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm hover:bg-muted"
              >
                {o.h1.replace("Invitaciones digitales ", "")}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          ¿Qué incluye cada plan?{" "}
          <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
            Ver precios
          </Link>
        </p>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
        <LocalLine className="mt-2" />
        <p className="mt-1">© {new Date().getFullYear()} Sobrely</p>
      </footer>
    </main>
  );
}
