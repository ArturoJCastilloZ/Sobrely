"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createFromTemplate } from "@/lib/invitations/actions";
import { guardarIntencion } from "@/lib/auth/intencion";
import { rutaInternaSegura } from "@/lib/auth/ruta-interna";
import { esAnonimo } from "@/lib/auth/sesion";

/**
 * Edición sin cuenta. Quien elige una plantilla recibe una sesión anónima de Supabase y
 * edita su borrador; la cuenta se pide al publicar (`setPublished` → `needsAccount`).
 * Los candados reales (tope de borradores, no publicar) viven en la base: ver 0062.
 */

const SLUG = /^[a-z0-9-]{1,80}$/;

export type ResultadoInvitado = { error: string };

/** Origen de la petición, para armar el enlace que vuelve del correo de verificación. */
async function origenActual(): Promise<string> {
  // La variable manda: una cabecera Host/X-Forwarded-Host la controla quien llama, y el
  // enlace del correo no debe depender de ella (misma regla que `getOrigin` en actions.ts).
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Crea (si hace falta) la sesión de invitado y le abre su borrador de la plantilla `slug`.
 * Redirige al editor; solo devuelve algo si falla.
 */
export async function empezarComoInvitado(slug: string): Promise<ResultadoInvitado> {
  if (typeof slug !== "string" || !SLUG.test(slug)) {
    return { error: "No encontramos esa plantilla." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("[invitado] signInAnonymously:", error.status, error.code);
      return { error: "No pudimos abrir el editor. Inténtalo de nuevo en un momento." };
    }
  }

  const { data: plantilla } = await supabase
    .from("templates")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!plantilla) return { error: "No encontramos esa plantilla." };

  // Redirige al editor (lanza NEXT_REDIRECT); un fallo de la base se muestra como error.
  try {
    await createFromTemplate(plantilla.id as string, { reemplazar: true });
  } catch (e) {
    if (e instanceof Error && /LIMITE_ANONIMO_INVITACIONES/.test(e.message)) {
      return {
        error: "Ya tienes 3 invitaciones sin cuenta. Crea tu cuenta para seguir diseñando.",
      };
    }
    throw e;
  }
  return { error: "No pudimos crear tu invitación." };
}

const Correo = z.string().trim().toLowerCase().email().max(254);

/**
 * Convierte la sesión de invitado en cuenta permanente con un correo. Supabase conserva el
 * mismo `user_id`, así que el borrador no se mueve. El correo debe verificarse antes de que
 * la cuenta pueda publicar.
 */
export async function convertirConCorreo(
  correo: string,
  next: string,
): Promise<{ error: string } | { enviado: true }> {
  const parsed = Correo.safeParse(correo);
  if (!parsed.success) return { error: "Escribe un correo válido, como nombre@ejemplo.com." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esAnonimo(user)) {
    return { error: "Tu sesión terminó. Inicia sesión para continuar." };
  }

  const destino = rutaInternaSegura(next);
  await guardarIntencion(destino);
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${await origenActual()}/auth/callback?next=${encodeURIComponent(destino)}` },
  );
  if (error) {
    if (error.code === "email_exists" || error.status === 422) {
      return { error: "Ese correo ya tiene cuenta. Inicia sesión y conservamos tu invitación." };
    }
    if (error.status === 429) {
      return { error: "Pediste demasiados correos. Espera unos minutos e inténtalo de nuevo." };
    }
    console.error("[invitado] updateUser:", error.status, error.code);
    return { error: "No pudimos enviar el correo. Inténtalo de nuevo." };
  }
  return { enviado: true };
}

/** Vincula Google a la sesión de invitado; devuelve la URL de Google a la que ir. */
export async function vincularGoogle(
  next: string,
): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esAnonimo(user)) {
    return { error: "Tu sesión terminó. Inicia sesión para continuar." };
  }
  const destino = rutaInternaSegura(next);
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${await origenActual()}/auth/callback?next=${encodeURIComponent(destino)}`,
    },
  });
  if (error || !data?.url) {
    console.error("[invitado] linkIdentity:", error?.status, error?.code);
    return { error: "No pudimos conectar con Google. Inténtalo de nuevo." };
  }
  return { url: data.url };
}
