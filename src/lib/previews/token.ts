import { createHash, randomBytes } from "node:crypto";

/**
 * Ligas de VISTA PREVIA privada de una invitación (Fase 4).
 *
 * Decisiones del dev (2026-10-23, pedidas por el §34 porque exigen migración):
 *   - el token se guarda como HASH en una tabla aparte, nunca en claro,
 *   - vigencia de 7 días.
 *
 * Por qué hash: la tabla solo la lee el servidor, pero una copia de la base, un
 * log o un volcado no deberían bastar para abrir una invitación ajena. Un token
 * de 256 bits aleatorios no se puede adivinar ni por fuerza bruta, así que un
 * SHA-256 sin sal es suficiente (la sal protege contraseñas de baja entropía,
 * que no es el caso).
 *
 * Este módulo es PURO (salvo el azar de `generarToken`) para poder demostrarlo
 * con pruebas; el acceso a la base vive en `actions.ts` y `resolver.ts`.
 */
export const VIGENCIA_DIAS = 7;
export const MAX_LIGAS_VIGENTES = 10;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** 32 bytes aleatorios en base64url: 43 caracteres, 256 bits de entropía. */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 en hexadecimal (64 caracteres). Es lo único que se guarda. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * ¿Tiene la forma de un token nuestro? Se comprueba ANTES de ir a la base: un
 * valor basura (o un intento de inyección en la ruta) no llega a una consulta.
 * Exactamente 43 caracteres de base64url.
 */
export function tieneFormatoDeToken(valor: unknown): valor is string {
  return typeof valor === "string" && /^[A-Za-z0-9_-]{43}$/.test(valor);
}

export function calcularVencimiento(ahora: Date = new Date()): Date {
  return new Date(ahora.getTime() + VIGENCIA_DIAS * MS_POR_DIA);
}

export type EstadoDeLiga = "vigente" | "vencida" | "revocada";

/**
 * Estado de una liga. La revocación manda sobre el vencimiento: una liga
 * revocada que además venció se reporta como revocada (es lo que el anfitrión
 * hizo). Un vencimiento ILEGIBLE cuenta como vencida: ante la duda, cerrada.
 */
export function estadoDeLiga(
  liga: { expires_at: string; revoked_at: string | null },
  ahora: Date = new Date(),
): EstadoDeLiga {
  if (liga.revoked_at) return "revocada";
  const vence = new Date(liga.expires_at).getTime();
  if (Number.isNaN(vence)) return "vencida";
  return vence > ahora.getTime() ? "vigente" : "vencida";
}

/** Días enteros que le quedan a una liga (0 si venció). Para el aviso del banner. */
export function diasRestantes(expiresAt: string, ahora: Date = new Date()): number {
  const vence = new Date(expiresAt).getTime();
  if (Number.isNaN(vence)) return 0;
  return Math.max(0, Math.ceil((vence - ahora.getTime()) / MS_POR_DIA));
}
