/**
 * Envío por la API HTTP de Resend, sin SDK: es una sola llamada y un SDK sería
 * una dependencia más en la ruta de salida de correos.
 *
 * `apiUrl` es configurable SOLO para poder apuntar una prueba de extremo a
 * extremo a un servidor local falso; en producción es el de Resend.
 *
 * Lo que este módulo NO hace: no registra la llave, no registra la dirección de
 * la persona ni el cuerpo de la respuesta. Un error se reporta con el código de
 * estado y nada más.
 */
export type Correo = {
  para: string;
  de: string;
  asunto: string;
  html: string;
  texto: string;
  /** Resend la usa para no duplicar si la misma petición llega dos veces. */
  llaveIdempotencia: string;
  cabeceras?: Record<string, string>;
};

export type ResultadoDeEnvio = { ok: true } | { ok: false; error: string };
export type Enviar = (c: Correo) => Promise<ResultadoDeEnvio>;

export function crearEnviadorResend(o: {
  apiKey: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Enviar {
  const base = (o.apiUrl ?? "https://api.resend.com").replace(/\/+$/, "");
  const f = o.fetchImpl ?? fetch;
  const timeout = o.timeoutMs ?? 10_000;

  return async (c) => {
    try {
      const r = await f(`${base}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${o.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": c.llaveIdempotencia,
        },
        body: JSON.stringify({
          from: c.de,
          to: [c.para],
          subject: c.asunto,
          html: c.html,
          text: c.texto,
          headers: c.cabeceras,
        }),
        signal: AbortSignal.timeout(timeout),
      });
      if (r.ok) return { ok: true };
      return { ok: false, error: `Resend respondió ${r.status}` };
    } catch (e) {
      const nombre = e instanceof Error ? e.name : "Error";
      return { ok: false, error: `No se pudo contactar a Resend (${nombre})` };
    }
  };
}
