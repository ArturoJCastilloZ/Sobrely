import { moduleConfigSchemas, type ModuleType } from "@/lib/modules/types";

/**
 * Edición directa de texto sobre el lienzo: las reglas de lo que se puede
 * escribir y de lo que se guarda.
 *
 * ── Por qué esto existe, y por qué es lo primero que se escribió ──────
 *
 * El texto que se teclea aquí acaba en `config` jsonb Y se re-renderiza en la
 * PÁGINA PÚBLICA, que ven invitados que no son el dueño de la invitación. Es
 * decir: es contenido de un usuario mostrado a terceros. Un `contentEditable`
 * sin sanear acepta HTML pegado del portapapeles y lo guardaría tal cual.
 *
 * React escapa el texto al pintarlo, así que esto no es un XSS hoy. Se sanea
 * igualmente por dos razones concretas: guardar marcado en un campo declarado
 * como texto plano corrompe el dato para cualquier consumidor futuro que NO lo
 * escape, y pegar un documento de Word metería cientos de kB de estilos en el
 * jsonb sin que el usuario lo sepa.
 */

/** Un salto de línea en un título no es contenido, es basura del portapapeles. */
const ESPACIOS = /\s+/g;

type NodoZod = {
  maxLength?: number | null;
  def?: { innerType?: NodoZod };
  innerType?: NodoZod;
};

/**
 * El tope de caracteres de un campo, LEÍDO DEL ESQUEMA.
 *
 * Se lee en vez de copiarse a una tabla, y la diferencia importa: si alguien
 * baja `title` de 120 a 80 y aquí hubiera un 120 escrito a mano, el editor
 * dejaría teclear 120 y el GUARDADO fallaría — un fallo que el usuario vería
 * como «no se guarda» sin ninguna pista de por qué.
 *
 * Hay que desenvolver porque los campos van en `.default(...)`, así que el tipo
 * de fuera es `ZodDefault` y no `ZodString`: `maxLength` sale `null` si se
 * pregunta al envoltorio. Medido contra los doce módulos: desenvolviendo salen
 * los valores de verdad (title=120, subtitle=200, ctaLabel=40, message=1000,
 * description=400, venueName=160, address=300, buttonLabel=40).
 *
 * Si un día zod cambia su forma interna, esto devuelve `null` y el llamador
 * degrada a «sin tope» en vez de romperse. Hay prueba que lo fija.
 */
export function topeDeCampo(tipo: ModuleType, campo: string): number | null {
  const shape = (moduleConfigSchemas[tipo] as unknown as {
    shape?: Record<string, NodoZod>;
  }).shape;
  let n: NodoZod | undefined = shape?.[campo];
  for (let i = 0; i < 6 && n; i++) {
    if (typeof n.maxLength === "number") return n.maxLength;
    n = n.def?.innerType ?? n.innerType;
  }
  return null;
}

/**
 * Deja el texto en PLANO y dentro del tope.
 *
 * `contentEditable="plaintext-only"` ya impide pegar marcado en los navegadores
 * que lo soportan, pero esto NO se apoya en eso: el soporte es desigual y el
 * atributo se puede quitar desde la consola. La barrera de verdad es esta
 * función, que corre sobre lo que se va a GUARDAR.
 *
 * Los saltos de línea se colapsan a espacio: ninguno de los campos que se
 * editan en el lienzo es multilínea en el render, así que un salto sólo
 * produciría un texto guardado que no se parece a lo que se ve.
 */
export function sanearTexto(bruto: string, tope: number | null): string {
  const plano = bruto.replace(ESPACIOS, " ").trim();
  return tope === null ? plano : plano.slice(0, tope);
}

/**
 * ¿Qué valor tiene AHORA este campo?
 *
 * Se lee de `config` y no del DOM a propósito. El DOM del bloque puede traer
 * envoltorios que no son el texto: la portada anima su título con `TextReveal`,
 * que lo parte en un `<span>` por letra. Leer `textContent` de ahí devolvería
 * el texto pero editar ESA estructura la destrozaría.
 *
 * Por eso al entrar en edición se sustituye el contenido del bloque por este
 * valor plano, se edita, y al salir React vuelve a montar la estructura buena
 * desde `config`. El DOM es la superficie de edición; `config` es la verdad.
 */
export function valorDeCampo(
  config: Record<string, unknown>,
  campo: string,
): string {
  const v = config[campo];
  return typeof v === "string" ? v : "";
}
