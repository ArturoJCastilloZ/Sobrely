"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"

import { cn } from "@/lib/utils"

/**
 * Avatar con respaldo.
 *
 * Hace falta porque el header del dashboard muestra el CORREO CRUDO del usuario
 * en un `<span>`. Un menú de cuenta con avatar es la diferencia entre "sitio
 * web" y "aplicación".
 *
 * La primitiva maneja el estado de carga de la imagen: el respaldo solo aparece
 * si la imagen falla, sin el parpadeo de iniciales que da un `onError` a mano.
 */
function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-muted select-none",
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center bg-muted text-[length:var(--ed-text-mini)] font-(--ed-weight-medium) text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

/** Iniciales a partir de un nombre. Nunca del correo: eso es dato, no identidad. */
function initialsFrom(name: string | null | undefined, fallback = "?"): string {
  const partes = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return fallback;
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export { Avatar, AvatarImage, AvatarFallback, initialsFrom }
