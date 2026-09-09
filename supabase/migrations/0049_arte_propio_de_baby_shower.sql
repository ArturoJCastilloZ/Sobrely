-- ============================================================================
-- 0049 — BABY SHOWER: arte propio para las nueve que compartían fondo
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
-- ⚠️ UNA SOLA SENTENCIA con `returning`. Se esperan **9 filas**. Sin CTE: cada
--    fila se toca una vez.
--
-- La categoría tiene **12** plantillas. Tres estaban resueltas:
-- `baby-shower-neutro` (piloto) y `baby-nube-de-algodon` / `baby-punto-y-flor`
-- (Fase 11, sin telón). Las otras nueve compartían: cinco
-- `revelacion-acuarela.svg` y cuatro `baby-cielo.svg`.
--
-- ----------------------------------------------------------------------------
-- Es la categoría con MÁS pares de paleta idéntica: cuatro
-- ----------------------------------------------------------------------------
-- El color no puede distinguirlos, así que la silueta carga con casi todo:
--
--   azul cielo   baby-shower (lluvia de topos)  / sencillo (punteado)
--   marrón       animalitos (huellitas)         / con-video (móvil de cuna)
--   azul nubes   completo (banderines)          / nubes (estratos alargados)
--   salvia       neutro (eucalipto, ya hecho)   / salvia (rama de olivo)
--
-- Y dos cuidados para no chocar con otras categorías: las huellitas son
-- REDONDAS, de gatito —las de `cumpleanos-dinosaurios` son de terópodo—, y los
-- estratos son alargados y planos, frente a las nubes redondas de
-- `cumpleanos-kawaii`.
--
-- `baby-shower-sencillo` se rehízo tras mirarlo: su primera versión era tan
-- desnuda que a tamaño de miniatura no se veía nada. Sigue siendo la más
-- mínima de las nueve, pero ahora los puntos existen.
--
-- Peso en las FRANJAS LATERALES. Contraste medido: **7.70 a 12.91** (AA 4.5).
-- Media 0.6 KB gzip.
-- ============================================================================

update public.templates as t
   set theme_config = jsonb_set(
         t.theme_config, '{backgroundImage}',
         jsonb_build_object('url', v.url, 'overlay', 0), true)
  from (values
    ('baby-shower',              '/arte/baby-shower-arte.svg'),
    ('baby-shower-animalitos',   '/arte/baby-shower-animalitos-arte.svg'),
    ('baby-shower-completo',     '/arte/baby-shower-completo-arte.svg'),
    ('baby-shower-con-video',    '/arte/baby-shower-con-video-arte.svg'),
    ('baby-shower-mesa-regalos', '/arte/baby-shower-mesa-regalos-arte.svg'),
    ('baby-shower-nubes',        '/arte/baby-shower-nubes-arte.svg'),
    ('baby-shower-revelacion',   '/arte/baby-shower-revelacion-arte.svg'),
    ('baby-shower-salvia',       '/arte/baby-shower-salvia-arte.svg'),
    ('baby-shower-sencillo',     '/arte/baby-shower-sencillo-arte.svg')
  ) as v(slug, url)
 where t.slug = v.slug
   and t.event_type = 'Baby shower'
   and t.theme_config ? 'backgroundImage'
returning t.slug, v.url;

-- ============================================================================
-- Verificación (aparte) — ningún fondo compartido, 0 filas:
--   select theme_config #>> '{backgroundImage,url}' as f, count(*)
--     from public.templates
--    where is_active and event_type = 'Baby shower'
--      and theme_config ? 'backgroundImage'
--    group by 1 having count(*) > 1;
-- ============================================================================
