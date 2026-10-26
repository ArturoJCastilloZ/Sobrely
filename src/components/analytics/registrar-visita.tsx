"use client";

import { useEffect } from "react";

/**
 * Avisa al embudo de una visita (T05): `view_category`, `view_template` o
 * `view_pricing`. No pinta nada.
 *
 * - Sin cookies: la sesión es un identificador al azar en `sessionStorage`, que
 *   se borra al cerrar la pestaña y no sale del sitio.
 * - Respeta «No rastrear» del navegador y no cuenta una página que solo se está
 *   precargando (`document.prerendering`).
 * - Nunca falla hacia la persona: todo va en `try/catch` y no espera respuesta.
 */
type Props = {
  evento: "view_category" | "view_template" | "quick_view_open" | "view_pricing";
  valor: string;
};

function sesionDeLaPestana(): string {
  try {
    const guardada = window.sessionStorage.getItem("sobrely_sesion");
    if (guardada) return guardada;
    const nueva = crypto.randomUUID();
    window.sessionStorage.setItem("sobrely_sesion", nueva);
    return nueva;
  } catch {
    // Sin almacenamiento (ventana privada, bloqueado): una sesión por visita.
    return crypto.randomUUID();
  }
}

export function RegistrarVisita({ evento, valor }: Props) {
  useEffect(() => {
    try {
      if (navigator.doNotTrack === "1") return;
      if ((document as Document & { prerendering?: boolean }).prerendering) return;
      const cuerpo = JSON.stringify({ evento, valor, sesion: sesionDeLaPestana() });
      void fetch("/api/embudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // La analítica no puede romper la página.
    }
  }, [evento, valor]);

  return null;
}
