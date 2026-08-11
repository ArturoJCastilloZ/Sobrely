import type { ModuleType } from "@/lib/modules/types";

export type PublicModule = {
  id: string;
  module_type: ModuleType;
  sort_order: number;
  is_visible: boolean;
  config: Record<string, unknown>;
};

export type PublicInvitation = {
  id: string;
  title: string;
  slug: string;
  event_type: string | null;
  event_date: string | null;
  theme_config: Record<string, unknown> | null;
  owner_name: string | null;
  owner_username: string;
  modules: PublicModule[];
};
