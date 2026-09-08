import type { ModuleType } from "@/lib/modules/types";

export type EditorModule = {
  /** Real DB uuid, or a "tmp-*" id for modules not yet persisted. */
  id: string;
  module_type: ModuleType;
  sort_order: number;
  is_visible: boolean;
  config: Record<string, unknown>;
};

// NOTA: la `version` del bloqueo optimista (`0027`) NO vive aquí a propósito.
// Este tipo es el documento EDITABLE, y el token no se edita: metido aquí
// quedaría rancio tras cada guardado (nadie lo despacha al reducer) y sería
// una trampa esperando a que alguien lo lea. Viaja como prop aparte.
export type EditorInvitation = {
  id: string;
  title: string;
  slug: string;
  event_type: string;
  event_date: string; // ISO or ""
  is_published: boolean;
  rsvp_mode: "open" | "guest_list";
};
