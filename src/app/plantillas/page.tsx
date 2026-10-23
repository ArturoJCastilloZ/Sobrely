import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/brand/logo-lockup";
import { LocalLine } from "@/components/seo/local-line";
import { TemplateMarketplace } from "@/components/dashboard/template-marketplace";
import { createClient } from "@/lib/supabase/server";
import { cargarGaleriaPublica } from "@/lib/templates/galeria-publica";

/**
 * Galería PÚBLICA de plantillas: la puerta de entrada del embudo. Cualquiera la
 * ve sin cuenta; el registro se pide al elegir una plantilla, y pagar, al
 * publicar (FUNNEL_PLAN.md).
 *
 * Esta página SÍ se indexa. Sus ~65 vistas de detalle (`/plantillas/<slug>`) no:
 * son contenido casi idéntico entre sí y compiten con las landings de SEO por
 * tipo de evento, así que el índice puede posicionar y los detalles no diluyen.
 */
export const metadata: Metadata = {
  title: "Plantillas de invitaciones digitales",
  description:
    "Plantillas de invitaciones digitales para boda, XV años, cumpleaños, baby shower y eventos. Diseñar es gratis; pagas una sola vez, por evento, al publicar.",
  alternates: { canonical: "/plantillas" },
};

export default async function PlantillasPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string; q?: string }>;
}) {
  const { evento, q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const plantillas = await cargarGaleriaPublica(supabase);

  /*
    El `evento` de la URL se valida contra los tipos que existen de verdad: un
    `?evento=cualquier-cosa` dejaría la rejilla vacía con todas las pastillas
    en «Todas», que se lee como un catálogo roto y no como un filtro inválido.
    Misma regla que la galería del dashboard.
  */
  const tipos = new Set(
    plantillas.map((t) => t.event_type).filter((t): t is string => Boolean(t)),
  );
  const eventoInicial = evento && tipos.has(evento) ? evento : null;

  return (
    <main className="flex flex-1 flex-col">
      {/*
        Tres botones y no cuatro: medido a 375 px en la landing, cuatro botones
        en este header desbordaban 88 px en horizontal. «Iniciar sesión» se
        esconde por debajo de `sm` por la misma razón que allí.
      */}
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
                className="hidden sm:inline-flex"
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

      <section className="mx-auto w-full max-w-5xl px-4 pt-6 pb-8 sm:pt-10">
        <h1 className="max-w-2xl font-display text-balance text-3xl font-bold tracking-tight sm:text-5xl">
          Elige un diseño y empieza a editarlo
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-muted-foreground">
          Crear y editar tu invitación es gratis. Pagas una sola vez, por
          evento, cuando decides publicarla. Cada plantilla muestra lo que
          cuesta publicarla tal como viene.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16">
        {plantillas.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="font-medium">Todavía no hay plantillas para mostrar</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Vuelve en un momento, o empieza con una invitación en blanco
              desde tu cuenta.
            </p>
          </div>
        ) : (
          <TemplateMarketplace
            modo="publico"
            autenticado={Boolean(user)}
            plantillas={plantillas}
            eventoInicial={eventoInicial}
            consultaInicial={q ?? ""}
            favoritosIniciales={[]}
            soloFavoritosInicial={false}
          />
        )}
        <p className="mt-8 text-sm text-muted-foreground">
          ¿Qué incluye cada plan?{" "}
          <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
            Ver precios
          </Link>
        </p>
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
        <LocalLine className="mt-2" />
        <p className="mt-1">© {new Date().getFullYear()} Sobrely</p>
      </footer>
    </main>
  );
}
