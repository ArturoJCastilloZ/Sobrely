/**
 * La DIRECCION de lo que hay seleccionado en el editor.
 *
 * Se DERIVA del documento y del contrato del renderer; no se guarda nada nuevo
 * en la base para poder seleccionar. Es la decision del §4.A del plan y es lo
 * que hace que la Fase 2 no necesite ni una migracion ni toque las 18
 * invitaciones vivas: la seleccion es estado de INTERFAZ.
 *
 * `bloque` es exactamente el valor del atributo `data-bloque` que el renderer
 * emite: por NOMBRE en la portada (`title` | `subtitle` | `cta`) y por INDICE
 * (`"0"`, `"1"`, ...) en las otras once secciones. Se eligio no unificarlos
 * porque cambiar el de la portada moveria los `textOffsets` ya guardados.
 */
export type Seleccion =
  | null
  | { tipo: "modulo"; moduloId: string }
  | { tipo: "bloque"; moduloId: string; bloque: string };

/** El modulo al que apunta la seleccion, sea del nivel que sea. */
export function moduloDe(sel: Seleccion): string | null {
  return sel === null ? null : sel.moduloId;
}

/** El bloque, o `null` si la seleccion es de modulo o vacia. */
export function bloqueDe(sel: Seleccion): string | null {
  return sel !== null && sel.tipo === "bloque" ? sel.bloque : null;
}

/**
 * Igualdad por VALOR.
 *
 * Hace falta porque la seleccion se reconstruye en cada clic: sin comparar por
 * valor, volver a pulsar el mismo bloque crearia un objeto nuevo, cambiaria el
 * contexto y repintaria el riel y el inspector para nada.
 */
export function mismaSeleccion(a: Seleccion, b: Seleccion): boolean {
  if (a === null || b === null) return a === b;
  if (a.tipo !== b.tipo || a.moduloId !== b.moduloId) return false;
  return a.tipo === "bloque" && b.tipo === "bloque" ? a.bloque === b.bloque : true;
}

/**
 * Sube un nivel: bloque -> su modulo -> nada. Es lo que hace `Esc`.
 *
 * Devolver el MISMO valor cuando ya no se puede subir mas importa: el provider
 * compara por valor y asi un `Esc` de mas no dispara un repintado inutil.
 */
export function subirUnNivel(sel: Seleccion): Seleccion {
  if (sel === null) return null;
  if (sel.tipo === "bloque") return { tipo: "modulo", moduloId: sel.moduloId };
  return null;
}
