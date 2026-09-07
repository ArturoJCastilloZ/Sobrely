import { arrayMove } from "@dnd-kit/sortable";

import { defaultConfigFor, type ModuleType } from "@/lib/modules/types";
import type { ThemeConfig } from "@/lib/theme/theme";
import type { EditorInvitation, EditorModule } from "./editor-types";

/**
 * El documento del editor: UNA sola cosa que se versiona.
 *
 * Antes eran tres `useState` independientes (`invitation`, `modules`, `theme`)
 * más `dirty` y `selectedId` sueltos. Con el estado repartido no hay nada que
 * deshacer: un `⌘Z` tendría que capturar los tres a la vez y ninguno sabe de
 * los otros. Unificarlos es la precondición del historial, no una preferencia
 * de estilo.
 *
 * La SELECCIÓN queda deliberadamente FUERA del documento: seleccionar otro
 * módulo no es una edición, y meterla dentro llenaría la pila de deshacer con
 * pasos que el usuario no reconoce como cambios.
 */
export type EditorDocument = {
  invitation: EditorInvitation;
  modules: EditorModule[];
  theme: ThemeConfig;
};

export type EditorAction =
  | { type: "reorder"; activeId: string; overId: string }
  | { type: "addModule"; moduleType: ModuleType; id: string }
  | { type: "deleteModule"; id: string }
  | { type: "toggleVisible"; id: string; visible: boolean }
  | { type: "updateConfig"; id: string; patch: Record<string, unknown> }
  | { type: "updateSettings"; patch: Partial<EditorInvitation> }
  | { type: "updateTheme"; patch: Partial<ThemeConfig> }
  | { type: "clearAnimationOverrides" }
  /**
   * Tras guardar, los módulos nuevos dejan de ser `tmp-*` y pasan a tener su
   * uuid real. Se remapea SOLO el id, nunca el contenido: reemplazar los
   * módulos enteros con lo que devolvió el servidor pisaría cualquier edición
   * hecha mientras el guardado estaba en vuelo. NO es una edición del usuario.
   */
  | { type: "remapIds"; mapa: Record<string, string> }
  /** Verdad del servidor tras publicar/despublicar. NO es una edición. */
  | { type: "setPublished"; published: boolean };

/** `sort_order` se deriva SIEMPRE de la posición; nunca se edita a mano. */
function reindex(modules: EditorModule[]): EditorModule[] {
  return modules.map((m, i) => ({ ...m, sort_order: i }));
}

export function editorDocumentReducer(
  doc: EditorDocument,
  action: EditorAction,
): EditorDocument {
  switch (action.type) {
    case "reorder": {
      const from = doc.modules.findIndex((m) => m.id === action.activeId);
      const to = doc.modules.findIndex((m) => m.id === action.overId);
      // Devolver el MISMO objeto cuando no hay cambio importa: así el
      // historial sabe que no pasó nada y no apila un paso vacío.
      if (from === -1 || to === -1 || from === to) return doc;
      return { ...doc, modules: reindex(arrayMove(doc.modules, from, to)) };
    }

    case "addModule": {
      const nuevo: EditorModule = {
        id: action.id,
        module_type: action.moduleType,
        sort_order: doc.modules.length,
        is_visible: true,
        config: defaultConfigFor(action.moduleType),
      };
      return { ...doc, modules: reindex([...doc.modules, nuevo]) };
    }

    case "deleteModule": {
      if (!doc.modules.some((m) => m.id === action.id)) return doc;
      return {
        ...doc,
        modules: reindex(doc.modules.filter((m) => m.id !== action.id)),
      };
    }

    case "toggleVisible":
      return {
        ...doc,
        modules: doc.modules.map((m) =>
          m.id === action.id ? { ...m, is_visible: action.visible } : m,
        ),
      };

    case "updateConfig":
      return {
        ...doc,
        modules: doc.modules.map((m) =>
          m.id === action.id ? { ...m, config: { ...m.config, ...action.patch } } : m,
        ),
      };

    case "updateSettings":
      return { ...doc, invitation: { ...doc.invitation, ...action.patch } };

    case "updateTheme":
      return { ...doc, theme: { ...doc.theme, ...action.patch } };

    case "clearAnimationOverrides":
      return {
        ...doc,
        modules: doc.modules.map((m) => {
          if (!("animation" in m.config)) return m;
          const config = { ...m.config };
          delete config.animation;
          return { ...m, config };
        }),
      };

    case "remapIds": {
      const cambia = doc.modules.some((m) => action.mapa[m.id]);
      if (!cambia) return doc;
      return {
        ...doc,
        modules: doc.modules.map((m) =>
          action.mapa[m.id] ? { ...m, id: action.mapa[m.id] } : m,
        ),
      };
    }

    case "setPublished":
      return {
        ...doc,
        invitation: { ...doc.invitation, is_published: action.published },
      };
  }
}

/**
 * Acciones que NO son ediciones del usuario: vienen del servidor y no deben
 * entrar al historial. Deshacer un "se publicó" no despublicaría nada — solo
 * mentiría sobre el estado real.
 */
export function esAccionDelServidor(a: EditorAction): boolean {
  return a.type === "remapIds" || a.type === "setPublished";
}

/**
 * Clave de fusión para no inundar la pila al teclear.
 *
 * Escribir "Ana & Carlos" en el título dispara una acción por tecla. Sin
 * fusionar, `⌘Z` borraría una letra por pulsación y el historial sería
 * inservible. Dos acciones consecutivas con la MISMA clave y dentro de la
 * ventana de tiempo se colapsan en un solo paso.
 *
 * `null` = nunca se fusiona: agregar, borrar y reordenar son pasos discretos
 * que el usuario sí reconoce uno por uno.
 */
export function claveDeFusion(a: EditorAction): string | null {
  switch (a.type) {
    case "updateConfig":
      // Por módulo Y por campo: cambiar el título y luego el subtítulo del
      // mismo módulo son dos pasos, no uno.
      return `config:${a.id}:${Object.keys(a.patch).sort().join(",")}`;
    case "updateSettings":
      return `settings:${Object.keys(a.patch).sort().join(",")}`;
    case "updateTheme":
      return `theme:${Object.keys(a.patch).sort().join(",")}`;
    default:
      return null;
  }
}

/** Ventana de fusión. Por encima, el usuario ya hizo una pausa deliberada. */
export const VENTANA_FUSION_MS = 700;

/** Tope de la pila. Un editor de invitaciones no necesita más, y evita que
 *  una sesión larga se coma la memoria del navegador. */
export const MAX_HISTORIAL = 50;
