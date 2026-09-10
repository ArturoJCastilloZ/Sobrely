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
   * `svg` = dibujado a mano aquí. `foto` = fotografía de Pexels o Unsplash
   * DESCARGADA y auto-hospedada en `public/arte/foto/`.
   *
   * Nunca se enlaza a `images.pexels.com` ni a `images.unsplash.com`: eso seria
   * un CDN en runtime y
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
    overlay: 0.2,
  },
  {
    clave: "xv-noche-oro",
    tipo: "svg",
    nombre: "Noche y oro",
    eventos: ["XV años"],
    polaridad: "claro",
    overlay: 0.55,
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
    overlay: 0.45,
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
    overlay: 0.05,
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
    overlay: 0.5,
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
  // ---- 2.ª investigación (Fase 11) — las 7 del piloto F1/F2/F3 -------------
  //
  // Descargadas el 2026-09-08 con autorización explícita del dev. Licencias
  // leídas en la fuente ese mismo día; procedencia, autoría y URL original en
  // `public/arte/PROCEDENCIA.md`.
  //
  // Los `overlay` de aquí abajo los puso el MEDIDOR, no el ojo. Y son ALTOS:
  // entre 0.5 y 0.65, todos por encima del umbral de 0.35 que el research fija
  // (criterio E5, con el precedente de `boda-flores-cinta`, descartada a 0.55).
  //
  // Eso NO las descalifica, porque descalifica un USO concreto: el de telón con
  // texto encima, que es la familia F2. En F1 (partida) y F3 (objeto y aire) la
  // foto es una FIGURA CONTENIDA y no hay texto sobre ella, así que el velo no
  // interviene. El número queda declarado para que, si alguien las monta alguna
  // vez como `backgroundImage`, sepa lo que cuesta.
  //
  // ⚠️ Conclusión que hay que decir en voz alta: **ninguna de estas siete sirve
  // para F2**. Un telón necesita rango de luminancia estrecho y centro vacío —
  // hoy la única foto del repo que lo cumple es `boda-marco-floral`, con 0.10.
  {
    clave: "boda-papeleria-salvia",
    tipo: "foto",
    nombre: "Papelería salvia",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0.55,
  },
  {
    clave: "xv-tiara-noche",
    tipo: "foto",
    nombre: "Tiara de noche",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0.6,
  },
  {
    clave: "baby-punto-y-flor",
    tipo: "foto",
    nombre: "Punto y flor",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0.55,
  },
  {
    clave: "revelacion-globos-coral",
    tipo: "foto",
    nombre: "Globos coral",
    eventos: ["Gender reveal"],
    polaridad: "oscuro",
    overlay: 0.55,
  },
  {
    clave: "cumple-arco-globos",
    tipo: "foto",
    nombre: "Arco de globos",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0.5,
  },
  {
    clave: "bautizo-cera-blanca",
    tipo: "foto",
    nombre: "Cera blanca",
    eventos: ["Bautizo"],
    polaridad: "oscuro",
    overlay: 0.55,
  },
  {
    clave: "graduacion-diploma",
    tipo: "foto",
    nombre: "Diploma",
    eventos: ["Graduación"],
    polaridad: "oscuro",
    overlay: 0.55,
  },
  // ---- 3.ª tanda (Fase 11) — conversión de las F4 a fotografía ------------
  //
  // Descargadas el 2026-09-08 con autorización explícita del dev, tras la
  // puntuación del piloto (§19 del research): 7 de 7 con fotografía aprobaron y
  // 0 de 8 sin ella. Procedencia y licencia en `PROCEDENCIA.md`.
  {
    clave: "boda-anillos-papel",
    tipo: "foto",
    nombre: "Anillos sobre papel",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0.55,
  },
  {
    clave: "baby-juguetes-madera",
    tipo: "foto",
    nombre: "Juguetes de madera",
    eventos: ["Baby shower"],
    polaridad: "claro",
    overlay: 0.55,
  },
  {
    clave: "revelacion-tinta",
    tipo: "foto",
    nombre: "Tinta rosa y azul",
    eventos: ["Gender reveal"],
    polaridad: "oscuro",
    overlay: 0.4,
  },
  {
    clave: "cumple-velas-espiral",
    tipo: "foto",
    nombre: "Velas de espiral",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0.4,
  },
  {
    clave: "corp-reticula-hormigon",
    tipo: "foto",
    nombre: "Retícula de hormigón",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0.6,
  },
  {
    clave: "xv-pastel-quince",
    tipo: "foto",
    nombre: "Pastel de quince",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0.6,
  },
  // 5.ª tanda (2026-09-08, cierre de la Fase 11). Las dos entran para resolver
  // las DOS plantillas que el piloto dejo fuera del umbral, y las dos son un
  // OBJETO del evento, que es la variable que la fase midio como decisiva: no
  // una textura ni un marcador. Velo MEDIDO con
  // `scripts/verificar-contraste-arte.mts`, no estimado.
  {
    clave: "boda-pastel-rosas",
    tipo: "foto",
    nombre: "Pastel de boda",
    eventos: ["Boda"],
    // Medido "oscuro 0.6 / claro 0.6": empate, y en empate manda `oscuro`,
    // igual que `xv-pastel-quince`, que tiene el mismo perfil.
    polaridad: "oscuro",
    overlay: 0.6,
  },
  {
    clave: "comunion-caliz-lino",
    tipo: "foto",
    nombre: "Caliz y lino",
    eventos: ["Primera comunión"],
    // Medido "oscuro 0.6 / claro 0.55": gana el velo MENOR, o sea `claro`.
    // Mismo perfil exacto que `baby-juguetes-madera`, que ya se declara claro.
    polaridad: "claro",
    overlay: 0.6,
  },
  // ——— Piloto de arte del 2026-09-09 (roadmap §22, opción A) ———
  // Cinco plantillas, dos familias. Las tres FORMALES montan ornamento
  // tipográfico de «Ostell 1848» (dominio público, PD-old-70-expired; ver
  // PROCEDENCIA.md), recoloreado a la paleta de cada plantilla y compuesto
  // aquí: la plancha original son escaneos vectorizados de 260–952 KB por
  // marco, inservibles como fondo, así que se usan sólo los ornamentos
  // sueltos y cada `d` va UNA vez en <defs>, reusado con <use>.
  //
  // Las dos TEMÁTICAS no llevan Ostell: el victoriano no le va a un baby
  // shower ni a un cumpleaños, y además su arte anterior estaba en una paleta
  // AJENA a la de su plantilla — `baby-shower-neutro` es salvia+crema y
  // llevaba un cielo AZUL; `cumpleanos-adulto` es gris entero y llevaba
  // confeti MULTICOLOR. Se redibujaron en la suya.
  //
  // Los cinco van con `overlay: 0`: la banda central se deja limpia por
  // diseño, y medido da entre 10.93 y 16.62 de contraste — AA pide 4.5.
  {
    clave: "boda-carta-romantica-arte",
    tipo: "svg",
    nombre: "Orla botánica",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "xv-manuscrita-arte",
    tipo: "svg",
    nombre: "Voluta manuscrita",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "corporativo-sencillo-arte",
    tipo: "svg",
    nombre: "Greca sobria",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-neutro-arte",
    tipo: "svg",
    nombre: "Guirnalda de eucalipto",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-adulto-arte",
    tipo: "svg",
    nombre: "Serpentina sobria",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  // ——— Categoría BODA, 2026-09-09 ———
  // Las seis compartían dos archivos: cuatro con `boda-botanica.svg` y dos con
  // `boda-lino-sello.svg`, así que la categoría entera se veía igual. Cada una
  // estrena el suyo, en SU paleta efectiva —que en cuatro casos viene del
  // `themePack` y no de `colors`— y con SILUETA distinta, que es el techo que
  // señala §19.9: no basta cambiar el color si la composición se repite.
  //
  // El peso visual va en las FRANJAS LATERALES (x<63 y x>357). Es el hallazgo
  // que hizo utilizable esta tanda: `verificar-contraste-arte.mts` muestrea
  // x 63..357, y el ancho del SVG nunca se recorta — así que los lados se ven
  // siempre y no cuestan ni un punto de contraste. La primera versión, con
  // todo el arte en el centro y muy tenue para no perder contraste, se veía
  // MÁS vacía que el fondo que sustituía.
  {
    clave: "boda-botanica-arte",
    tipo: "svg",
    nombre: "Eucalipto",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "boda-de-lujo-arte",
    tipo: "svg",
    nombre: "Oro y filete",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "boda-destino-arte",
    tipo: "svg",
    nombre: "Sellos de viaje",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "boda-en-la-playa-arte",
    tipo: "svg",
    nombre: "Marea",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "boda-jardin-arte",
    tipo: "svg",
    nombre: "Tallo florido",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "boda-terracota-arte",
    tipo: "svg",
    nombre: "Hojarasca",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    // Cierra Boda. Compartia `foto/boda-marco-floral.jpg` con otras dos, y
    // ademas usa el MISMO pack `boda-lujo` que `boda-de-lujo`: con la paleta
    // repetida, distinguirlas sólo puede hacerlo la silueta. El motivo de
    // pelicula cae donde debe — las perforaciones de un carrete van en los
    // BORDES, que es la franja que se ve siempre y no cuesta contraste.
    clave: "boda-cinematografica-arte",
    tipo: "svg",
    nombre: "Carrete",
    eventos: ["Boda"],
    polaridad: "oscuro",
    overlay: 0,
  },
  // ——— Categoría CUMPLEAÑOS, 2026-09-09 ———
  // Nueve compartían dos archivos: cinco con `cumple-guirnalda.svg` y cuatro
  // con `cumple-confeti.svg`. Cada una estrena el suyo, en su paleta efectiva
  // y con silueta propia. El peso va en las franjas laterales, que se ven
  // siempre y no cuestan contraste.
  //
  // Tres se rehicieron tras MIRAR la hoja de contacto: las huellas de
  // dinosaurio se leían como plantitas, y `futbol` y `con-video` estaban tan
  // tenues que parecían vacías. Ninguna de las tres se detectaba leyendo el
  // SVG — hay que verlas al tamaño real.
  {
    clave: "cumpleanos-con-video-arte",
    tipo: "svg",
    nombre: "Pista de vídeo",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-dinosaurios-arte",
    tipo: "svg",
    nombre: "Huellas",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-futbol-arte",
    tipo: "svg",
    nombre: "Cancha",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-galaxia-arte",
    tipo: "svg",
    nombre: "Órbitas",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-infantil-arte",
    tipo: "svg",
    nombre: "Globos",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-kawaii-arte",
    tipo: "svg",
    nombre: "Nubes pastel",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-moderno-arte",
    tipo: "svg",
    nombre: "Geometría",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-sencillo-arte",
    tipo: "svg",
    nombre: "Filete",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "cumpleanos-superheroes-arte",
    tipo: "svg",
    nombre: "Ráfagas",
    eventos: ["Cumpleaños"],
    polaridad: "oscuro",
    overlay: 0,
  },
  // ——— Categoría XV AÑOS, 2026-09-09 ———
  // Siete compartían fondo: tres `xv-rosa-polvo.svg` y cuatro
  // `foto/xv-brillo-rosa.jpg`. Aquí el arte carga con más trabajo que en las
  // otras categorías porque DOS PARES comparten la paleta EXACTA —`xv-clasico`
  // y `xv-glam`—, así que el color no puede distinguirlos: sólo la silueta.
  // Por eso a esos cuatro se les dio el motivo más contrastado posible entre
  // sí (laurel contra esquinas de álbum; diafragma contra tubos de neón).
  {
    clave: "xv-anos-arte",
    tipo: "svg",
    nombre: "Greca de rombos",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "xv-con-salon-arte",
    tipo: "svg",
    nombre: "Arquería",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    // Cuarto motivo de vídeo del catálogo y ninguno repetido: la pista es de
    // `cumpleanos-con-video`, el carrete de `boda-cinematografica`, los tubos
    // de `xv-glam-moderno`. Éste es el diafragma de la lente.
    clave: "xv-con-video-arte",
    tipo: "svg",
    nombre: "Diafragma",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "xv-clasicos-elegantes-arte",
    tipo: "svg",
    nombre: "Laurel",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "xv-con-sesion-arte",
    tipo: "svg",
    nombre: "Esquinas de álbum",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "xv-glam-moderno-arte",
    tipo: "svg",
    nombre: "Neón",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "xv-sencillos-arte",
    tipo: "svg",
    nombre: "Filete rosa",
    eventos: ["XV años"],
    polaridad: "oscuro",
    overlay: 0,
  },
  // ——— Categoría BABY SHOWER, 2026-09-09 ———
  // Nueve compartían fondo: cinco `revelacion-acuarela.svg` y cuatro
  // `baby-cielo.svg`. Es la categoría con MÁS pares de paleta idéntica —cuatro—
  // así que la silueta carga con casi todo:
  //   azul cielo   baby-shower (topos)        / sencillo (punteado)
  //   marrón       animalitos (huellitas)     / con-video (móvil de cuna)
  //   azul nubes   completo (banderines)      / nubes (estratos)
  //   salvia       neutro (eucalipto, ya hecho) / salvia (rama de olivo)
  //
  // Las huellitas son REDONDAS, de gatito, para no confundirse con las de
  // terópodo de `cumpleanos-dinosaurios`; y los estratos son alargados y
  // planos, para no confundirse con las nubes redondas de `cumpleanos-kawaii`.
  {
    clave: "baby-shower-arte",
    tipo: "svg",
    nombre: "Lluvia de topos",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-animalitos-arte",
    tipo: "svg",
    nombre: "Huellitas",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-completo-arte",
    tipo: "svg",
    nombre: "Banderines",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-con-video-arte",
    tipo: "svg",
    nombre: "Móvil de cuna",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-mesa-regalos-arte",
    tipo: "svg",
    nombre: "Cajas con lazo",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-nubes-arte",
    tipo: "svg",
    nombre: "Estratos",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-revelacion-arte",
    tipo: "svg",
    nombre: "Rosa y azul",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-salvia-arte",
    tipo: "svg",
    nombre: "Rama de olivo",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "baby-shower-sencillo-arte",
    tipo: "svg",
    nombre: "Punteado",
    eventos: ["Baby shower"],
    polaridad: "oscuro",
    overlay: 0,
  },
  // ——— Categoría CORPORATIVO, 2026-09-09 ———
  // Nueve compartían fondo: cinco `corp-lineas.svg` y cuatro `corp-papel.svg`.
  //
  // Es el PEOR caso de paleta repetida del catálogo: **cuatro** plantillas con
  // el mismo azul marino del pack `corporativo-limpio` —no dos como en las
  // otras categorías—. Las cuatro siluetas tuvieron que separarse entre sí:
  //   completo            línea de tiempo con hitos
  //   conferencia-agenda  marcas horarias
  //   congreso-video      pantalla de proyección con haz
  //   taller              cuadrícula milimetrada
  //
  // Y un par más: `evento-corporativo` comparte el azul de
  // `corporativo-sencillo`, que ya lleva la greca griega; le toca el circuito.
  {
    // Ojo: esta usa el pack `boda-lujo`, cruzando de categoría. El arte va en
    // su dorado, pero la paleta prestada sigue siendo una deuda anotada.
    clave: "corporativo-cena-fin-de-ano-arte",
    tipo: "svg",
    nombre: "Guirnalda",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "corporativo-completo-arte",
    tipo: "svg",
    nombre: "Línea de tiempo",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "corporativo-con-sede-arte",
    tipo: "svg",
    nombre: "Plano",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "corporativo-conferencia-agenda-arte",
    tipo: "svg",
    nombre: "Marcas horarias",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "corporativo-congreso-video-arte",
    tipo: "svg",
    nombre: "Proyección",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "corporativo-junta-resultados-arte",
    tipo: "svg",
    nombre: "Barras",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "corporativo-lanzamiento-arte",
    tipo: "svg",
    nombre: "Haz de foco",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "corporativo-taller-arte",
    tipo: "svg",
    nombre: "Cuadrícula",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
  },
  {
    clave: "evento-corporativo-arte",
    tipo: "svg",
    nombre: "Circuito",
    eventos: ["Corporativo"],
    polaridad: "oscuro",
    overlay: 0,
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
