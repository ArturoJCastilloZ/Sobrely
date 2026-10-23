-- ============================================================================
-- 0059 — «Eucalipto sereno» gana una figura fotográfica, no un telón
-- ============================================================================
--
-- La fotografía de zapatos sobre textil aporta calidez al baby shower neutro
-- sin introducir una persona, marca o código de género. Se mantiene contenida
-- en la composición editorial para reservar el espacio de lectura.
-- Fuente y licencia: docs/activos-de-terceros.md.
-- ============================================================================

update public.templates as t
   set modules_config = (
     select jsonb_agg(
              case when ord = 1 and elem->>'module_type' = 'hero'
                then jsonb_set(
                       jsonb_set(
                         jsonb_set(elem, '{config,variant}', '"editorial"'::jsonb),
                         '{config,imageUrl}', '"/arte/foto/pexels-baby-zapatos.jpg"'::jsonb),
                       '{config,imageRatio}', '"3/2"'::jsonb)
                else elem
              end
              order by ord)
       from jsonb_array_elements(t.modules_config) with ordinality as e(elem, ord)
   )
 where t.slug = 'baby-shower-neutro'
   and t.event_type = 'Baby shower'
   and t.modules_config -> 0 ->> 'module_type' = 'hero'
returning t.slug,
          t.modules_config #>> '{0,config,variant}' as variant,
          t.modules_config #>> '{0,config,imageUrl}' as image_url;
