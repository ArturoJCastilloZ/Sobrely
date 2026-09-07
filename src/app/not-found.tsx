import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

/**
 * 404 raíz. Antes solo existían los de `editor/[invitationId]` y
 * `[username]/[invitationSlug]`, así que un enlace roto a cualquier otra ruta
 * caía en el 404 genérico de Next, sin marca y en inglés.
 *
 * El title NO lleva sufijo: el layout raíz ya añade "· Sobrely" por template, y
 * ponerlo aquí lo duplicaba — se vio al renderizarlo, no al leer el código.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">Esta página no existe</h1>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          Puede que el enlace esté mal escrito o que la invitación ya no esté
          publicada.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="touch" nativeButton={false} render={<Link href="/" />}>
          Ir al inicio
        </Button>
        <Button
          size="touch"
          variant="outline"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          Ir al panel
        </Button>
      </div>
    </div>
  );
}
