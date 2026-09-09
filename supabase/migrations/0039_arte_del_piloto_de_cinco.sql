-- ============================================================================
-- 0039 — El arte del piloto: cinco plantillas estrenan fondo propio
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- Roadmap §22, opción A. El bloqueo para salir a producción no era el código
-- sino el arte: medido contra la BD el 2026-09-09, de las 65 activas hay
-- **8 con fotografía, 42 con SVG y 15 sin ningún fondo**.
--
-- Estas cinco NO eran «paneles de color»: ya tenían `backgroundImage`. Lo que
-- pasaba es que **compartían el fondo con otras 2 a 4 plantillas cada una**, de
-- modo que la categoría entera se veía igual. Ahora cada una tiene el suyo.
--
-- Los archivos viejos NO se tocan: los siguen usando sus compañeras, que se
-- quedan exactamente como estaban. Este es un piloto de cinco, no un cambio de
-- catálogo.
--
-- ----------------------------------------------------------------------------
-- De dónde sale el arte
-- ----------------------------------------------------------------------------
-- TRES formales montan ornamento tipográfico de «Ostell 1848», dominio público
-- (PD-old-70-expired), descargado y auto-hospedado — cero phone-home, cero CDN
-- en runtime. Procedencia, licencia leída en la fuente, piezas y pesos en
-- `public/arte/PROCEDENCIA.md`.
--
-- DOS son dibujo propio y no llevan nada de Ostell, por dos razones: el
-- victoriano no le va a un baby shower ni a un cumpleaños, y su arte anterior
-- estaba en una paleta **ajena a la de su propia plantilla** —
-- `baby-shower-neutro` es salvia+crema y llevaba un cielo AZUL;
-- `cumpleanos-adulto` es gris entero y llevaba confeti MULTICOLOR.
--
-- ----------------------------------------------------------------------------
-- Velo
-- ----------------------------------------------------------------------------
-- Los cinco van con `overlay: 0`, y no por comodidad: la banda central se deja
-- limpia por diseño y el peor píxel da entre **10.93 y 16.62** de contraste
-- WCAG contra el color de texto de cada plantilla. AA pide 4.5.
--
-- Sin cambio de esquema: las cinco ya tenían `colors`/`font`/`spacing`
-- explícitos y sólo se reescribe `backgroundImage`.
-- ============================================================================

update public.templates as t
   set theme_config = jsonb_set(
         t.theme_config,
         '{backgroundImage}',
         jsonb_build_object('url', v.url, 'overlay', 0),
         true)
  from (values
    ('boda-carta-romantica',  '/arte/boda-carta-romantica-arte.svg'),
    ('xv-manuscrita',         '/arte/xv-manuscrita-arte.svg'),
    ('corporativo-sencillo',  '/arte/corporativo-sencillo-arte.svg'),
    ('baby-shower-neutro',    '/arte/baby-shower-neutro-arte.svg'),
    ('cumpleanos-adulto',     '/arte/cumpleanos-adulto-arte.svg')
  ) as v(slug, url)
 where t.slug = v.slug
   -- Guardas de forma: si la plantilla perdió su paleta explícita o su fondo,
   -- no se escribe nada en vez de pisar un theme que ya no es el que se midió.
   and t.theme_config ? 'colors'
   and t.theme_config ? 'backgroundImage';

-- ============================================================================
-- Verificación (debe devolver 5 filas, todas con overlay 0 y url `*-arte.svg`)
-- ============================================================================
--   select slug,
--          theme_config #>> '{backgroundImage,url}'     as fondo,
--          theme_config #>> '{backgroundImage,overlay}' as velo
--     from public.templates
--    where slug in ('boda-carta-romantica','xv-manuscrita','corporativo-sencillo',
--                   'baby-shower-neutro','cumpleanos-adulto')
--    order by slug;
--
-- Y que NO se movió nadie más:
--   select count(*) from public.templates
--    where theme_config #>> '{backgroundImage,url}' like '%-arte.svg';
--    -- 5
--
-- Después: `node scripts/capturar-miniaturas.mts <slug>` para las cinco, y
-- ojo con la deuda anotada — ese script bumpea REVISION_MINIATURAS en tanda
-- PARCIAL, así que recapturar cinco invalida la caché de las 65.
-- ============================================================================
