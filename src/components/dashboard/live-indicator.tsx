"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Indicador de tiempo real del panel.
 *
 * Se suscribe a los cambios de las respuestas de ESTA invitación y refresca el
 * server component cuando llega algo. El refresco recae en `router.refresh()`
 * a propósito: así las métricas siguen calculándose en un solo lugar (el
 * servidor) en vez de duplicar la lógica en el cliente.
 *
 * El badge "EN VIVO" aparece SOLO si el canal llegó a `SUBSCRIBED`. Si la tabla
 * no está en la publicación de realtime o la conexión falla, no se pinta nada
 * en vez de prometer algo que no está pasando.
 */

/** Ventana para agrupar ráfagas de cambios en un solo refresco. */
const DEBOUNCE_MS = 400;

export function LiveIndicator({
  invitationId,
  mode,
}: {
  invitationId: string;
  mode: "guest_list" | "open";
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [changes, setChanges] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const table = mode === "guest_list" ? "invitation_guests" : "rsvp_responses";

    const channel = supabase
      .channel(`panel-${invitationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `invitation_id=eq.${invitationId}`,
        },
        () => {
          setChanges((n) => n + 1);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), DEBOUNCE_MS);
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [invitationId, mode, router]);

  if (!live) return null;

  return (
    <span className="flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span
          className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 motion-safe:animate-pulse"
          aria-hidden="true"
        />
        En vivo
      </span>
      {changes > 0 ? (
        <span className="font-medium text-emerald-700 dark:text-emerald-300">
          {changes === 1
            ? "1 respuesta nueva"
            : `${changes} respuestas nuevas`}
        </span>
      ) : null}
    </span>
  );
}
