"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calcularVencimiento,
  generarToken,
  hashToken,
  MAX_LIGAS_VIGENTES,
} from "@/lib/previews/token";

/**
 * Crear y revocar ligas de vista previa (Fase 4). Contrato C5 v2 de
 * `COORDINACION.md`: Codex pone el botón en el editor y llama a estas dos
 * acciones; no lee tablas ni tokens.
 *
 * Patrón de las dos: la sesión del anfitrión comprueba que la invitación es
 * SUYA (con RLS); solo entonces el cliente de servicio toca `invitation_previews`,
 * que nadie más puede leer ni escribir. El anfitrión nunca llega a la tabla.
 */
export type CrearVistaPreviaResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; error: string };

export type RevocarVistasPreviasResult =
  | { ok: true; revocadas: number }
  | { ok: false; error: string };

const ERROR_NO_DISPONIBLE =
  "La vista previa todavía no está disponible. Inténtalo más tarde.";

/** Origen público del sitio: la variable de entorno y, si falta, la petición. */
async function origenDelSitio(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** ¿La invitación es de la persona con sesión? `null` si no hay sesión. */
async function esDelAnfitrion(invitationId: string): Promise<boolean | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("invitations")
    .select("id")
    .eq("id", invitationId)
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Crea una liga NUEVA y devuelve la URL absoluta, lista para copiar.
 *
 * Cada llamada crea otra: el token solo existe en claro en este instante (en la
 * base queda su hash), así que no hay forma de volver a mostrar una liga vieja.
 * Por eso no existe un «obtener o crear». Máximo `MAX_LIGAS_VIGENTES` vigentes
 * por invitación, para que un clic repetido no llene la tabla.
 */
export async function crearVistaPrevia(
  invitationId: string,
): Promise<CrearVistaPreviaResult> {
  const suya = await esDelAnfitrion(invitationId);
  if (suya === null) return { ok: false, error: "Sesión expirada." };
  if (!suya) return { ok: false, error: "No tienes acceso a esta invitación." };

  const admin = createAdminClient();
  const ahora = new Date();

  const { count, error: errConteo } = await admin
    .from("invitation_previews")
    .select("id", { count: "exact", head: true })
    .eq("invitation_id", invitationId)
    .is("revoked_at", null)
    .gt("expires_at", ahora.toISOString());
  if (errConteo) {
    // Lo más probable: la migración 0060 aún no está aplicada. El código puede
    // desplegarse antes; no se rompe nada, solo se avisa.
    console.error("[vista-previa] no se pudo contar las ligas:", errConteo.message);
    return { ok: false, error: ERROR_NO_DISPONIBLE };
  }
  if ((count ?? 0) >= MAX_LIGAS_VIGENTES) {
    return {
      ok: false,
      error: `Ya tienes ${MAX_LIGAS_VIGENTES} ligas de vista previa vigentes. Revoca las que no uses.`,
    };
  }

  const token = generarToken();
  const expiresAt = calcularVencimiento(ahora);

  // Se comprueban las FILAS: un `insert` que no escribe nada puede devolver
  // `error: null`, y una liga que no existe no debe entregarse como si sirviera.
  const { data: filas, error: errInsert } = await admin
    .from("invitation_previews")
    .insert({
      invitation_id: invitationId,
      token_hash: hashToken(token),
      expires_at: expiresAt.toISOString(),
    })
    .select("id");
  if (errInsert || !filas || filas.length === 0) {
    console.error(
      "[vista-previa] no se pudo crear la liga:",
      errInsert?.message ?? "0 filas",
    );
    return { ok: false, error: ERROR_NO_DISPONIBLE };
  }

  return {
    ok: true,
    url: `${await origenDelSitio()}/vista-previa/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

/** Revoca TODAS las ligas de la invitación que sigan sin revocar. */
export async function revocarVistasPrevias(
  invitationId: string,
): Promise<RevocarVistasPreviasResult> {
  const suya = await esDelAnfitrion(invitationId);
  if (suya === null) return { ok: false, error: "Sesión expirada." };
  if (!suya) return { ok: false, error: "No tienes acceso a esta invitación." };

  const admin = createAdminClient();
  const { data: filas, error } = await admin
    .from("invitation_previews")
    .update({ revoked_at: new Date().toISOString() })
    .eq("invitation_id", invitationId)
    .is("revoked_at", null)
    .select("id");
  if (error) {
    console.error("[vista-previa] no se pudo revocar:", error.message);
    return { ok: false, error: ERROR_NO_DISPONIBLE };
  }
  return { ok: true, revocadas: filas?.length ?? 0 };
}
