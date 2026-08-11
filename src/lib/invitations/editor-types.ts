import type { ModuleType } from "@/lib/modules/types";

export type EditorModule = {
  /** Real DB uuid, or a "tmp-*" id for modules not yet persisted. */
  id: string;
  module_type: ModuleType;
  sort_order: number;
  is_visible: boolean;
  config: Record<string, unknown>;
};

export type EditorInvitation = {
  id: string;
  title: string;
  slug: string;
  event_type: string;
  event_date: string; // ISO or ""
  is_published: boolean;
};
