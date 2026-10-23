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
 * Este módulo es SOLO DEL SERVIDOR (importa `node:crypto`). La vigencia, el
 * estado de una liga y los días restantes viven en `vigencia.ts`, que es puro y
 * seguro para el navegador; se re-exportan aquí para que las importaciones
 * existentes no cambien.
 */
export {
  calcularVencimiento,
  diasRestantes,
  estadoDeLiga,
  MAX_LIGAS_VIGENTES,
  textoDeDias,
  VIGENCIA_DIAS,
  type EstadoDeLiga,
} from "@/lib/previews/vigencia";

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
