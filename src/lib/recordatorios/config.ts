/**
 * Configuración del envío. FALLA CERRADO: si falta cualquier pieza, no se envía.
 *
 * Tres estados, y el orden importa:
 *   - `apagado`   `REMINDERS_ENABLED` no es exactamente "1". Es el estado de
 *                 fábrica: desplegar este código no manda un solo correo.
 *   - `invalido`  está encendido pero falta algo. Se dice QUÉ falta (nombres de
 *                 variables, nunca valores) para que no sea un fallo mudo.
 *   - `listo`     todo presente; `seco` si `REMINDERS_DRY_RUN` es "1": cuenta a
 *                 quién se le escribiría sin enviar nada.
 */
export type ConfigRecordatorios =
  | { estado: "apagado" }
  | { estado: "invalido"; falta: string[] }
  | {
      estado: "listo";
      seco: boolean;
      origen: string;
      secreto: string;
      de: string;
      apiKey: string;
      apiUrl: string | undefined;
    };

const MIN_SECRETO = 32;

export function leerConfiguracion(
  env: Record<string, string | undefined>,
): ConfigRecordatorios {
  if (env.REMINDERS_ENABLED !== "1") return { estado: "apagado" };

  const seco = env.REMINDERS_DRY_RUN === "1";
  const falta: string[] = [];

  const origen = (env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  if (!origen) falta.push("NEXT_PUBLIC_SITE_URL");

  const secreto = env.REMINDER_SECRET ?? "";
  if (secreto.length < MIN_SECRETO) falta.push(`REMINDER_SECRET (mínimo ${MIN_SECRETO} caracteres)`);

  // En corrida en seco no se necesita ni la llave ni el remitente: no se envía.
  const de = env.REMINDER_FROM ?? "";
  const apiKey = env.RESEND_API_KEY ?? "";
  if (!seco) {
    if (!de) falta.push("REMINDER_FROM");
    if (!apiKey) falta.push("RESEND_API_KEY");
  }

  if (falta.length > 0) return { estado: "invalido", falta };
  return {
    estado: "listo",
    seco,
    origen,
    secreto,
    de,
    apiKey,
    apiUrl: env.RESEND_API_URL || undefined,
  };
}
