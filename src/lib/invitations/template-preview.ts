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

/**
 * Revisión de las miniaturas. La ESCRIBE `scripts/capturar-miniaturas.mts` al
 * terminar una tanda completa, y el catálogo la añade como `?v=` a cada URL.
 *
 * Por qué hace falta. Las miniaturas se regeneran EN SU SITIO: el archivo
 * cambia y la ruta no. Y `next/image` cachea por URL, no por contenido, así
 * que sirve la versión optimizada vieja indefinidamente. Se vio en vivo: tras
 * regenerar las 50 con el arte puesto, el catálogo seguía mostrando las
 * anteriores —sin arte y con el copy de anfitrión que ya se había quitado—
 * mientras el archivo servido en crudo era el nuevo y correcto.
 *
 * En desarrollo se nota poco porque uno borra `.next`; en producción los
 * clientes desplegados se quedarían con las viejas sin que nada avisara. Un
 * solo número que cambia con la tanda basta para invalidar la caché del
 * optimizador y la del navegador, y evita tener que renombrar 50 archivos o
 * volver a escribir 50 URLs en la BD en cada regeneración.
 */
export const REVISION_MINIATURAS = "202609092204";
