-- ============================================================================
-- 0044 — CUMPLEAÑOS: arte propio para las nueve que compartían fondo
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- ⚠️ SE EJECUTA COMO UN SOLO BLOQUE. Es una sentencia única —dos `update`
-- dentro de un CTE y un `select` final— y termina devolviendo UNA FILA POR
-- CAMBIO. La versión anterior eran dos `update` sueltos separados por
-- comentarios: el editor de Supabase ejecuta la sentencia bajo el cursor, así
-- que era posible correrla y ver «Success» sin que entrara nada. Aquí, si no
-- salen 10 filas, no se aplicó.
--
-- ----------------------------------------------------------------------------
-- Qué hace
-- ----------------------------------------------------------------------------
-- La categoría tiene 12 plantillas. Tres ya estaban resueltas
-- (`cumpleanos-adulto` del piloto; `arco` y `papel-picado` de la Fase 11, con
-- foto y sin telón). Las otras NUEVE compartían dos archivos: cinco
-- `cumple-guirnalda.svg` y cuatro `cumple-confeti.svg`.
--
-- Silueta propia por plantilla: pista de vídeo · huellas de terópodo · líneas
-- de campo · órbitas · globos · nubes pastel · geometría · un filete · ráfagas.
-- El peso va en las FRANJAS LATERALES (x<63 y x>357), que se ven siempre y no
-- cuestan contraste. Medido: entre 6.65 y 13.79 (AA pide 4.5); 0.6 KB gzip.
--
-- Y `cumpleanos-moderno` estrena PALETA: es la única de las 65 con
-- `colors: null` y sin `themePack`, o sea que se dibujaba con los colores por
-- defecto pese a prometer «Colores vivos y estilo fresco».
--
-- Se esperaban 10 filas: 9 de `fondo` + 1 de `paleta`.
--
-- ----------------------------------------------------------------------------
-- ⚠️ APLICADA, y devolvió 9 — la rama `paleta` NO entró. Ya está corregido.
-- ----------------------------------------------------------------------------
-- La causa es de Postgres y es mía por no verla: `cumpleanos-moderno` aparece
-- en LAS DOS ramas del CTE, en `fondo` y en `paleta`. Actualizar la misma fila
-- dos veces dentro de una sola sentencia **no está soportado**: sólo una de las
-- modificaciones ocurre, y la otra se descarta en silencio — sin error y sin
-- fila en su `returning`. Por eso salieron 9 y no 10.
--
-- Al fusionar dos `update` en un CTE para que el archivo fuera «un solo
-- bloque», introduje una colisión sobre la misma fila que antes no existía.
--
-- El arreglo NO se hace aquí (esta migración ya está aplicada y su parte de
-- fondos entró bien): lo hace la **`0046`**, que además resultó que no era un
-- caso aislado sino uno de CINCO.
-- ============================================================================

with fondo as (
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
     and t.theme_config ? 'backgroundImage'
  returning t.slug, 'fondo'::text as cambio, v.url as valor
),
paleta as (
  update public.templates as t
     set theme_config = jsonb_set(
           t.theme_config, '{colors}',
           '{"primary":"#06b6d4","secondary":"#f43f5e","background":"#f8fafc","text":"#0f172a"}'::jsonb,
           true)
   where t.slug = 'cumpleanos-moderno'
     and t.event_type = 'Cumpleaños'
     and t.theme_config -> 'colors' is null
     and t.theme_config -> 'themePack' is null
  returning t.slug, 'paleta'::text as cambio, 'cian y rosa'::text as valor
)
select * from fondo
union all
select * from paleta
order by cambio, slug;

-- ============================================================================
-- Verificación (aparte, si se quiere confirmar después)
-- ============================================================================
-- Ningún fondo compartido dentro de la categoría — debe devolver 0 filas:
--   select theme_config #>> '{backgroundImage,url}' as f, count(*)
--     from public.templates
--    where is_active and event_type = 'Cumpleaños'
--      and theme_config ? 'backgroundImage'
--    group by 1 having count(*) > 1;
--
-- La moderna ya con paleta (debe devolver el objeto, no null):
--   select theme_config -> 'colors' from public.templates
--    where slug = 'cumpleanos-moderno';
-- ============================================================================
