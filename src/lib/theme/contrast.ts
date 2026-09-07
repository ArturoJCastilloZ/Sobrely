/**
 * Contraste WCAG para los colores que elige el ANFITRIÓN, no nosotros.
 *
 * El problema que resuelve: los tres botones de acción de la invitación pública
 * pintaban `text-white` sobre `--inv-primary`, y `--inv-primary` sale de un
 * theme pack. Medidos los 20 packs, **11 no llegaban a 4.5:1** — `boda-lujo`,
 * que es el que vende el plan caro, se quedaba en 3.09. El esquema de tema
 * validaba el FORMATO del hex y nunca su legibilidad.
 *
 * Y el arreglo obvio —oscurecer el primario hasta que el blanco cumpla— no
 * alcanza. Se probó: para los pasteles muy claros el oscurecimiento necesario
 * destruye la identidad del pack (`kawaii` #f7a8c4 tendría que irse a #e5105b,
 * de rosa pastel a magenta). Por eso hay DOS tratamientos y no uno.
 */

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const p = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

/** Luminancia relativa de WCAG 2.1 (sRGB linealizado). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** Razón de contraste WCAG entre dos colores. Va de 1 a 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(hexToRgb(a));
  const lb = relativeLuminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Mezcla lineal entre dos colores. `t` = 0 devuelve `from`, 1 devuelve `to`. */
