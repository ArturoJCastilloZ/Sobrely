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

/** `vigente | caducada | inexistente`, según la RPC de la migración `0054`. */
export type EstadoPublico = "vigente" | "caducada" | "inexistente";

/**
 * ¿Existe la invitación y sólo le caducó el acceso, o de verdad no existe?
 *
 * Hace falta porque `get_public_invitation` devuelve `null` en los DOS casos, y
 * porque `get_guest_invitation` (0012) NO filtra `is_entitlement_active`: en
 * `/g/<token>` es la única forma de saber si la invitación sigue vigente.
 *
 * DEGRADA A LO SEGURO a propósito: si la RPC no existe (migración `0054` sin
 * aplicar) o falla, devuelve `"inexistente"`. En la página pública eso es el
 * 404 de siempre; en la tarjeta de `/g` es la genérica.
 */
export const cargarEstadoPublico = cache(
  async (username: string, slug: string): Promise<EstadoPublico> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "estado_publico_de_invitacion",
      { p_username: username, p_slug: slug },
    );
    if (error) return "inexistente";
    return data === "vigente" || data === "caducada" ? data : "inexistente";
  },
);

/**
 * El bundle de `/g/<token>` solo si su invitación está VIGENTE; si no, `null`.
 *
 * Para la tarjeta al compartir (metadata e imagen OG): una invitación caducada
 * tiene que dar la genérica de Sobrely, igual que un token desconocido, porque
 * la RPC del invitado la devuelve aunque el entitlement haya vencido.
 */
export async function cargarInvitacionDeInvitadoParaCompartir(
  token: string,
): Promise<GuestInvitationBundle | null> {
  const bundle = await cargarInvitacionDeInvitado(token);
  if (!bundle) return null;
  const { owner_username, slug } = bundle.invitation;
  const estado = await cargarEstadoPublico(owner_username, slug);
  return estado === "vigente" ? bundle : null;
}
