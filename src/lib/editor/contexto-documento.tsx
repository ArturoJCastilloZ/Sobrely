"use client";

import { createContext, useContext } from "react";

import type { EditorAction } from "@/lib/invitations/editor-document";
import type { EditorInvitation, EditorModule } from "@/lib/invitations/editor-types";
import type { ThemeConfig } from "@/lib/theme/theme";
import type { UploadContext } from "@/components/editor/image-uploader";

/**
 * El documento y todo lo que lo persiste.
 *
 * El PROVEEDOR de este contexto es `InvitationEditor`, y a proposito: el
 * `useReducer` del historial y el autoguardado NO se mueven de ahi. Son el
 * codigo mas delicado del editor —la espera que se rearma con `revision`, el
 * bloqueo optimista por `version`, la serializacion de guardados en vuelo— y
 * cada linea de sus comentarios esta pagada con una perdida de datos
 * reproducida. Este refactor los deja intactos y solo cambia QUIEN los lee.
 *
 * Lo que se gana: `EditorLayout` deja de reenviar quince props a mano, y cada
 * pieza se suscribe SOLO a lo que usa.
 */
export type DocumentoApi = {
  invitation: EditorInvitation;
  modules: EditorModule[];
  theme: ThemeConfig;

  /** Despacha una edicion del usuario (entra al historial). */
  aplicar: (action: EditorAction) => void;
  deshacer: () => void;
  rehacer: () => void;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;

  /** Hay cambios sin guardar. Derivado del documento, no una bandera. */
  dirty: boolean;
  guardando: boolean;
  /** Mensaje del ultimo guardado fallido, o `null`. */
  errorGuardado: string | null;
  /** Otra pestana guardo algo mas nuevo: se dejo de guardar a proposito. */
  conflicto: boolean;
  guardarAhora: () => Promise<void>;

  publicando: boolean;
  alternarPublicado: () => void;
  /** Guarda y vuelve al panel; si el guardado falla, pregunta. */
  salirAlPanel: () => Promise<void>;
  saliendo: boolean;

  /** Constantes del entorno. No cambian en toda la vida del editor. */
  username: string;
  siteUrl: string;
  uploadCtx: UploadContext;
};

const DocumentoContext = createContext<DocumentoApi | null>(null);

export const DocumentoProvider = DocumentoContext.Provider;

export function useDocumento(): DocumentoApi {
  const ctx = useContext(DocumentoContext);
  if (!ctx) {
    throw new Error("useDocumento() fuera de <DocumentoProvider>");
  }
  return ctx;
}
