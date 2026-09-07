"use client";

import { RouteError } from "@/components/errors/route-error";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      titulo="Algo salió mal"
      descripcion="Tuvimos un problema al cargar esta página. Puedes reintentar o volver al inicio."
      volverHref="/"
      volverLabel="Ir al inicio"
    />
  );
}
