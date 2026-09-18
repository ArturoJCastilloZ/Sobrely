"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Paneles de nivel DOCUMENTO. Viven aqui y no en el editor porque los leen
 * TRES sitios —el riel de escritorio, la barra movil y la cabecera del
 * inspector— y una lista duplicada se queda vieja en cuanto se anade un panel.
 *
 * Se conserva tal cual estaba en `invitation-editor.tsx`: van separados de la
 * lista de secciones porque no son hermanos suyos. Cambian la invitacion
 * entera, no un bloque. Mezclarlos en un mismo control de pestanas era el
 * defecto estructural del editor viejo.
 */
export const PANELES_DOC = [
  { id: "theme", label: "Tema" },
  { id: "guests", label: "Invitados" },
  { id: "settings", label: "Ajustes" },
] as const;

export type PanelId = "module" | (typeof PANELES_DOC)[number]["id"];

/** Que hoja inferior esta abierta en movil, o `null` si solo se ve el lienzo. */
export type HojaMovil = null | "secciones" | PanelId;

/**
 * La API de seleccion. Todas las funciones son ESTABLES entre renders: se
 * construyen con `useCallback` sin dependencias y viajan en un `useMemo` que
 * solo cambia cuando cambia el estado de verdad.
 *
 * Esto importa porque el valor del contexto es lo que decide quien repinta.
 */
export type SeleccionApi = {
  /** Id del modulo seleccionado, o `null`. En la Fase 2 esto se ensancha a una
   *  direccion de bloque; hoy no hace falta y meterlo seria config muerta. */
  moduloId: string | null;
  seleccionar: (id: string | null) => void;
  /** Reapunta la seleccion tras un guardado, cuando un `tmp-*` recibe su uuid. */
  remapear: (mapa: Record<string, string>) => void;
  panel: PanelId;
  setPanel: (p: PanelId) => void;
  /** Elige panel Y abre su hoja en movil. */
  irAPanel: (p: PanelId) => void;
  hojaMovil: HojaMovil;
  setHojaMovil: (h: HojaMovil | ((actual: HojaMovil) => HojaMovil)) => void;
};

const SeleccionContext = createContext<SeleccionApi | null>(null);

/**
 * Lo que un componente de arriba —el dueno del documento— necesita para tocar
 * la seleccion sin SUSCRIBIRSE a ella.
 *
 * Existe por un caso concreto y real: tras guardar, los modulos nuevos dejan de
 * ser `tmp-*` y pasan a tener su uuid; si la seleccion no se reapunta, el panel
 * de propiedades se queda vacio justo despues del primer autoguardado de una
 * seccion recien creada.
 *
 * Se resuelve con una ref y no suscribiendo al dueno del documento, PORQUE
 * suscribirlo es exactamente lo que este refactor viene a evitar: si el dueno
 * del documento repintara al cambiar la seleccion, repintaria el lienzo con el,
 * y no habriamos ganado nada. Es el mismo motivo por el que `versionRef`,
 * `docRef` y `ultimoGuardado` ya son refs en el editor.
 */
export type SeleccionRef = { current: SeleccionApi | null };

export function SeleccionProvider({
  idInicial,
  apiRef,
  children,
}: {
  idInicial: string | null;
  /** Puente imperativo para el dueno del documento. Ver `SeleccionRef`. */
  apiRef?: SeleccionRef;
  children: ReactNode;
}) {
  const [moduloId, setModuloId] = useState<string | null>(idInicial);
  const [panel, setPanelEstado] = useState<PanelId>("module");
  const [hojaMovil, setHojaMovilEstado] = useState<HojaMovil>(null);

  const seleccionar = useCallback((id: string | null) => setModuloId(id), []);

  const remapear = useCallback((mapa: Record<string, string>) => {
    setModuloId((cur) => (cur && mapa[cur] ? mapa[cur] : cur));
  }, []);

  const setPanel = useCallback((p: PanelId) => setPanelEstado(p), []);

  const setHojaMovil = useCallback(
    (h: HojaMovil | ((actual: HojaMovil) => HojaMovil)) =>
      setHojaMovilEstado(h as never),
    [],
  );

  /** Abre en movil la hoja del panel que se acaba de elegir. */
  const irAPanel = useCallback((p: PanelId) => {
    setPanelEstado(p);
    setHojaMovilEstado(p);
  }, []);

  const api = useMemo<SeleccionApi>(
    () => ({
      moduloId,
      seleccionar,
      remapear,
      panel,
      setPanel,
      irAPanel,
      hojaMovil,
      setHojaMovil,
    }),
    [moduloId, panel, hojaMovil, seleccionar, remapear, setPanel, irAPanel, setHojaMovil],
  );

  // Se publica en un EFECTO, no durante el render: escribir una ref mientras se
  // renderiza rompe el modelo concurrente de React, y el linter lo marca.
  //
  // Que la ref vaya un render por detras no puede hacer dano, y conviene ver por
  // que: el unico metodo que se llama a traves de ella es `remapear`, que se
  // construye con `useCallback([])` y por tanto tiene identidad ESTABLE para
  // siempre; y por dentro usa la forma funcional `setModuloId(cur => ...)`, asi
  // que lee el estado fresco que le da React, no el capturado en la clausura.
  // Una api obsoleta sigue trayendo exactamente la misma funcion util.
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = api;
    return () => {
      apiRef.current = null;
    };
  }, [api, apiRef]);

  return (
    <SeleccionContext.Provider value={api}>{children}</SeleccionContext.Provider>
  );
}

/**
 * Suscribe a la seleccion.
 *
 * ⚠️ Llamar a esto ACOPLA el componente a la seleccion: repintara cada vez que
 * el usuario haga clic en otra seccion. El lienzo NO debe llamarlo — es
 * justamente lo que el guard de `desacople-canvas.test.ts` vigila.
 */
export function useSeleccion(): SeleccionApi {
  const ctx = useContext(SeleccionContext);
  if (!ctx) {
    throw new Error("useSeleccion() fuera de <SeleccionProvider>");
  }
  return ctx;
}
