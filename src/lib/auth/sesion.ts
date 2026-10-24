import type { User } from "@supabase/supabase-js";

/**
 * ¿Esta sesión es de un invitado (sin cuenta)?
 *
 * Supabase marca las sesiones anónimas con `is_anonymous: true`, en el usuario y en
 * el JWT (medido contra una base local). PURO: sin red, para que cualquier sitio del
 * servidor y del cliente pueda preguntarlo con la misma regla.
 *
 * La dirección del error importa: si el campo no viene, se trata como persona
 * REGISTRADA. Nunca al revés: tomar por anónimo a un usuario real le quitaría poder
 * publicar y pagar; tomar por registrado a un anónimo solo lo deja donde ya estaba,
 * porque `setPublished` y la base lo vuelven a rechazar de todos modos.
 */
export function esAnonimo(user: Pick<User, "is_anonymous"> | null | undefined): boolean {
  return user?.is_anonymous === true;
}

/** Cuántas invitaciones puede tener una sesión sin cuenta. Debe coincidir con `0062`. */
export const MAX_INVITACIONES_ANONIMO = 3;
