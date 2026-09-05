/**
 * Constantes del PIN, aparte de `pin.ts` a propósito.
 *
 * `pin.ts` importa `node:crypto` y por eso NO se puede importar desde un
 * componente cliente. Pero el formulario del PIN necesita saber cuántos dígitos
 * pedir y cuántos intentos hay. Metiendo esos números aquí, la UI los importa
 * sin arrastrar `crypto` al bundle del navegador — y siguen teniendo una sola
 * definición, que es lo que importa: si el largo cambia, cambia en los dos
 * lados o en ninguno.
 */

/** Largo del PIN. Seis dígitos = un millón de combinaciones. */
export const PIN_LENGTH = 6;

/**
 * Intentos fallidos antes de bloquear.
 *
 * Cinco es suficiente para el que se equivoca tecleando y ridículo para el que
 * quiere probar un millón de PIN: con el bloqueo, agotar el espacio tomaría
 * siglos.
 */
export const MAX_FAILED_ATTEMPTS = 5;

/** Cuánto dura el bloqueo una vez que se agotan los intentos, en minutos. */
export const LOCK_MINUTES = 15;
