-- ============================================================================
-- 0044 — CUMPLEAÑOS: arte propio para las nueve que compartían fondo
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- La categoría tiene **12** plantillas —no 9: el filtro no es el censo, que es
-- el error que ya costó tres correcciones en Boda—. Tres están resueltas:
-- `cumpleanos-adulto` (piloto de arte) y `cumpleanos-arco` /
-- `cumpleanos-papel-picado` (Fase 11, con foto y sin telón).
--
-- Las otras nueve compartían dos archivos: cinco `cumple-guirnalda.svg` y
-- cuatro `cumple-confeti.svg`.
--
-- ----------------------------------------------------------------------------
-- Silueta propia por plantilla
-- ----------------------------------------------------------------------------
--   con-video     pista de tiempo con marcas, botón de play y barra de avance
--   dinosaurios   huellas de terópodo subiendo por los lados
--   futbol        las líneas del campo: banda, área y círculo central
--   galaxia       órbitas laterales y estrellas dispersas
--   infantil      globos que suben con su cuerda
--   kawaii        nubes pastel y un corazón
--   moderno       geometría plana en cian y rosa
--   sencillo      un filete y nada más — la más desnuda de las nueve
--   superheroes   ráfagas radiales desde los bordes
--
-- El peso va en las FRANJAS LATERALES (x<63 y x>357): se ven siempre porque el
-- ancho nunca se recorta, y no cuestan contraste porque el script muestrea
-- x 63..357. Es la regla que salió de Boda y aquí se aplicó desde el principio.
--
-- ----------------------------------------------------------------------------
-- Tres se rehicieron después de MIRARLAS
-- ----------------------------------------------------------------------------
-- Las huellas de dinosaurio se leían como plantitas, y `futbol` y `con-video`
-- estaban tan tenues que parecían vacías. Ninguna de las tres se detectaba
-- leyendo el SVG. Y al reforzarlas me pasé en el CENTRO: el gate de contraste
-- las tumbó (3.52 y 4.15, con AA en 4.5). Se atenuó el centro y se compensó en
-- las bandas — quedaron en **7.73 y 8.12**, o sea con más contraste Y más
-- presencia que antes.
--
-- Medido para las nueve: entre **6.65 y 13.79**. Media de peso 0.6 KB gzip.
--
-- ----------------------------------------------------------------------------
-- Y una plantilla sin paleta
-- ----------------------------------------------------------------------------
-- `cumpleanos-moderno` es la única de las 65 con `colors: null` y sin
-- `themePack`: se dibujaba con los colores por defecto pese a prometer
-- «Colores vivos y estilo fresco». Se le da paleta propia —cian y rosa— y su
-- arte va en esos colores. No es un extra: sin esto, su arte nuevo desentonaría
-- con su propio tema.
-- ============================================================================

-- 1) Fondo propio para las nueve.
update public.templates as t
   set theme_config = jsonb_set(
         t.theme_config, '{backgroundImage}',
         jsonb_build_object('url', v.url, 'overlay', 0), true)
  from (values
    ('cumpleanos-con-video',    '/arte/cumpleanos-con-video-arte.svg'),
    ('cumpleanos-dinosaurios',  '/arte/cumpleanos-dinosaurios-arte.svg'),
    ('cumpleanos-futbol',       '/arte/cumpleanos-futbol-arte.svg'),
    ('cumpleanos-galaxia',      '/arte/cumpleanos-galaxia-arte.svg'),
    ('cumpleanos-infantil',     '/arte/cumpleanos-infantil-arte.svg'),
    ('cumpleanos-kawaii',       '/arte/cumpleanos-kawaii-arte.svg'),
    ('cumpleanos-moderno',      '/arte/cumpleanos-moderno-arte.svg'),
    ('cumpleanos-sencillo',     '/arte/cumpleanos-sencillo-arte.svg'),
    ('cumpleanos-superheroes',  '/arte/cumpleanos-superheroes-arte.svg')
  ) as v(slug, url)
 where t.slug = v.slug
   and t.event_type = 'Cumpleaños'
   and t.theme_config ? 'backgroundImage';

-- 2) `cumpleanos-moderno` estrena paleta, porque no tenía ninguna.
update public.templates
   set theme_config = jsonb_set(
         theme_config, '{colors}',
         '{"primary":"#06b6d4","secondary":"#f43f5e","background":"#f8fafc","text":"#0f172a"}'::jsonb,
         true)
 where slug = 'cumpleanos-moderno'
   and event_type = 'Cumpleaños'
   -- Sólo si de verdad no tiene: si alguien se la puso mientras tanto, no se pisa.
   and theme_config -> 'colors' is null
   and theme_config -> 'themePack' is null;

-- ============================================================================
-- Verificación
-- ============================================================================
--   select slug, theme_config #>> '{backgroundImage,url}' as fondo
--     from public.templates
--    where is_active and event_type = 'Cumpleaños' order by slug;   -- 12 filas
--
-- Ningún fondo compartido dentro de la categoría (0 filas):
--   select theme_config #>> '{backgroundImage,url}' as f, count(*)
--     from public.templates
--    where is_active and event_type = 'Cumpleaños'
--      and theme_config ? 'backgroundImage'
--    group by 1 having count(*) > 1;
--
-- La moderna ya con paleta (debe devolver el objeto, no null):
--   select theme_config -> 'colors' from public.templates where slug = 'cumpleanos-moderno';
--
-- Después: `node scripts/capturar-miniaturas.mts` de las nueve.
-- ============================================================================
