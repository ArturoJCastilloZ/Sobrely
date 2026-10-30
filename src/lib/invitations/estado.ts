/**
 * Estado de una invitación tal como lo ve el ANFITRIÓN en el panel.
 *
 * Vive en un módulo SIN "use client" a propósito: lo usan la tarjeta del
 * dashboard (Client Component) y el panel del evento (Server Component). Si
 * viviera en el archivo de la tarjeta, el servidor recibiría `estadoDeInvitacion`
 * como referencia de cliente y llamarlo tronaría con «Attempted to call
 * estadoDeInvitacion() from the server but estadoDeInvitacion is on the client»
 * (así estuvo roto el panel del evento desde 1ef7915).
 *
 * `caducada` no es un cuarto valor de la BD: es la combinación
 * `is_published = true` + entitlement NO vigente. Ese caso existe de verdad en
 * producción (dos invitaciones el 2026-09-09, demo Free vencida el 2026-08-26)
 * y hasta ahora el panel lo pintaba «Publicada», así que el anfitrión creía
 * que su enlace funcionaba mientras `get_public_invitation` no lo servía.
 */
export type EstadoDeInvitacion = "borrador" | "publicada" | "caducada";

/**
 * Decisión PURA del estado. La vigencia la resuelve la BD
 * (`is_entitlement_active`, migración 0013 — que ya contempla el comp de
 * admin), y esto solo la combina con `is_published`.
 *
 * `entitlementActive === null` significa «no se pudo resolver» (RPC caída, sin
 * permiso). Ahí NO se marca «Caducada»: gritarle a un anfitrión que su enlace
 * está roto cuando quizá está vivo es peor que callarse, así que se conserva la
 * lectura conservadora («Publicada»). Solo un `false` explícito —la respuesta
 * de la BD— degrada el estado.
 */
export function estadoDeInvitacion(params: {
  isPublished: boolean;
  entitlementActive: boolean | null;
}): EstadoDeInvitacion {
  if (!params.isPublished) return "borrador";
  if (params.entitlementActive === false) return "caducada";
  return "publicada";
}

/** Texto del badge, en el tono del resto del panel. */
export const ETIQUETA_DE_ESTADO: Record<EstadoDeInvitacion, string> = {
  borrador: "Borrador",
  publicada: "Publicada",
  caducada: "Caducada",
};

/**
 * Por qué está caducada y qué hacer, en una línea. El badge solo cambia la
 * palabra; sin esto el anfitrión ve «Caducada» y no sabe que sus invitados no
 * están viendo la invitación.
 *
 * El texto dice «un aviso» y no «un error» a propósito: desde el mismo cambio
 * que añadió este estado, quien abre el enlace ve la pantalla «Esta invitación
 * ha caducado» en vez del 404 genérico. Si dijera «no pueden abrirla» estaría
 * describiendo la conducta ANTERIOR.
 */
export const AVISO_DE_CADUCADA =
  "Tu plan venció: quien abra el enlace verá un aviso de que la invitación caducó. Renueva para reactivarla.";
