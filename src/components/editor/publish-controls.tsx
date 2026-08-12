"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PublishControls({
  username,
  slug,
  isPublished,
  dirty,
}: {
  username: string;
  slug: string;
  isPublished: boolean;
  dirty: boolean;
}) {
  if (!isPublished) {
    return (
      <p className="text-xs text-muted-foreground">
        {dirty
          ? "Guarda los cambios para poder publicar."
          : "Aún no está publicada. Púlsa “Publicar” para generar su URL pública."}
      </p>
    );
  }

  const path = `/${username}/${slug}`;

  async function copy() {
    const fullUrl = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded bg-muted px-2 py-1 font-mono text-muted-foreground">
        {path}
      </span>
      <Button size="xs" variant="outline" onClick={copy}>
        Copiar enlace
      </Button>
      <Button
        size="xs"
        variant="ghost"
        render={<a href={path} target="_blank" rel="noopener noreferrer" />}
        nativeButton={false}
      >
        Ver ↗
      </Button>
    </div>
  );
}
