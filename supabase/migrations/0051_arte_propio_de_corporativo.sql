-- ============================================================================
-- 0051 — CORPORATIVO: arte propio para las nueve que compartían fondo
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
-- ⚠️ UNA SOLA SENTENCIA con `returning`. Se esperan **9 filas**. Sin CTE.
--
-- ÚLTIMA de las cinco categorías. Tiene **11** plantillas; dos estaban
-- resueltas: `corporativo-sencillo` (piloto) y `corporativo-reticula`
-- (Fase 11, con foto y sin telón). Las otras nueve compartían: cinco
-- `corp-lineas.svg` y cuatro `corp-papel.svg`.
--
-- ----------------------------------------------------------------------------
-- El peor caso de paleta repetida de todo el catálogo
-- ----------------------------------------------------------------------------
-- **CUATRO** plantillas con el mismo azul marino del pack `corporativo-limpio`
-- —en las demás categorías eran pares—. Las cuatro siluetas tuvieron que
-- separarse entre sí:
--
--   completo            línea de tiempo con hitos
--   conferencia-agenda  marcas horarias
--   congreso-video      pantalla de proyección con haz
--   taller              cuadrícula milimetrada
--
-- Y un par más: `evento-corporativo` comparte el azul de `corporativo-sencillo`,
-- que ya lleva la greca griega; a éste le toca el circuito de nodos.
--
-- Las otras tres: guirnalda de bombillas (cena), plano con pin (con-sede),
-- barras de gráfico (junta-resultados) y haz de foco (lanzamiento).
--
-- `taller` y `lanzamiento` se rehicieron tras mirarlos: la cuadrícula y el haz
-- estaban tan tenues que no se veían. Y `completo` se atenuó en el CENTRO —lo
-- único que cuesta contraste— porque se quedaba en 4.68 con AA en 4.5; su línea
-- de tiempo lateral no se tocó, que ahí el arte es gratis.
--
-- Contraste medido: **6.31 a 14.31**. Media 0.6 KB gzip.
--
-- ⚠️ Deuda que esto NO arregla: `corporativo-cena-fin-de-ano` usa el pack
-- `boda-lujo`, cruzando de categoría. Su arte va en ese dorado, pero la paleta
-- prestada sigue pendiente de decisión.
-- ============================================================================

update public.templates as t
   set theme_config = jsonb_set(
         t.theme_config, '{backgroundImage}',
         jsonb_build_object('url', v.url, 'overlay', 0), true)
  from (values
    ('corporativo-cena-fin-de-ano',    '/arte/corporativo-cena-fin-de-ano-arte.svg'),
    ('corporativo-completo',           '/arte/corporativo-completo-arte.svg'),
    ('corporativo-con-sede',           '/arte/corporativo-con-sede-arte.svg'),
    ('corporativo-conferencia-agenda', '/arte/corporativo-conferencia-agenda-arte.svg'),
    ('corporativo-congreso-video',     '/arte/corporativo-congreso-video-arte.svg'),
    ('corporativo-junta-resultados',   '/arte/corporativo-junta-resultados-arte.svg'),
    ('corporativo-lanzamiento',        '/arte/corporativo-lanzamiento-arte.svg'),
    ('corporativo-taller',             '/arte/corporativo-taller-arte.svg'),
    ('evento-corporativo',             '/arte/evento-corporativo-arte.svg')
  ) as v(slug, url)
 where t.slug = v.slug
   and t.event_type = 'Corporativo'
   and t.theme_config ? 'backgroundImage'
returning t.slug, v.url;

-- ============================================================================
-- Verificación — ningún fondo compartido, 0 filas:
--   select theme_config #>> '{backgroundImage,url}' as f, count(*)
--     from public.templates
--    where is_active and event_type = 'Corporativo'
--      and theme_config ? 'backgroundImage'
--    group by 1 having count(*) > 1;
--
-- Y EN TODO EL CATÁLOGO, ya sin ninguna categoría pendiente — 0 filas:
--   select event_type, theme_config #>> '{backgroundImage,url}' as f, count(*)
--     from public.templates
--    where is_active and theme_config ? 'backgroundImage'
--    group by 1,2 having count(*) > 1;
-- ============================================================================
