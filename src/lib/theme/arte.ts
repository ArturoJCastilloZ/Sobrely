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
  /** Clave estable. El archivo depende de `tipo` — ver `rutaArte`. */
  clave: string;
  /**
   * `svg` = dibujado a mano aquí. `foto` = fotografía de Pexels DESCARGADA y
   * auto-hospedada en `public/arte/foto/`.
   *
   * Nunca se enlaza a `images.pexels.com`: eso seria un CDN en runtime y
   * rompe la regla de cero phone-home. La descarga es de una vez, como una
   * dependencia. Procedencia y autoria en `public/arte/PROCEDENCIA.md`.
   */
  tipo: "svg" | "foto";
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
    tipo: "svg",
    nombre: "Botánica",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "xv-noche-oro",
    tipo: "svg",
    nombre: "Noche y oro",
    eventos: ["XV años"],
    polaridad: "claro",
    overlay: 0,
  },
  {
    clave: "revelacion-acuarela",
    tipo: "svg",
    nombre: "Acuarela",
    eventos: ["Baby shower", "Revelación de género"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "boda-lino-sello",
    tipo: "svg",
    nombre: "Lino y sello",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "xv-rosa-polvo",
    tipo: "svg",
    nombre: "Rosa polvo",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "cumple-confeti",
    tipo: "svg",
    nombre: "Confeti",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "cumple-neon",
    tipo: "svg",
    nombre: "Neón",
    eventos: ["Cumpleaños"],
    polaridad: "claro",
    overlay: 0,
  },
  {
    clave: "baby-cielo",
    tipo: "svg",
    nombre: "Cielo",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "corp-lineas",
    tipo: "svg",
    nombre: "Retícula",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "corp-noche",
    tipo: "svg",
    nombre: "Marino",
    eventos: ["Corporativo"],
    polaridad: "claro",
    overlay: 0,
  },
  {
    clave: "cumple-guirnalda",
    tipo: "svg",
    nombre: "Guirnalda",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  {
    clave: "corp-papel",
    tipo: "svg",
    nombre: "Papel",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0.05,
  },
  // ---- Fotografía (Pexels, descargada y auto-hospedada) ------------------
  //
  // El `overlay` de estas NO es una preferencia estética: es el velo MÍNIMO
  // que `scripts/verificar-contraste-arte.mts` midió para que el peor píxel
  // del centro llegue a AA. Una foto tiene mucho más rango de luminancia que
  // un SVG, así que desnuda ninguna de las tres admitía texto legible: 4.15,
  // 3.44 y 2.37 en el peor píxel.
  //
  // Se descartó una cuarta (`boda-flores-cinta`) porque exigía 0.55 de velo:
  // a esa opacidad la foto queda medio borrada y ya no estás mostrando una
  // foto, estás mostrando un color. Regla de selección que deja: fotos de
  // rango de luminancia ESTRECHO y centro vacío — un flat-lay sobre fondo
  // claro funciona, un claroscuro dramático no.
  {
    clave: "boda-marco-floral",
    tipo: "foto",
    nombre: "Marco floral",
    eventos: ["Boda"],
    polaridad: "oscuro",
    // 0.10 medido. Es la mejor de las tres: la foto sobrevive casi intacta.
    overlay: 0.1,
  },
  {
    clave: "xv-seda-rosa",
    tipo: "foto",
    nombre: "Seda rosa",
    eventos: ["XV años"],
    polaridad: "claro",
    // 0.20 medido con texto claro. Con texto oscuro exigia 0.60.
    overlay: 0.2,
  },
  {
    clave: "xv-brillo-rosa",
    tipo: "foto",
    nombre: "Brillo rosa",
    eventos: ["XV años"],
    polaridad: "oscuro",
    // 0.35 medido. Aceptable: la textura de brillo aguanta el velo.
    overlay: 0.35,
  },
] as const;

/** Ruta pública de un arte, según sea SVG dibujado o fotografía. */
export function rutaArte(clave: string): string {
  const a = buscarArte(clave);
  return a?.tipo === "foto" ? `/arte/foto/${clave}.jpg` : `/arte/${clave}.svg`;
}

export function buscarArte(clave: string): DireccionArte | undefined {
  return ARTE.find((a) => a.clave === clave);
}

/**
 * ¿Esta URL de imagen la puso el USUARIO, o la sirve la app?
 *
 * El entitlement `custom_art` se llama, literalmente, «Arte propio (fondo e
 * imágenes)»: cobra por subir arte TUYO, no por el que trae el producto. La
 * `0030` puso `backgroundImage` en las 50 plantillas y el gate no distinguía
 * las dos cosas, así que el catálogo entero quedó detrás de Celebración —
 * medido: 0 de 50 plantillas publicables en Free, y 10 que antes sí lo eran.
 *
 * El criterio es el ORIGEN, no la extensión ni el directorio: lo que sirve la
 * app es una ruta relativa a la raíz (`/arte/…`, `/previews/…`); lo que sube el
 * usuario es una URL absoluta al Storage de Supabase.
 *
 * `//host/x.png` NO cuenta como de la app aunque empiece por `/`: es una URL
 * relativa al protocolo, o sea un origen externo — cobrarla es lo de menos, lo
 * importante es que no se cuele como propia y rompa el «cero phone-home».
 */
export function esArteDeLaApp(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith("/") && !url.startsWith("//");
}
