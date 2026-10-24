import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearEnviadorResend } from "@/lib/recordatorios/resend";
import {
  ALERTA_ENFRIAMIENTO_MS,
  debeAlertar,
  filtrarContexto,
  huellaDeError,
  limpiarMensaje,
  superaTopeDeErrores,
  type OrigenError,
  type Severidad,
} from "./regla";

/**
 * Anota un error en `error_events` (T04) y, si es crítico, avisa por correo.
 *
 * Mejor esfuerzo, como el embudo: NUNCA lanza ni retrasa de forma notable la
 * acción que falló. Quien lo llama ya está manejando un error; el registro no
 * puede añadir otro.
 *
 * El aviso por correo falla CERRADO: sin `ALERTAS_ENABLED=1`, `ALERTAS_EMAIL`,
 * `RESEND_API_KEY` y `REMINDER_FROM` no se manda nada y el error igual queda en
 * la tabla y en `/admin/errores`.
 */
export async function registrarError(
  origen: OrigenError,
  error: unknown,
  opciones?: { severidad?: Severidad; contexto?: Record<string, unknown> },
): Promise<void> {
  try {
    const severidad = opciones?.severidad ?? "aviso";
    const mensaje = limpiarMensaje(error);
    const huella = huellaDeError(origen, mensaje);
    const contexto = filtrarContexto(opciones?.contexto);
    const admin = createAdminClient();

    const ahora = Date.now();
    const haceUnMinuto = new Date(ahora - 60_000).toISOString();
    const { count: recientes } = await admin
      .from("error_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", haceUnMinuto);
    if (superaTopeDeErrores(recientes ?? 0)) return;

    const { data: fila, error: errInsert } = await admin
      .from("error_events")
      .insert({ origen, severidad, huella, mensaje, contexto })
      .select("id")
      .single();
    if (errInsert || !fila) {
      console.error("[errores] no se pudo registrar:", errInsert?.message);
      return;
    }

    if (severidad !== "critico") return;

    const haceUnaHora = new Date(ahora - ALERTA_ENFRIAMIENTO_MS).toISOString();
    const [{ count: previas }, { count: enLaHora }] = await Promise.all([
      admin
        .from("error_events")
        .select("id", { count: "exact", head: true })
        .eq("huella", huella)
        .gte("alertado_en", haceUnaHora),
      admin
        .from("error_events")
        .select("id", { count: "exact", head: true })
        .gte("alertado_en", haceUnaHora),
    ]);
    if (
      !debeAlertar({
        severidad,
        alertaPrevia: (previas ?? 0) > 0,
        alertasEnLaUltimaHora: enLaHora ?? 0,
      })
    ) {
      return;
    }

    const enviado = await enviarAlerta({ origen, mensaje, contexto, huella, ahora });
    if (enviado) {
      // filas-no-verificadas: marca informativa del aviso; 0 filas solo
      // significaría que el renglón ya no existe y el aviso ya salió.
      await admin
        .from("error_events")
        .update({ alertado_en: new Date().toISOString() })
        .eq("id", fila.id as string);
    }
  } catch (e) {
    console.error("[errores] fallo inesperado al registrar:", e instanceof Error ? e.message : e);
  }
}

async function enviarAlerta(d: {
  origen: OrigenError;
  mensaje: string;
  contexto: Record<string, unknown>;
  huella: string;
  ahora: number;
}): Promise<boolean> {
  const env = process.env;
  if (env.ALERTAS_ENABLED !== "1") return false;
  const para = env.ALERTAS_EMAIL ?? "";
  const apiKey = env.RESEND_API_KEY ?? "";
  const de = env.REMINDER_FROM ?? "";
  if (!para || !apiKey || !de) {
    console.error("[errores] alertas encendidas pero faltan ALERTAS_EMAIL, RESEND_API_KEY o REMINDER_FROM");
    return false;
  }
  const sitio = (env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const detalle = Object.entries(d.contexto)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const texto = [
    `Error crítico en ${d.origen}.`,
    "",
    d.mensaje,
    detalle ? `\n${detalle}` : "",
    "",
    sitio ? `Detalle y repeticiones: ${sitio}/admin/errores` : "",
    "Este aviso se manda una vez por hora por cada causa distinta.",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
  const enviar = crearEnviadorResend({
    apiKey,
    apiUrl: env.RESEND_API_URL || undefined,
  });
  const r = await enviar({
    para,
    de,
    asunto: `[Sobrely] Error crítico: ${d.origen}`,
    html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</pre>`,
    texto,
    llaveIdempotencia: `error-${d.huella.slice(0, 24)}-${Math.floor(d.ahora / ALERTA_ENFRIAMIENTO_MS)}`,
  });
  if (!r.ok) console.error("[errores] no se pudo mandar la alerta:", r.error);
  return r.ok;
}
