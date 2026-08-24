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
  /**
   * Código del plan efectivo, expuesto por las RPC públicas. `null` cuando no
   * hay entitlement vigente; el front cae a branding completo (fail-safe).
   */
  plan_code: string | null;
  modules: PublicModule[];
};

/** Datos del invitado nominal expuestos en su página personalizada (modo lista). */
export type GuestForInvitation = {
  id: string;
  name: string;
  max_guests: number;
  status: "pending" | "confirmed" | "declined";
  confirmed_count: number | null;
  message: string | null;
  checked_in: boolean;
};

/** Payload de la RPC `get_guest_invitation`. */
export type GuestInvitationBundle = {
  invitation: PublicInvitation;
  guest: GuestForInvitation;
};
