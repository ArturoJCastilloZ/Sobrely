import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pagina no encontrada · Sobrely" };

/**
 * 404 raiz. Antes solo existian los de `editor/[invitationId]` y
 * `[username]/[invitationSlug]`, asi que un enlace roto a cualquier otra ruta
 * caia en el 404 generico de Next, sin marca y en ingles.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">Esta pagina no existe</h1>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          Puede que el enlace este mal escrito o que la invitacion ya no este
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
