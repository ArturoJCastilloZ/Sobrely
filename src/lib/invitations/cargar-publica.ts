import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  GuestInvitationBundle,
  PublicInvitation,
} from "@/lib/invitations/public-types";

/**
 * Lecturas públicas de una invitación, compartidas por la página, su
 * `generateMetadata` y su `opengraph-image`.
 *
 * `cache` hace que la metadata y la página compartan un solo viaje a la base
 * dentro de la misma petición. La imagen OG es otra petición (su propia ruta),
 * así que hace su propia lectura.
 *
 * Ambas RPC devuelven `null` si la invitación no existe, no está publicada o
 * (en `/g`) el token no es de nadie: quien llama no puede distinguir los casos.
 */
export const cargarInvitacionPublica = cache(
  async (username: string, slug: string): Promise<PublicInvitation | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_invitation", {
      p_username: username,
      p_slug: slug,
    });
    if (error || !data) return null;
    return data as PublicInvitation;
  },
);

export const cargarInvitacionDeInvitado = cache(
  async (token: string): Promise<GuestInvitationBundle | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_guest_invitation", {
      p_token: token,
    });
    if (error || !data) return null;
    return data as GuestInvitationBundle;
  },
);
