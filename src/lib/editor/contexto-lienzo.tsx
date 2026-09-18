"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Limites del zoom del lienzo. Viven aqui y no en `preview-pane` porque a
 * partir de la Fase 2 los necesita tambien la capa de seleccion: el recuadro
 * de un bloque se dibuja sobre un lienzo ESCALADO por `transform`, asi que
 * quien pinte el recuadro tiene que saber por cuanto.
 */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 1.5;

export type VistaLienzo = "mobile" | "desktop";

export type LienzoApi = {
  /** Factor de escala del marco. Ver la nota de `preview-pane` sobre por que es
   *  `transform: scale` y no la propiedad `zoom`: la medicion decidio. */
  zoom: number;
  /** Fija el zoom recortandolo a [ZOOM_MIN, ZOOM_MAX] y a 2 decimales. */
  ajustaZoom: (z: number) => void;
  vista: VistaLienzo;
  setVista: (v: VistaLienzo) => void;
  /** Indice de la seccion visible, para el paginador. */
  seccionActual: number;
  setSeccionActual: (i: number) => void;
};

const LienzoContext = createContext<LienzoApi | null>(null);

export function LienzoProvider({ children }: { children: ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const [vista, setVistaEstado] = useState<VistaLienzo>("mobile");
  const [seccionActual, setSeccionActualEstado] = useState(0);

  // El recorte vive AQUI y no en cada sitio de llamada: antes estaba en
  // `preview-pane` y cualquier control nuevo del zoom —la barra de estado de la
  // Fase 8, los atajos ⌘+/⌘−— habria tenido que reimplementarlo, o saltarselo.
  const ajustaZoom = useCallback(
    (z: number) =>
      setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100))),
    [],
  );

  const setVista = useCallback((v: VistaLienzo) => setVistaEstado(v), []);
  const setSeccionActual = useCallback((i: number) => setSeccionActualEstado(i), []);

  const api = useMemo<LienzoApi>(
    () => ({ zoom, ajustaZoom, vista, setVista, seccionActual, setSeccionActual }),
    [zoom, ajustaZoom, vista, setVista, seccionActual, setSeccionActual],
  );

  return <LienzoContext.Provider value={api}>{children}</LienzoContext.Provider>;
}

export function useLienzo(): LienzoApi {
  const ctx = useContext(LienzoContext);
  if (!ctx) {
    throw new Error("useLienzo() fuera de <LienzoProvider>");
  }
  return ctx;
}
