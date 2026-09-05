/**
 * PIN del reporte compartible — normalización, política de bloqueo y hash.
 *
 * Se parte en dos capas a propósito: todo lo que se puede decidir SIN tocar
 * `crypto` vive arriba y es puro (y por lo tanto probado sin BD y sin await);
 * abajo quedan las dos funciones que sí hacen scrypt.
 *
 * Por qué scrypt y no comparar en SQL: `pgcrypto` vive en el schema
 * `extensions` de Supabase y no es visible con `search_path = public` — ese bug
 * ya se pagó en la migración `0002`. Ver la cabecera de `0019`.
 */
import {
  randomBytes,
  randomInt,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * `promisify` colapsa las sobrecargas de `scrypt` y se queda con la de tres
 * argumentos, así que pasarle opciones (el costo `N`) no compila. Se re-tipa a
 * mano con la firma que sí se usa — sin esto habría que renunciar a subir el
 * costo, que es justo lo que protege al PIN.
 */
const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

// Viven en `constants.ts` porque el formulario del PIN los necesita y es un
// componente cliente — importarlos de aquí le metería `node:crypto` al bundle.
// Se re-exportan para que el servidor siga teniendo una sola puerta.
export {
  PIN_LENGTH,
  MAX_FAILED_ATTEMPTS,
  LOCK_MINUTES,
} from "./constants";

// `LOCK_MINUTES` solo se re-exporta: ya no se usa aquí, porque la transición
// que lo consumía se mudó a la RPC de la `0020`.
import { MAX_FAILED_ATTEMPTS, PIN_LENGTH } from "./constants";

/**
 * Parámetros de scrypt. `N` es el costo; 2^15 tarda ~100 ms en un servidor
 * normal, que es imperceptible para quien teclea su PIN una vez y carísimo para
 * quien quiere probar en masa.
 *
 * Se guardan DENTRO del hash (`scrypt$N$r$p$salt$hash`) para poder subirlos
 * después sin invalidar los PIN ya emitidos.
 */
const SCRYPT_N = 32768;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LEN = 32;
const SALT_LEN = 16;

/**
 * Deja el PIN en su forma canónica, o `null` si no es un PIN.
 *
 * La gente teclea espacios y guiones al dictar un número por teléfono
 * ("uno dos tres — cuatro cinco seis"), así que se limpian antes de juzgar.
 * Lo que NO se hace es rescatar algo que no son seis dígitos: un PIN de cinco
 * no es "casi", es otro PIN.
 */
export function normalizePin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const limpio = raw.replace(/[\s-]/g, "");
  if (!/^[0-9]+$/.test(limpio)) return null;
  if (limpio.length !== PIN_LENGTH) return null;
  return limpio;
}

/**
 * PIN nuevo, aleatorio y uniforme.
 *
 * `randomInt` y no `Math.random()`: es la credencial del reporte. Y se permite
 * cualquier combinación, incluidos `000000` y `123456` — filtrar "PIN feos"
 * reduce el espacio de búsqueda, que es justo lo contrario de lo que se busca.
 */
export function generatePin(): string {
  // `randomInt` y no `randomBytes(4) % 1e6`: el módulo sobre 2^32 NO reparte
  // parejo (2^32 no es múltiplo de 10^6), así que unos PIN saldrían más
  // seguido que otros. `randomInt` rechaza y reintenta para que no pase.
  return String(randomInt(0, 10 ** PIN_LENGTH)).padStart(PIN_LENGTH, "0");
}

export type LockState = {
  failedAttempts: number;
  lockedUntil: string | null;
};

/** ¿La liga está bloqueada en este instante? */
export function isLocked(state: LockState, now: Date = new Date()): boolean {
  if (!state.lockedUntil) return false;
  return new Date(state.lockedUntil).getTime() > now.getTime();
}

/** Minutos que faltan para que se levante el bloqueo. Mínimo 1 si sigue vivo. */
export function minutesUntilUnlock(
  state: LockState,
  now: Date = new Date(),
): number {
  if (!isLocked(state, now)) return 0;
  const ms = new Date(state.lockedUntil as string).getTime() - now.getTime();
  return Math.max(1, Math.ceil(ms / 60_000));
}

/**
 * La TRANSICIÓN de estado (cobrar un intento, bloquear, limpiar al acertar)
 * NO vive aquí: vive en la RPC `claim_report_attempt` de la migración `0020`.
 *
 * No es una preferencia de estilo. Hacerlo en TypeScript obliga a leer el
 * contador en una consulta y escribirlo en otra, y entre las dos caben
 * doscientas peticiones concurrentes que leen el mismo cero — el bloqueo nunca
 * se dispara. La atomicidad solo la puede dar la base. Lo que sí se queda de
 * este lado es la POLÍTICA (cuántos intentos, cuántos minutos), que se le pasa
 * a la RPC como parámetros desde `constants.ts`.
 *
 * Lo de abajo son lecturas del estado que la RPC devuelve, no decisiones.
 */

/** Intentos que le quedan antes del bloqueo. Nunca negativo. */
export function attemptsLeft(state: LockState): number {
  return Math.max(0, MAX_FAILED_ATTEMPTS - state.failedAttempts);
}

// ---------------------------------------------------------------------------
// Lo que sí toca `crypto`.
// ---------------------------------------------------------------------------

/** Hashea un PIN ya normalizado. Devuelve `scrypt$N$r$p$salt$hash`. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = (await scrypt(pin, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
    // scrypt con N alto necesita más memoria de la que node da por defecto.
    maxmem: 256 * 1024 * 1024,
  })) as Buffer;
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_r,
    SCRYPT_p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * ¿Este PIN corresponde a este hash?
 *
 * Los parámetros salen del hash guardado, no de las constantes de arriba: un
 * hash viejo tiene que seguir verificando aunque el costo haya subido después.
 *
 * La comparación es de tiempo constante. Un `===` filtraría por cuántos bytes
 * coinciden, y con un PIN de 6 dígitos ese goteo alcanza para acortar la
 * búsqueda de forma seria.
 */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const partes = stored.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;

  const N = Number(partes[1]);
  const r = Number(partes[2]);
  const p = Number(partes[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let salt: Buffer;
  let esperado: Buffer;
  try {
    salt = Buffer.from(partes[4], "base64");
    esperado = Buffer.from(partes[5], "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || esperado.length === 0) return false;

  const key = (await scrypt(pin, salt, esperado.length, {
    N,
    r,
    p,
    maxmem: 256 * 1024 * 1024,
  })) as Buffer;

  // Ya son del mismo largo por construcción, pero timingSafeEqual TIRA si no
  // lo fueran, y una excepción aquí sería un 500 en vez de un "PIN incorrecto".
  if (key.length !== esperado.length) return false;
  return timingSafeEqual(key, esperado);
}
