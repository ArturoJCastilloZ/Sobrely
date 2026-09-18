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

import {
  mismaSeleccion,
  moduloDe,
  type Seleccion,
} from "./seleccion";

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
  /** La direccion completa: nada, un modulo, o un bloque dentro de un modulo. */
  seleccion: Seleccion;
  /**
   * El modulo al que apunta la seleccion, sea del nivel que sea. Derivado, no
   * un segundo estado: tenerlo aparte permitiria que los dos se contradijeran.
   */
  moduloId: string | null;
  seleccionar: (sel: Seleccion) => void;
  /** Atajo para el riel, que siempre selecciona al nivel de modulo. */
  seleccionarModulo: (id: string | null) => void;
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
  const [seleccion, setSeleccion] = useState<Seleccion>(
    idInicial ? { tipo: "modulo", moduloId: idInicial } : null,
  );
  const [panel, setPanelEstado] = useState<PanelId>("module");
  const [hojaMovil, setHojaMovilEstado] = useState<HojaMovil>(null);

  // Se compara por VALOR antes de fijar. La seleccion se reconstruye en cada
  // clic del lienzo, asi que sin esto volver a pulsar el MISMO bloque crearia
  // un objeto nuevo, cambiaria el contexto y repintaria el riel y el inspector
  // para no cambiar nada.
  const seleccionar = useCallback((sel: Seleccion) => {
    setSeleccion((cur) => (mismaSeleccion(cur, sel) ? cur : sel));
  }, []);

  const seleccionarModulo = useCallback(
    (id: string | null) =>
      setSeleccion((cur) => {
        const sig: Seleccion = id ? { tipo: "modulo", moduloId: id } : null;
        return mismaSeleccion(cur, sig) ? cur : sig;
      }),
    [],
  );

  const remapear = useCallback((mapa: Record<string, string>) => {
    setSeleccion((cur) => {
      if (cur === null) return cur;
      const nuevo = mapa[cur.moduloId];
      if (!nuevo) return cur;
      // Se conserva el NIVEL: si habia un bloque elegido, sigue elegido tras el
      // guardado. Volver al modulo entero perderia el sitio del usuario.
      return cur.tipo === "bloque"
        ? { ...cur, moduloId: nuevo }
        : { tipo: "modulo", moduloId: nuevo };
    });
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
      seleccion,
      moduloId: moduloDe(seleccion),
      seleccionar,
      seleccionarModulo,
      remapear,
      panel,
      setPanel,
      irAPanel,
      hojaMovil,
      setHojaMovil,
    }),
    [seleccion, panel, hojaMovil, seleccionar, seleccionarModulo, remapear, setPanel, irAPanel, setHojaMovil],
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
