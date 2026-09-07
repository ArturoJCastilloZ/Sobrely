"use client";

import { RouteError } from "@/components/errors/route-error";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      titulo="No pudimos cargar tu panel"
      descripcion="Tus invitaciones y tus invitados están a salvo. Reintenta en un momento."
      volverHref="/"
      volverLabel="Ir al inicio"
    />
  );
}
