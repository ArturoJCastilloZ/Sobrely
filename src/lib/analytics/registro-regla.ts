/**
 * ¿Este retorno de `/auth/callback` es un REGISTRO (evento `sign_up`) y no un
 * inicio de sesión de alguien que ya tenía cuenta? Regla pura, probada aparte.
 *
 * Es registro si:
 *  - un invitado convirtió su sesión (mismo `user.id` que la sesión anónima que
 *    traía: no hubo cambio de usuario), o
 *  - la cuenta es nueva: se creó hace menos de `VENTANA_CUENTA_NUEVA_MS`.
 *
 * Un invitado que entra con una cuenta que YA existía cambia de usuario y su
 * cuenta es vieja: eso es un inicio de sesión, no un registro.
 */
export const VENTANA_CUENTA_NUEVA_MS = 2 * 60 * 1000;

export function decidirRegistro(datos: {
  userId: string;
  creadoEn: string | undefined;
  invitadoId: string | null;
  proveedor: string | undefined;
  ahora: number;
}): { registrar: boolean; metodo: "google" | "correo" } {
  const { userId, creadoEn, invitadoId, proveedor, ahora } = datos;
  const metodo = proveedor === "google" ? "google" : "correo";
  const conversion = invitadoId !== null && invitadoId === userId;
  const creado = creadoEn ? Date.parse(creadoEn) : Number.NaN;
  const nueva = Number.isFinite(creado) && ahora - creado <= VENTANA_CUENTA_NUEVA_MS;
  return { registrar: conversion || nueva, metodo };
}
