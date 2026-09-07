"use client";

import { RouteError } from "@/components/errors/route-error";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      titulo="No pudimos abrir el editor"
      descripcion="Tu invitacion no se perdio: lo ultimo que guardaste sigue ahi. Reintenta o vuelve al panel."
      volverHref="/dashboard"
      volverLabel="Ir al panel"
    />
  );
}
