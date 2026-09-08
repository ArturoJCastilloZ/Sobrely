/**
 * Registro de las direcciones de ARTE de fondo de las plantillas (Fase 4).
 *
 * Cada arte es un SVG dibujado a mano en `public/arte/`. Cero assets externos,
 * cero licencias, cero phone-home: entran por `theme.backgroundImage.url`, que
 * ya existía, así que heredan el telón sticky sin tocar el esquema.
 *
 * `polaridad` NO es decorativa, es la restricción que hace la asignación
 * segura. La Fase 0 derivó `--inv-cta` midiendo AA **contra el color de fondo
 * plano** —de 20 packs, 11 fallaban y ahora fallan 0—, y con una imagen detrás
 * esa garantía deja de valer: el fondo pasa a ser un rango de luminancias. Un
 * arte solo puede ir sobre un pack cuyo texto tenga la polaridad que el arte
 * aguanta.
 *
 * Los números salen de `scripts/verificar-contraste-arte.mts`, que rasteriza
 * cada SVG y mide el contraste WCAG contra el píxel PEOR de la banda central
 * (no contra el promedio: el promedio deja pasar un fondo con una mancha clara
 * mientras el texto sobre la mancha es ilegible). Ese script COMPARA lo
 * declarado aquí contra lo medido y falla si no coinciden, así que esta tabla
 * no puede quedarse vieja sin que algo se ponga rojo.
 */

/** Qué color de texto admite un arte, medido y no supuesto. */
export type PolaridadArte = "oscuro" | "claro" | "ambos";

export type DireccionArte = {
  /** Clave estable; el archivo es `public/arte/<clave>.svg`. */
  clave: string;
  /** Nombre para el panel de tema, cuando se exponga al usuario. */
  nombre: string;
  /** Tipos de evento para los que el arte es idiomático. */
  eventos: readonly string[];
  polaridad: PolaridadArte;
  /**
   * Overlay con el que se monta (`theme.backgroundImage.overlay`). El defecto
   * del esquema es 0.45 y con arte detrás lo BORRARÍA, así que aquí va casi a
   * cero: el contraste lo sostiene la composición del propio SVG, que deja la
   * banda central limpia.
   */
  overlay: number;
};

export const ARTE: readonly DireccionArte[] = [
  {
    clave: "boda-botanica",
    nombre: "Botánica",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "xv-noche-oro",
    nombre: "Noche y oro",
    eventos: ["XV años"],
    polaridad: "claro",
    overlay: 0,
  },
  {
    clave: "revelacion-acuarela",
    nombre: "Acuarela",
    eventos: ["Baby shower", "Revelación de género"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "boda-lino-sello",
    nombre: "Lino y sello",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "xv-rosa-polvo",
    nombre: "Rosa polvo",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "cumple-confeti",
    nombre: "Confeti",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "cumple-neon",
    nombre: "Neón",
    eventos: ["Cumpleaños"],
    polaridad: "claro",
    overlay: 0,
  },
  {
    clave: "baby-cielo",
    nombre: "Cielo",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "corp-lineas",
    nombre: "Retícula",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "corp-noche",
    nombre: "Marino",
    eventos: ["Corporativo"],
    polaridad: "claro",
    overlay: 0,
  },
] as const;

/** Ruta pública del SVG de un arte. */
export function rutaArte(clave: string): string {
  return `/arte/${clave}.svg`;
}

export function buscarArte(clave: string): DireccionArte | undefined {
  return ARTE.find((a) => a.clave === clave);
}
