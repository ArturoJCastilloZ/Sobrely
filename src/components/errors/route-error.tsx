"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Pantalla de error de ruta, compartida por los `error.tsx` del proyecto.
 *
 * Antes de esto NO había ni un solo `error.tsx` en el árbol: cualquier
 * excepción no capturada en el dashboard, el admin, el editor o el check-in
 * caía en la pantalla por defecto de Next, que en producción es una página en
 * blanco con "Application error".
 *
 * El `digest` se muestra a propósito: es el único dato con el que se puede
 * cruzar el error que vio el usuario contra los logs del servidor. El mensaje
 * crudo NO se muestra, porque puede filtrar detalles internos.
 */
export function RouteError({
  error,
  reset,
  titulo = "Algo salió mal",
  descripcion = "No pudimos cargar esta sección. El problema es nuestro, no tuyo.",
  volverHref = "/dashboard",
  volverLabel = "Ir al panel",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  titulo?: string;
  descripcion?: string;
  volverHref?: string;
  volverLabel?: string;
}) {
  useEffect(() => {
    // Sin esto el error desaparece: el boundary lo captura y nadie se entera.
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          className="size-6 text-destructive"
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          {descripcion}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="touch" onClick={reset}>
          Reintentar
        </Button>
        <Button
          size="touch"
          variant="outline"
          nativeButton={false}
          render={<Link href={volverHref} />}
        >
          {volverLabel}
        </Button>
      </div>

      {error.digest && (
        <p className="text-xs text-muted-foreground">
          Si vuelve a pasar, mándanos este código:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
            {error.digest}
          </code>
        </p>
      )}
    </div>
  );
}
