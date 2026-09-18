"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * ¿Este render es el del EDITOR o el de la pagina publica?
 *
 * Existe por una razon muy concreta, y es la que hace segura toda la Fase 2:
 *
 *   Las once secciones que no son la portada SOLO emiten `data-bloque` cuando
 *   `freeMove` esta encendido — y el defecto es `false`. O sea que las 18
 *   invitaciones vivas no tienen NI UN ancla en esos once modulos, y sin anclas
 *   no se puede hacer clic en un texto para seleccionarlo.
 *
 * La salida es emitir el ancla tambien con `freeMove` apagado, pero SOLO en el
 * editor. Con esto:
 *
 * · La pagina publica renderiza BYTE A BYTE lo de siempre, porque nadie provee
 *   este contexto ahi y el defecto es `false`. Se comprueba por md5.
 * · El editor gana anclas en los doce modulos sin tocar el esquema, sin
 *   migraciones y sin cambiar una sola invitacion guardada.
 *
 * Se hace con contexto y no con una prop porque `Section` se llama desde once
 * componentes distintos: una prop obligaria a enhebrarla por las doce firmas y
 * bastaria olvidarse de una para que ese modulo no fuera seleccionable, en
 * silencio.
 */
const ModoEditorContext = createContext(false);

export function ModoEditorProvider({ children }: { children: ReactNode }) {
  return (
    <ModoEditorContext.Provider value={true}>{children}</ModoEditorContext.Provider>
  );
}

/** `false` en la pagina publica, que es lo que deja su HTML intacto. */
export function useEsEditor(): boolean {
  return useContext(ModoEditorContext);
}
