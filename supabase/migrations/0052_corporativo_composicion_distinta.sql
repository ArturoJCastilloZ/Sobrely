-- ============================================================================
-- 0052 — CORPORATIVO: que no compartan tampoco la COMPOSICIÓN
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano, DESPUÉS de la `0051`.
-- ⚠️ UNA SOLA SENTENCIA con `returning`. Se esperan **11 filas**.
--
-- Última categoría. **10 de las 11** estaban en la composición por defecto;
-- sólo `corporativo-reticula` (split) usa las primitivas de la Fase 11, y es la
-- única con foto de portada.
--
-- Con esto, las CINCO categorías quedan sin repetición de fondo ni de
-- composición dentro de cada una.
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
    ('corporativo-cena-fin-de-ano',    'centered', 'line',   'center'),
    ('corporativo-completo',           'plain',    'double', 'center'),
    ('corporativo-con-sede',           'centered', 'inset',  'center'),
    ('corporativo-conferencia-agenda', 'centered', 'double', 'center'),
    ('corporativo-congreso-video',     'plain',    'line',   'center'),
    ('corporativo-junta-resultados',   'plain',    'none',   'start'),
    ('corporativo-lanzamiento',        'centered', 'none',   'start'),
    ('corporativo-sencillo',           'plain',    'none',   'center'),
    ('corporativo-taller',             'plain',    'inset',  'center'),
    ('evento-corporativo',             'centered', 'line',   'start'),
    ('corporativo-reticula',           'split',    'line',   'start')
  ) as v(slug, variant, frame, align)
 where t.slug = v.slug
   and t.event_type = 'Corporativo'
   and jsonb_array_length(t.modules_config) > 1
   and t.modules_config -> 0 ->> 'module_type' = 'hero'
   and (v.variant not in ('split', 'editorial', 'offset')
        or coalesce(t.modules_config #>> '{0,config,imageUrl}', '') <> '')
returning t.slug, v.variant, v.frame, v.align;

-- ============================================================================
-- Verificación — ninguna combinación repetida, 0 filas:
--   select modules_config #>> '{0,config,variant}' as v,
--          modules_config #>> '{1,config,frame}'   as f,
--          modules_config #>> '{1,config,align}'   as a, count(*)
--     from public.templates where is_active and event_type = 'Corporativo'
--    group by 1,2,3 having count(*) > 1;
--
-- Y EL CATÁLOGO ENTERO, categoría por categoría — 0 filas:
--   select event_type,
--          modules_config #>> '{0,config,variant}' as v,
--          modules_config #>> '{1,config,frame}'   as f,
--          modules_config #>> '{1,config,align}'   as a, count(*)
--     from public.templates where is_active
--    group by 1,2,3,4 having count(*) > 1;
-- ============================================================================
