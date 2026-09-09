-- ============================================================================
-- 0045 — CUMPLEAÑOS: que no compartan tampoco la COMPOSICIÓN
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano, DESPUÉS de la `0044`.
--
-- ⚠️ SE EJECUTA COMO UN SOLO BLOQUE y termina con `returning`: devuelve UNA
-- FILA POR PLANTILLA CAMBIADA. Se esperan **12 filas**. Si salen menos, alguna
-- guarda las descartó; si no sale ninguna, no se ejecutó el `update` sino sólo
-- los comentarios.
--
-- ----------------------------------------------------------------------------
-- Qué hace
-- ----------------------------------------------------------------------------
-- Medido: **10 de las 12** están en la composición por defecto —`variant`,
-- `frame` y `align` sin tocar—. Sólo `cumpleanos-arco` (split) y
-- `cumpleanos-papel-picado` (editorial) usan las primitivas de la Fase 11.
-- Cada una recibe una combinación ÚNICA de (variant, frame, align).
--
-- ----------------------------------------------------------------------------
-- La regla, ya aprendida y aplicada de entrada
-- ----------------------------------------------------------------------------
-- `split`, `editorial` y `offset` **piden fotografía de portada**: el peso
-- visual lo lleva la imagen. Sin ella, `split` reserva media caja vacía y las
-- otras dos dejan el título pequeño y a un lado, sin jerarquía — se lee como el
-- encabezado de un documento. Se descubrió MIRANDO las miniaturas de Boda y
-- costó la `0043`; aquí la guarda cubre las tres desde el principio.
--
-- Aquí sólo `arco` y `papel-picado` tienen foto, y son las dos que ya usan esas
-- variantes. Las otras diez se reparten entre `centered` y `plain`.
--
-- El marco va sólo en los DOS primeros módulos de sección: repetirlo en los
-- diez satura y es justo lo que volvería a igualarlas.
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
    ('cumpleanos-adulto',       'plain',     'none',   'center'),
    ('cumpleanos-con-video',    'centered',  'line',   'center'),
    ('cumpleanos-dinosaurios',  'centered',  'none',   'start'),
    ('cumpleanos-futbol',       'centered',  'double', 'center'),
    ('cumpleanos-galaxia',      'plain',     'inset',  'center'),
    ('cumpleanos-infantil',     'centered',  'inset',  'center'),
    ('cumpleanos-kawaii',       'plain',     'line',   'start'),
    ('cumpleanos-moderno',      'centered',  'none',   'center'),
    ('cumpleanos-sencillo',     'plain',     'none',   'start'),
    ('cumpleanos-superheroes',  'centered',  'line',   'start'),
    ('cumpleanos-arco',         'split',     'line',   'center'),
    ('cumpleanos-papel-picado', 'editorial', 'double', 'center')
  ) as v(slug, variant, frame, align)
 where t.slug = v.slug
   and t.event_type = 'Cumpleaños'
   and jsonb_array_length(t.modules_config) > 1
   and t.modules_config -> 0 ->> 'module_type' = 'hero'
   and (v.variant not in ('split', 'editorial', 'offset')
        or coalesce(t.modules_config #>> '{0,config,imageUrl}', '') <> '')
returning t.slug, v.variant, v.frame, v.align;

-- ============================================================================
-- Verificación (aparte)
-- ============================================================================
-- Ninguna combinación repetida — 0 filas:
--   select modules_config #>> '{0,config,variant}' as v,
--          modules_config #>> '{1,config,frame}'   as f,
--          modules_config #>> '{1,config,align}'   as a, count(*)
--     from public.templates where is_active and event_type = 'Cumpleaños'
--    group by 1,2,3 having count(*) > 1;
--
-- Y en TODO el catálogo, nadie sin foto en una variante que la pide — 0 filas:
--   select slug from public.templates
--    where is_active
--      and modules_config #>> '{0,config,variant}' in ('split','editorial','offset')
--      and coalesce(modules_config #>> '{0,config,imageUrl}', '') = '';
-- ============================================================================
