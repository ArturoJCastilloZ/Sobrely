import type { Metadata } from "next";
import { AnimationCatalog } from "@/components/animation/animation-catalog";

export const metadata: Metadata = { title: "Catálogo de animaciones" };

export default function AnimationsCatalogPage() {
  return (
    <div className="space-y-6">
      {/* Sin boton "Volver": con el sidebar persistente es navegacion
          duplicada, y ademas competia con el. Volver es el sidebar. */}
      <div>
        <h1 className="text-[length:var(--ed-text-2xl)]/(--ed-leading-2xl) font-(--ed-weight-semibold) tracking-(--ed-tracking-2xl)">
          Catálogo de animaciones
        </h1>
        <p className="text-[length:var(--ed-text-sm)]/(--ed-leading-sm) tracking-(--ed-tracking-sm) text-muted-foreground">
          Así se ven las animaciones que puedes aplicar a tu invitación. Pulsa
          reproducir para verlas en movimiento.
        </p>
      </div>

      <AnimationCatalog />
    </div>
  );
}
