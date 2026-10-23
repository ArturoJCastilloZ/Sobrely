-- ============================================================================
-- 0058 — «Álbum de quince» incorpora una fotografía editorial propia
-- ============================================================================
--
-- La composición editorial pide una foto de portada. La nueva imagen muestra
-- únicamente el pastel y la decoración: evita rostros, marcas y el riesgo de
-- que una persona se convierta en la "anfitriona" predeterminada.
--
-- Fuente y licencia: docs/activos-de-terceros.md. La imagen se sirve local,
-- optimizada a 1600 px; no se hotlinkea el CDN de Pexels.
-- ============================================================================

update public.templates as t
   set modules_config = (
     select jsonb_agg(
              case when ord = 1 and elem->>'module_type' = 'hero'
                then jsonb_set(
                       jsonb_set(
                         jsonb_set(elem, '{config,variant}', '"editorial"'::jsonb),
                         '{config,imageUrl}', '"/arte/foto/pexels-xv-pastel.jpg"'::jsonb),
                       '{config,imageRatio}', '"3/2"'::jsonb)
                else elem
              end
              order by ord)
       from jsonb_array_elements(t.modules_config) with ordinality as e(elem, ord)
   )
 where t.slug = 'xv-con-sesion'
   and t.event_type = 'XV años'
   and t.modules_config -> 0 ->> 'module_type' = 'hero'
returning t.slug,
          t.modules_config #>> '{0,config,variant}' as variant,
          t.modules_config #>> '{0,config,imageUrl}' as image_url;
