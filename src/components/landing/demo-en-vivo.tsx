"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

import type { PlantillaDemo } from "@/components/landing/demo-contenido";

/**
 * Demo en vivo de la landing (fase 4 de la propuesta visual): el cascarón.
 *
 * Está debajo del pliegue, así que NO entra en la carga inicial: la parte pesada (la invitación
 * real, su CSS y el documento de la plantilla) se pide recién cuando la sección está a punto de
 * verse. Hasta entonces se reserva su alto para que al montarse no empuje nada (CLS) y no pesa
 * nada sobre el LCP del hero, que se midió en 12-linea-base-rendimiento.md.
 */
type Props = { plantillas: PlantillaDemo[]; autenticado: boolean };

function Reserva() {
  return (
    <div
      aria-hidden="true"
      className="h-[40rem] rounded-2xl border border-dashed bg-muted/30 sm:h-[36rem]"
    />
  );
}

export function DemoEnVivo({
  plantillas,
  autenticado,
}: {
  plantillas: PlantillaDemo[];
  autenticado: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [Contenido, setContenido] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          o.disconnect();
          // `import()` explícito, no `next/dynamic`: así el código de la invitación no se
          // pide hasta que la sección está a punto de verse (en desarrollo, `dynamic` lo
          // precargaba al abrir la página).
          import("@/components/landing/demo-contenido")
            .then((m) => setContenido(() => m.DemoContenido))
            .catch((e: unknown) => console.error("demo-en-vivo", e));
        }
      },
      { rootMargin: "400px 0px" },
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {Contenido ? (
        <Contenido plantillas={plantillas} autenticado={autenticado} />
      ) : (
        <Reserva />
      )}
    </div>
  );
}