export function mix(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

export const AA_NORMAL = 4.5;
export const WHITE = "#ffffff";

/**
 * Cuánto se puede oscurecer un primario antes de que deje de ser el color del
 * pack. No es una constante de la norma y tampoco es un número elegido a ojo:
 * se midió cuánto necesita oscurecerse CADA uno de los 20 packs, y los datos
 * tienen un salto limpio entre `baby-nubes` (32 %) y `boda-lujo` (19 %).
 * Cualquier umbral dentro de esa banda separa exactamente al mismo grupo —los
 * tres pasteles y el dorado— así que se toma el punto medio.
 *
 * Con 0.42, que fue el primer intento, NINGÚN pack tomaba el contorno y
 * `kawaii` pasaba de rosa pastel `#f7a8c4` a malva `#99687a`: cumplía AA y
 * perdía la identidad del pack, que es justo lo que este archivo evita.
 */
export const MAX_DARKEN = 0.25;

export type CtaTreatment =
  | { kind: "solid"; bg: string; fg: string; ratio: number }
  | { kind: "outline"; bg: string; fg: string; border: string; ratio: number };

/** El más legible de una lista de candidatos sobre `bg`. */
function mejorSobre(bg: string, candidatos: string[]): { fg: string; ratio: number } {
  let mejor = { fg: candidatos[0], ratio: contrastRatio(bg, candidatos[0]) };
  for (const c of candidatos) {
    const r = contrastRatio(bg, c);
    if (r > mejor.ratio) mejor = { fg: c, ratio: r };
    if (mejor.ratio >= AA_NORMAL) break;
  }
  return mejor;
}

/**
 * Deriva el tratamiento del CTA a partir del primario del pack.
 *
 * 1. Si el blanco ya cumple sobre el primario, no se toca nada.
 * 2. Si oscurecerlo *poco* basta, se oscurece: sigue siendo el color del pack.
 * 3. Si haría falta destruirlo, se cambia de tratamiento: fondo con un tinte
 *    muy claro del primario y tinta oscura encima. El botón sigue siendo del
 *    color del evento y se puede leer.
 *
 * Nunca devuelve algo por debajo de AA: el caso 3 usa la tinta de la invitación
 * como respaldo, que ya se valida contra el fondo.
 */
export function deriveCta(
  primary: string,
  ink: string,
  background: string,
): CtaTreatment {
  const directo = contrastRatio(primary, WHITE);
  if (directo >= AA_NORMAL) {
    return { kind: "solid", bg: primary, fg: WHITE, ratio: directo };
  }

  // Busca el menor oscurecimiento que cumpla. Paso de 1% para no pasarse.
  for (let t = 0.01; t <= MAX_DARKEN; t += 0.01) {
    const cand = mix(primary, "#000000", t);
    const r = contrastRatio(cand, WHITE);
    if (r >= AA_NORMAL) {
      return { kind: "solid", bg: cand, fg: WHITE, ratio: r };
    }
  }

  // Oscurecerlo lo suficiente lo destruiría: se cambia de tratamiento.
  //
  // El tinte se mezcla hacia el FONDO de la invitación, no hacia blanco. Un
  // pack oscuro como `noche-estelar` con un botón de fondo casi blanco se ve
  // como un parche pegado encima; mezclando hacia su propio fondo, el botón
  // pertenece a la invitación en la que vive.
  const bg = mix(primary, background, 0.82);
  const oscuro = mix(primary, "#000000", 0.55);
  const claro = mix(primary, "#ffffff", 0.72);
  const { fg, ratio } = mejorSobre(bg, [oscuro, ink, claro, "#111111", WHITE]);
  return {
    kind: "outline",
    bg,
    fg,
    border: mix(primary, ink, 0.35),
    ratio,
  };
}

/**
 * Colores de ESTADO dentro de la invitación (éxito y error).
 *
 * El bug que resuelve, medido: los avisos de la página pública usaban
 * `text-emerald-700 dark:text-emerald-400`, y esa variante `dark:` responde al
 * tema de la APP —la clase en el `<html>`— no al de la INVITACIÓN. Son dos ejes
 * independientes, así que las dos combinaciones cruzadas fallan:
 *
 *   invitación oscura + app en claro → emerald-700 sobre fondo oscuro = 3.37
 *   invitación clara  + app en oscuro → emerald-400 sobre fondo claro = 1.89
 *
 * El segundo es el caso común y el peor: un invitado con el teléfono en modo
 * oscuro abriendo una invitación clara veía el mensaje de confirmación
 * prácticamente invisible.
 *
 * La tinta de la invitación (`ink`) SÍ es legible sobre su fondo —los packs se
 * diseñan así—, de modo que se mezcla el color de estado hacia ella hasta que
 * cumple. Conserva el matiz mientras se pueda; si ni mezclando del todo alcanza,
 * devuelve la tinta, que es legible por construcción.
 */
export function deriveStatus(
  base: string,
  ink: string,
  background: string,
  /**
   * Cuánto se tiñe la superficie con el propio color de estado. Los avisos se
   * pintan sobre `color-mix(... 10%, transparent)` DEL MISMO color, así que el
   * fondo real no es el de la invitación: es un poco más oscuro (o más claro)
   * y el contraste baja.
   *
   * Medido en `zz-demo`: el verde derivado daba 4.57 contra el blanco puro y
   * **4.01 sobre su propio tinte al 10 %** — por debajo de AA, justo en el
   * mensaje "tu confirmación quedó registrada". Por eso se deriva contra el
   * caso MÁS DURO, no contra el fondo desnudo: así el token sirve para los dos
   * usos, tintado y sin tintar.
   */
  surfaceTint = 0.1,
): string {
  // La superficie depende del candidato, así que se evalúa por candidato. No
  // hay circularidad: para cada color propuesto se sabe qué fondo produce.
  const cumple = (c: string) => contrastRatio(c, mix(background, c, surfaceTint)) >= AA_NORMAL;

  if (cumple(base)) return base;
  for (let t = 0.05; t <= 1; t += 0.05) {
    const cand = mix(base, ink, t);
    if (cumple(cand)) return cand;
  }
  return ink;
}

/** Verde y rojo base. Tailwind emerald-600 y red-600, como punto de partida. */
export const STATUS_SUCCESS_BASE = "#059669";
export const STATUS_DANGER_BASE = "#dc2626";
