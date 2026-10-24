import type { Instrumentation } from "next";

/**
 * Errores del servidor que nadie atrapó (T04). Next llama a `onRequestError`
 * con cada uno; aquí se anotan en `error_events`.
 *
 * Los errores que el código SÍ atrapa (p. ej. un webhook que responde 500) no
 * llegan hasta aquí: esos se registran donde ocurren con `registrarError`.
 *
 * Se usa `context.routePath` (el patrón, p. ej. `/g/[token]`) y nunca
 * `request.path`: la URL pedida puede llevar un token de invitado.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, _request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registrarError } = await import("@/lib/errores/registrar");
  const { clasificarRuta, esRuidoDeCliente } = await import("@/lib/errores/regla");
  if (esRuidoDeCliente(err instanceof Error ? err.message : String(err))) return;
  const { origen, severidad } = clasificarRuta(context.routePath);
  await registrarError(origen, err, {
    severidad,
    contexto: { ruta: context.routePath },
  });
};
