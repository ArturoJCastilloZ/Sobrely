"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { esperaDelAutoguardado } from "./autosave-espera";

/**
 * Autoguardado con espera, más guardia al cerrar la pestaña.
 *
 * Antes el editor solo guardaba con un botón, y `grep` de `beforeunload` daba
 * cero: cerrar la pestaña con cambios perdía el trabajo **sin un solo aviso**.
 * Encima, "Guardar" y "Publicar" se deshabilitaban mutuamente, así que el
 * usuario tenía que deducir un modelo de dos pasos que ningún editor moderno
 * tiene.
 *
 * Detalles que no son obvios y que deciden si esto funciona o miente:
 *
 * - **La espera se reinicia con `revision`, no con `hayCambios`.** Es la
 *   diferencia entre guardar y no guardar, y costó una pérdida de datos
 *   reproducida: `hayCambios` es un booleano, así que en cuanto se pone en
 *   `true` deja de cambiar de identidad, el efecto no se vuelve a ejecutar y
 *   NO se programa otro temporizador. Resultado medido: se guardaba lo que
 *   hubiera a los 1.2 s y todo lo tecleado después se quedaba fuera **para
 *   siempre**, porque la transición `false → true` que rearmaba el temporizador
 *   ya no volvía a ocurrir mientras siguiera habiendo cambios. `revision`
 *   cambia en CADA edición, así que ahora el efecto sí se re-ejecuta.
 * - **`maxEsperaMs` es la red de seguridad.** Una espera que se reinicia con
 *   cada tecla puede no dispararse nunca mientras alguien escribe sin pausas.
 *   Pasado ese tope desde la primera edición pendiente, se guarda igual.
 * - El guardado en vuelo se serializa. Si se dispara uno mientras otro corre,
 *   el segundo espera; sin eso, dos respuestas pueden llegar desordenadas y la
 *   vieja pisa a la nueva. El eslabón anterior se **neutraliza** con `catch`:
 *   encadenar sobre una promesa rechazada dejaba el siguiente guardado sin
 *   intentarse siquiera.
 * - `beforeunload` se registra solo cuando HAY cambios pendientes. Registrarlo
 *   siempre hace que el navegador pregunte al cerrar aunque no haya nada que
 *   perder, y la gente aprende a ignorar el aviso. Ojo: `beforeunload` NO cubre
 *   la navegación interna de Next — de eso se encarga quien use el hook.
 * - El temporizador se limpia al desmontar, pero un guardado ya disparado NO se
 *   cancela: cancelarlo sería exactamente perder el trabajo que esto protege.
 * - `pausado` apaga el TEMPORIZADOR y deja vivo el aviso al cerrar la pestaña.
 *   Son dos cosas distintas y compartían un solo flag: cuando el servidor
 *   rechaza un guardado por conflicto de versión, hay que dejar de reintentar
 *   (reintentar no lo resuelve, solo repite el aviso) pero el usuario SIGUE
 *   teniendo cambios sin guardar, así que quitarle el `beforeunload` sería
 *   cambiar un fallo silencioso por otro.
 */
export function useAutosave({
  hayCambios,
  revision,
  guardar,
  esperaMs = 1200,
  maxEsperaMs = 10_000,
  pausado = false,
}: {
  hayCambios: boolean;
  /**
   * Valor que cambia de IDENTIDAD con cada edición (el documento vivo sirve).
   * Es la dependencia que reinicia la espera; sin ella el temporizador se arma
   * una sola vez y el editor deja de guardar.
   */
  revision: unknown;
  /** Debe resolver cuando el guardado terminó. Los errores se manejan dentro. */
  guardar: () => Promise<void>;
  esperaMs?: number;
  /** Tope desde la primera edición pendiente: pasado esto se guarda aunque se siga escribiendo. */
  maxEsperaMs?: number;
  /** Detiene el autoguardado sin tocar el aviso al cerrar la pestaña. */
  pausado?: boolean;
}) {
  // La ref se sincroniza en un EFECTO, no durante el render: escribir una ref
  // mientras se renderiza rompe el modelo concurrente de React (y el lint lo
  // marca). Para un autoguardado con espera el desfase de un render es
  // irrelevante: cuando el temporizador dispara, el efecto ya corrió.
  const guardarRef = useRef(guardar);
  useEffect(() => {
    guardarRef.current = guardar;
  }, [guardar]);

  const [guardando, setGuardando] = useState(false);
  const enVuelo = useRef<Promise<void> | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Cuándo empezó el tramo de cambios pendientes actual, para el tope. */
  const pendienteDesde = useRef<number | null>(null);

  const guardarAhora = useCallback(async () => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    pendienteDesde.current = null;
    // Serializa: si hay uno corriendo, este espera su turno. El `catch` del
    // eslabón anterior es lo que impide que un fallo envenene la cadena y deje
    // el editor sin volver a guardar.
    const anterior = enVuelo.current ?? Promise.resolve();
    const propio = anterior.catch(() => undefined).then(() => {
      setGuardando(true);
      return guardarRef.current();
    });
    // La comparacion tiene que ser contra la promesa que SE GUARDA en la ref,
    // no contra `propio`: `propio.finally(...)` devuelve otra promesa distinta,
    // asi que `enVuelo.current === propio` era SIEMPRE falso y la ref no se
    // limpiaba nunca. Con el indicador honesto eso se volvio visible —
    // "Guardando…" fijo con la base ya escrita— pero el eslabon colgado ya
    // estaba ahi antes: cada guardado alargaba la cadena para siempre.
    const conLimpieza: Promise<void> = propio.finally(() => {
      if (enVuelo.current === conLimpieza) {
        enVuelo.current = null;
        setGuardando(false);
      }
    });
    enVuelo.current = conLimpieza;
    return conLimpieza;
  }, []);

  useEffect(() => {
    if (!hayCambios || pausado) {
      pendienteDesde.current = null;
      return;
    }
    if (pendienteDesde.current === null) pendienteDesde.current = Date.now();
    // La espera normal, recortada por lo que quede del tope. Escribir sin
    // pausas ya no aplaza el guardado indefinidamente.
    const espera = esperaDelAutoguardado({
      pendienteDesde: pendienteDesde.current,
      ahora: Date.now(),
      esperaMs,
      maxEsperaMs,
    });
    temporizador.current = setTimeout(() => {
      void guardarAhora();
    }, espera);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [hayCambios, revision, pausado, esperaMs, maxEsperaMs, guardarAhora]);

  useEffect(() => {
    if (!hayCambios) return;
    const alSalir = (e: BeforeUnloadEvent) => {
      // El navegador ignora el texto y muestra el suyo; lo que importa es
      // llamar a preventDefault.
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [hayCambios]);

  return { guardarAhora, guardando };
}
