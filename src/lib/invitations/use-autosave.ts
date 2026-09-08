"use client";

import { useCallback, useEffect, useRef } from "react";

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
 * - El guardado en vuelo se serializa. Si se dispara uno mientras otro corre,
 *   el segundo espera; sin eso, dos respuestas pueden llegar desordenadas y la
 *   vieja pisa a la nueva.
 * - `beforeunload` se registra solo cuando HAY cambios pendientes. Registrarlo
 *   siempre hace que el navegador pregunte al cerrar aunque no haya nada que
 *   perder, y la gente aprende a ignorar el aviso.
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
  guardar,
  esperaMs = 1200,
  pausado = false,
}: {
  hayCambios: boolean;
  /** Debe resolver cuando el guardado terminó. Los errores se manejan dentro. */
  guardar: () => Promise<void>;
  esperaMs?: number;
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

  const enVuelo = useRef<Promise<void> | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guardarAhora = useCallback(async () => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    // Serializa: si hay uno corriendo, este espera su turno.
    const anterior = enVuelo.current ?? Promise.resolve();
    const propio = anterior.then(() => guardarRef.current());
    enVuelo.current = propio.finally(() => {
      if (enVuelo.current === propio) enVuelo.current = null;
    });
    return enVuelo.current;
  }, []);

  useEffect(() => {
    if (!hayCambios || pausado) return;
    temporizador.current = setTimeout(() => {
      void guardarAhora();
    }, esperaMs);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
    // `hayCambios` cambia en cada edición, así que el temporizador se reinicia
    // mientras el usuario sigue escribiendo: guarda cuando hace una pausa.
  }, [hayCambios, pausado, esperaMs, guardarAhora]);

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

  return { guardarAhora };
}
