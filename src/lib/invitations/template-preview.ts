/**
 * Constantes compartidas entre la vista de plantilla (`/plantilla/<slug>`) y el
 * script que captura sus miniaturas.
 *
 * Viven aquí y NO en el `page.tsx` por dos razones. Next valida qué se puede
 * exportar de una página, así que una constante ajena ahí compila con `tsc` y
 * puede reventar en `next build` — el tipo de fallo que no se ve hasta el
 * build. Y el script no debería tener que importar una página para saber con
 * qué reloj capturar.
 */

/**
 * Fecha de escaparate de las plantillas.
 *
 * La cuenta atrás se calcula contra `now()`, así que sin congelar el reloj la
 * misma plantilla daría una imagen distinta cada día y no habría forma de
 * saber si una miniatura cambió porque cambió el diseño o porque pasó un día.
 * El script congela el reloj en `RELOJ_CAPTURA` y la página usa esta fecha, así
 * que los números de la cuenta atrás son siempre los mismos.
 */
export const FECHA_ESCAPARATE = "2027-06-12T18:00:00.000Z";

/**
 * Instante en el que el script congela el reloj del navegador. Fijo y anterior
 * a `FECHA_ESCAPARATE`, con una diferencia redonda para que la cuenta atrás
 * salga con números legibles en la miniatura.
 */
export const RELOJ_CAPTURA = "2027-05-13T18:00:00.000Z";

/** Ancho del viewport de captura, en px CSS. */
export const ANCHO_CAPTURA = 420;

/**
 * Proporcion de la miniatura, como [ancho, alto]. 3:4 es la de una tarjeta de
 * galeria.
 *
 * Vive AQUI y no en el script porque son tres numeros que tienen que cuadrar
 * en dos archivos distintos: el alto con el que se captura y el `aspect-ratio`
 * que el catalogo reserva para el hueco. Duplicados, cambiar uno deja al otro
 * recortando el diseño con `object-cover` EN SILENCIO — nada falla, las
 * tarjetas simplemente empiezan a cortar por abajo. Es el mismo modo de fallo
 * por duplicacion que `templateToDocument` cierra para el contenido.
 */
export const PROPORCION_MINIATURA = [3, 4] as const;

/** Alto del viewport de captura, DERIVADO de la proporcion. */
export const ALTO_CAPTURA =
  (ANCHO_CAPTURA * PROPORCION_MINIATURA[1]) / PROPORCION_MINIATURA[0];

/** Escala del dispositivo: 2 para que la miniatura no se vea borrosa en retina. */
export const ESCALA_CAPTURA = 2;
