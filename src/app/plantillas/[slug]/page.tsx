import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { UseTemplateButton } from "@/components/dashboard/use-template-button";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/billing/config";
import { cn } from "@/lib/utils";
import { cargarPlantillaPublica } from "@/lib/templates/galeria-publica";
import { BotonUsarComoInvitado } from "@/components/templates/boton-usar-como-invitado";
import { esInicioReciente } from "@/lib/auth/inicio-reciente";
import { AutoUsarPlantilla } from "@/components/templates/auto-usar-plantilla";
import { ResumenDeFicha } from "@/components/templates/resumen-ficha";
import PlantillaPage from "@/app/plantilla/[slug]/page";
import { RegistrarVisita } from "@/components/analytics/registrar-visita";
import { metadatosDeFicha } from "@/lib/seo/ficha-plantilla";

/**
 * Vista de VENTA de una plantilla: la invitación completa, tal como la verá un
 * invitado, con el precio de publicarla y el botón de usarla a la vista.
 *
 * Reutiliza `/plantilla/[slug]` por COMPOSICIÓN (la renderiza como componente)
 * en vez de copiarla o de añadirle el botón. Esa ruta es la superficie donde se
 * capturan las miniaturas y donde miden cinco scripts (`capturar-miniaturas`,
 * `hojas-de-contacto`, `medir-cajas-de-texto`, …): un botón de compra dentro se
 * quemaría en las imágenes y desplazaría las mediciones. Así sigue intacta, y
 * lo que se ve aquí no puede divergir de lo que se captura.
 *
 * No se indexa: ~65 vistas casi idénticas competirían con las landings de SEO
 * por tipo de evento. El índice `/plantillas` es el que posiciona.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const tpl = await cargarPlantillaPublica(supabase, slug);
  if (!tpl) return { title: "Plantilla", robots: { index: false, follow: true } };
  return metadatosDeFicha(tpl);
}

export default async function VistaDePlantillaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ usar?: string }>;
}) {
  const { slug } = await params;
  const { usar } = await searchParams;
  const supabase = await createClient();
  const [tpl, sesion] = await Promise.all([
    cargarPlantillaPublica(supabase, slug),
    supabase.auth.getUser(),
  ]);
  if (!tpl) notFound();
  const usuario = sesion.data.user;
  const autenticado = Boolean(usuario);

  /*
    Crear la invitación sola solo si la persona VIENE de elegir esta plantilla:
    `?usar=1` Y un inicio de sesión de hace segundos. El parámetro por sí solo
    no basta, porque crear algo por el mero hecho de abrir una URL permitiría
    que un enlace ajeno cree borradores en la cuenta de quien ya tenga sesión.
    Con la ventana, eso solo puede ocurrir a quien acaba de entrar.
  */
  const autoUsar =
    usar === "1" && usuario !== null && esInicioReciente(usuario.last_sign_in_at);

  return (
    <>
      <RegistrarVisita evento="view_template" valor={slug} />
      <PlantillaPage params={params} />
      {autoUsar && <AutoUsarPlantilla templateId={tpl.id} nombre={tpl.name} />}

      <ResumenDeFicha tpl={tpl} autenticado={autenticado} />

      {/*
        `sticky bottom-0` y NO `fixed` + un hueco del tamaño de la barra. Con
        `fixed` hacía falta un espaciador con un número a mano, y medido en
        móvil la barra (125 px) era 13 px más alta que el espaciador (112): tapaba
        el final de la invitación (WCAG 2.2, Focus Not Obscured). Pegajosa y al
        final del flujo, la barra se queda en el borde mientras se recorre la
        invitación y, al llegar abajo, ocupa su propio sitio: no puede tapar nada
        sin importar cuánto mida.
      */}
      <aside
        aria-label="Usar esta plantilla"
        className="sticky bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{tpl.name}</p>
            {tpl.precio ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">
                  {formatPrice(tpl.precio.precio)}
                </span>
                {tpl.precio.precioRegular !== null && (
                  <>
                    <span className="sr-only"> en oferta, antes </span>
                    <s className="ml-1.5 tabular-nums">
                      {formatPrice(tpl.precio.precioRegular)}
                    </s>
                  </>
                )}{" "}
                para publicar · pago único
                <span className="hidden sm:inline"> · editar es gratis</span>
                {tpl.incluye && (
                  <a
                    href="#que-incluye"
                    className="ml-2 font-medium text-foreground underline underline-offset-4"
                  >
                    Qué incluye
                  </a>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Editar es gratis.</p>
            )}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href="/plantillas"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-11 shrink-0 lg:h-9",
              )}
            >
              Más diseños
            </Link>
            <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
              {autenticado ? (
                <UseTemplateButton templateId={tpl.id} />
              ) : (
                <BotonUsarComoInvitado slug={slug} className="h-11 lg:h-9" />
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
