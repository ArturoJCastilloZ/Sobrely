import {
  claveDeFusion,
  editorDocumentReducer,
  esAccionDelServidor,
  MAX_HISTORIAL,
  VENTANA_FUSION_MS,
  type EditorAction,
  type EditorDocument,
} from "./editor-document";

/**
 * Historial de deshacer/rehacer sobre el documento del editor.
 *
 * Se implementa como una envoltura del reducer del documento, no dentro de él:
 * el documento no tiene por qué saber que existe un historial, y así se prueba
 * cada cosa por separado.
 *
 * `guardado` es el documento tal como está en el servidor. `dirty` se deriva
 * comparándolo con el presente, no con una bandera: así deshacer hasta volver
 * al punto guardado deja de marcar cambios pendientes, que es lo que el usuario
 * espera cuando pulsa `⌘Z` hasta el principio.
 */
export type EditorHistoryState = {
  presente: EditorDocument;
  pasado: EditorDocument[];
  futuro: EditorDocument[];
  /** El documento tal como lo tiene el servidor. */
  guardado: EditorDocument;
  /** Para fusionar pulsaciones seguidas en un solo paso. */
  ultimaClave: string | null;
  ultimaMarca: number;
};

export type HistoryAction =
  | { type: "aplicar"; action: EditorAction; ahora?: number }
  | { type: "deshacer" }
  | { type: "rehacer" }
  /** Tras un guardado con éxito: el presente pasa a ser la verdad del servidor. */
  | { type: "marcarGuardado"; documento: EditorDocument };

export function estadoInicial(doc: EditorDocument): EditorHistoryState {
  return {
    presente: doc,
    pasado: [],
    futuro: [],
    guardado: doc,
    ultimaClave: null,
    ultimaMarca: 0,
  };
}

export function editorHistoryReducer(
  state: EditorHistoryState,
  action: HistoryAction,
): EditorHistoryState {
  switch (action.type) {
    case "aplicar": {
      const siguiente = editorDocumentReducer(state.presente, action.action);

      // El reducer devuelve el MISMO objeto cuando la acción no cambió nada
      // (reordenar sobre sí mismo, borrar un id que no existe). Apilar ahí
      // metería pasos vacíos que el usuario tendría que deshacer dos veces.
      if (siguiente === state.presente) return state;

      // Lo que viene del servidor no es una edición: no entra al historial.
      //
      // Y NO marca todo como guardado: si el usuario siguió escribiendo
      // mientras el guardado estaba en vuelo, esos cambios siguen pendientes.
      // El punto guardado lo fija `marcarGuardado` con el documento que el
      // servidor realmente tiene, no con el que hay en pantalla.
      if (esAccionDelServidor(action.action)) {
        const guardado = editorDocumentReducer(state.guardado, action.action);
        return { ...state, presente: siguiente, guardado };
      }

      const ahora = action.ahora ?? Date.now();
      const clave = claveDeFusion(action.action);
      const fusiona =
        clave !== null &&
        clave === state.ultimaClave &&
        ahora - state.ultimaMarca < VENTANA_FUSION_MS &&
        state.pasado.length > 0;

      // Al fusionar NO se apila: el paso anterior sigue siendo el punto de
      // retorno, así `⌘Z` deshace la palabra entera y no una letra.
      const pasado = fusiona
        ? state.pasado
        : [...state.pasado, state.presente].slice(-MAX_HISTORIAL);

      return {
        ...state,
        presente: siguiente,
        pasado,
        // Cualquier edición nueva invalida el futuro: es la semántica estándar
        // de deshacer y evita mezclar dos líneas de tiempo.
        futuro: [],
        ultimaClave: clave,
        ultimaMarca: ahora,
      };
    }

    case "deshacer": {
      if (state.pasado.length === 0) return state;
      const anterior = state.pasado[state.pasado.length - 1];
      return {
        ...state,
        presente: anterior,
        pasado: state.pasado.slice(0, -1),
        futuro: [state.presente, ...state.futuro],
        // Se corta la fusión: lo que se teclee después empieza un paso nuevo.
        ultimaClave: null,
        ultimaMarca: 0,
      };
    }

    case "rehacer": {
      if (state.futuro.length === 0) return state;
      const siguiente = state.futuro[0];
      return {
        ...state,
        presente: siguiente,
        pasado: [...state.pasado, state.presente].slice(-MAX_HISTORIAL),
        futuro: state.futuro.slice(1),
        ultimaClave: null,
        ultimaMarca: 0,
      };
    }

    case "marcarGuardado":
      // Fija el punto de referencia SIN tocar el presente: si el usuario editó
      // durante el guardado, esas ediciones se conservan y siguen marcadas
      // como pendientes. El historial sobrevive: se puede deshacer algo ya
      // guardado y volver a guardar.
      return { ...state, guardado: action.documento };
  }
}

export const puedeDeshacer = (s: EditorHistoryState) => s.pasado.length > 0;
export const puedeRehacer = (s: EditorHistoryState) => s.futuro.length > 0;

/**
 * ¿Hay cambios sin guardar? Se compara contra el documento del servidor en vez
 * de llevar una bandera, para que deshacer hasta el principio deje de marcar
 * pendientes. Los documentos son de unos pocos KB, así que el costo es trivial
 * comparado con equivocarse.
 */
export function hayCambiosSinGuardar(s: EditorHistoryState): boolean {
  return JSON.stringify(s.presente) !== JSON.stringify(s.guardado);
}
