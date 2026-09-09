-- ============================================================================
-- 0050 — BABY SHOWER: que no compartan tampoco la COMPOSICIÓN
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano, DESPUÉS de la `0049`.
-- ⚠️ UNA SOLA SENTENCIA con `returning`. Se esperan **12 filas**.
--
-- Medido: **10 de las 12** en la composición por defecto. Sólo
-- `baby-nube-de-algodon` (editorial) y `baby-punto-y-flor` (plain) usan las
-- primitivas de la Fase 11.
--
-- `split`, `editorial` y `offset` piden fotografía de portada. Aquí la única
-- que la tiene es `baby-nube-de-algodon`; `baby-punto-y-flor` lleva su imagen
-- en el SLOT del módulo, no en la portada, y por eso va en `plain` — la guarda
-- lo comprueba contra `hero.imageUrl`, que es lo que la variante necesita.
-- ============================================================================

update public.templates as t
   set modules_config = (
     select jsonb_agg(
              case
                when elem->>'module_type' = 'hero'
                  then jsonb_set(elem, '{config,variant}', to_jsonb(v.variant))
                when ord <= 3
                  then jsonb_set(
                         jsonb_set(elem, '{config,frame}', to_jsonb(v.frame)),
                         '{config,align}', to_jsonb(v.align))
                else jsonb_set(elem, '{config,align}', to_jsonb(v.align))
              end
              order by ord)
       from jsonb_array_elements(t.modules_config) with ordinality as e(elem, ord)
   )
  from (values
    ('baby-shower',              'centered',  'line',   'center'),
    ('baby-shower-animalitos',   'centered',  'none',   'start'),
    ('baby-shower-completo',     'plain',     'double', 'center'),
    ('baby-shower-con-video',    'centered',  'inset',  'center'),
    ('baby-shower-mesa-regalos', 'plain',     'line',   'center'),
    ('baby-shower-neutro',       'centered',  'double', 'center'),
    ('baby-shower-nubes',        'plain',     'inset',  'center'),
    ('baby-shower-revelacion',   'centered',  'line',   'start'),
    ('baby-shower-salvia',       'plain',     'line',   'start'),
    ('baby-shower-sencillo',     'plain',     'none',   'start'),
    ('baby-nube-de-algodon',     'editorial', 'inset',  'center'),
    ('baby-punto-y-flor',        'plain',     'none',   'center')
  ) as v(slug, variant, frame, align)
 where t.slug = v.slug
   and t.event_type = 'Baby shower'
   and jsonb_array_length(t.modules_config) > 1
   and t.modules_config -> 0 ->> 'module_type' = 'hero'
   and (v.variant not in ('split', 'editorial', 'offset')
        or coalesce(t.modules_config #>> '{0,config,imageUrl}', '') <> '')
returning t.slug, v.variant, v.frame, v.align;

-- ============================================================================
-- Verificación (aparte) — ninguna combinación repetida, 0 filas:
--   select modules_config #>> '{0,config,variant}' as v,
--          modules_config #>> '{1,config,frame}'   as f,
--          modules_config #>> '{1,config,align}'   as a, count(*)
--     from public.templates where is_active and event_type = 'Baby shower'
--    group by 1,2,3 having count(*) > 1;
-- ============================================================================
