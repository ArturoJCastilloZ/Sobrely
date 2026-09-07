"use client";

import { RouteError } from "@/components/errors/route-error";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      titulo="Error en el panel de administración"
      descripcion="No se pudo cargar esta vista."
      volverHref="/dashboard"
      volverLabel="Ir al panel"
    />
  );
}
