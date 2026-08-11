import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimationCatalog } from "@/components/animation/animation-catalog";

export const metadata: Metadata = { title: "Catálogo de animaciones" };

export default function AnimationsCatalogPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Catálogo de animaciones
          </h1>
          <p className="text-muted-foreground">
            Vista previa de las animaciones disponibles.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard" />}
          nativeButton={false}
        >
          ← Volver
        </Button>
      </div>

      <AnimationCatalog />
    </div>
  );
}
