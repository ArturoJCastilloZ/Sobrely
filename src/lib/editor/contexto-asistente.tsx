"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Si el asistente inicial está abierto. Vive aparte del documento: abrir o cerrar la guía no es
 * una edición (no entra al historial) y la lista de progreso necesita poder reabrirla.
 */
type AsistenteApi = { abierto: boolean; abrir: () => void; cerrar: () => void };

const AsistenteContext = createContext<AsistenteApi | null>(null);

export function AsistenteProvider({
  abiertoInicial,
  children,
}: {
  abiertoInicial: boolean;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  // La señal `?asistente=1` es de un solo uso: recargar no debe volver a abrir la guía.
  useEffect(() => {
    if (!abiertoInicial) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("asistente")) {
      url.searchParams.delete("asistente");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }, [abiertoInicial]);
  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const valor = useMemo(() => ({ abierto, abrir, cerrar }), [abierto, abrir, cerrar]);
  return <AsistenteContext.Provider value={valor}>{children}</AsistenteContext.Provider>;
}

export function useAsistente(): AsistenteApi {
  const ctx = useContext(AsistenteContext);
  if (!ctx) throw new Error("useAsistente() fuera de <AsistenteProvider>");
  return ctx;
}
