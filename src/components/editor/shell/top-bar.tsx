"use client";

import Link from "next/link";
import { ArrowLeftIcon, ExternalLinkIcon, Redo2Icon, Undo2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDocumento } from "@/lib/editor/contexto-documento";

/**
 * Barra superior. Antes eran TRES bloques apilados —acciones, enlace publico y
 * URL personalizada— que en un telefono se comian una fraccion grande del
 * viewport antes de mostrar nada editable. El enlace y la URL bajan al panel de
 * Ajustes, que es donde se consultan, no donde estorban.
 *
 * No consume la seleccion: cambiar de seccion no tiene por que repintar la
 * barra. El rediseno del §22 del plan entra en la Fase 8; aqui solo se muda.
 */
export function TopBar() {
  const {
    invitation,
    username,
    dirty,
    guardando,
    errorGuardado,
    guardarAhora,
    salirAlPanel,
    saliendo,
    deshacer,
    rehacer,
    puedeDeshacer,
    puedeRehacer,
    publicando,
    alternarPublicado,
  } = useDocumento();

  return (
    <header className="shrink-0 border-b">
      <div className="flex w-full items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        {/*
          `min-w-0` en los dos flex es lo que permite que el titulo se recorte
          en vez de empujar. Sin el, un hijo flex se niega a encogerse por
          debajo de su contenido y la barra desborda: medido a 375px, el
          contenido ocupaba 424px y "Publicar" quedaba fuera de pantalla.
        */}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            {/* Sigue siendo un enlace real (clic central, "abrir en pestana
                nueva", lectores de pantalla), pero con cambios pendientes se
                intercepta para GUARDAR antes de irse. Sin esto, la
                navegacion interna de Next se llevaba el trabajo por delante:
                `beforeunload` no la cubre. */}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Volver al panel"
              render={<Link href="/dashboard" />}
              nativeButton={false}
              className="shrink-0"
              disabled={saliendo}
              onClick={(e) => {
                if (!dirty) return;
                e.preventDefault();
                void salirAlPanel();
              }}
            >
              <ArrowLeftIcon />
            </Button>
            <span className="truncate text-sm font-medium">
              {invitation.title || "Sin título"}
            </span>
            {/* Estado del autoguardado. Sustituye al boton Guardar: el
                usuario no deberia tener que acordarse de guardar.
                Se oculta en pantallas estrechas — el titulo importa mas, y
                el estado se sigue anunciando por `aria-live`. */}
            {/* Cuatro estados, no dos. Antes era `dirty ? "Guardando…" :
                "Guardado"`, asi que "Guardando…" solo significaba "hay
                cambios": con un guardado fallido se quedaba ahi para siempre
                y afirmaba que se estaba guardando algo que no estaba en
                vuelo. */}
            {/* El `aria-live` envuelve a los DOS estados: si vive solo en la
                rama de exito, el lector de pantalla deja de anunciar
                justamente cuando hay algo que decir. */}
            <span className="flex min-w-0 items-center" aria-live="polite">
              {errorGuardado ? (
                // El fallo SI se ve en movil. El estado normal se sigue
                // ocultando en pantalla estrecha —el titulo importa mas— pero
                // esconder el error dejaria al usuario editando sobre trabajo
                // que no se esta guardando, que es el defecto que este cambio
                // viene a cerrar.
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs text-destructive"
                  onClick={() => void guardarAhora()}
                >
                  {errorGuardado} · Reintentar
                </Button>
              ) : (
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {guardando ? "Guardando…" : dirty ? "Sin guardar" : "Guardado"}
                </span>
              )}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Deshacer / rehacer. Los atajos funcionan igual; estos botones
                existen porque un atajo que nadie ve no existe. */}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Deshacer"
              title="Deshacer (⌘Z)"
              disabled={!puedeDeshacer}
              onClick={deshacer}
            >
              <Undo2Icon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Rehacer"
              title="Rehacer (⌘⇧Z)"
              disabled={!puedeRehacer}
              onClick={rehacer}
            >
              <Redo2Icon />
            </Button>
            {/*
              "Ver" vive aqui y no dentro de Ajustes. Es la accion que mas se
              repite mientras editas —mirar como va quedando de verdad— y
              enterrarla dos clics adentro la volvia invisible. Solo aparece
              publicada, porque antes de eso el enlace no lleva a ningun lado.
            */}
            {invitation.is_published && username && invitation.slug && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={`/${username}/${invitation.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLinkIcon />
                Ver
              </Button>
            )}
            <Button
              onClick={alternarPublicado}
              disabled={publicando}
              variant={invitation.is_published ? "outline" : "default"}
              size="sm"
            >
              {publicando
                ? "…"
                : invitation.is_published
                  ? "Despublicar"
                  : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
