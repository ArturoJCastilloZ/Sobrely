-- ============================================================================
-- 0048 — XV AÑOS: que no compartan tampoco la COMPOSICIÓN
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano, DESPUÉS de la `0047`.
-- ⚠️ UNA SOLA SENTENCIA con `returning`. Se esperan **12 filas**.
--
-- Medido: **10 de las 12** están en la composición por defecto. Sólo
-- `xv-corona` (editorial) y `xv-seda` (split) usan las primitivas de la Fase 11
-- — y las dos tienen foto de portada, que es lo que esas variantes necesitan.
--
-- `split`, `editorial` y `offset` piden fotografía: el peso visual lo lleva la
-- imagen. Sin ella el título queda pequeño y a un lado, sin jerarquía. La
-- guarda cubre las tres.
--
-- Las diez sin foto se reparten entre `centered` y `plain`. El marco va sólo en
-- los DOS primeros módulos de sección.
--
-- ⚠️ `xv-noche-estelar` y `xv-produccion-completa` van sobre fondo OSCURO
-- (pack `noche-estelar`, `background #0e1230` con texto claro). No se les toca
-- el fondo — cada una ya tiene el suyo—, sólo la composición, que es
-- independiente de la polaridad.
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
    ('xv-anos',                'centered',  'line',   'center'),
    ('xv-clasicos-elegantes',  'plain',     'double', 'center'),
    ('xv-con-salon',           'centered',  'inset',  'center'),
    ('xv-con-sesion',          'centered',  'double', 'center'),
    ('xv-con-video',           'plain',     'line',   'center'),
    ('xv-glam-moderno',        'centered',  'none',   'start'),
    ('xv-manuscrita',          'plain',     'none',   'center'),
    ('xv-noche-estelar',       'centered',  'line',   'start'),
    ('xv-produccion-completa', 'plain',     'inset',  'center'),
    ('xv-sencillos',           'plain',     'none',   'start'),
    ('xv-corona',              'editorial', 'none',   'start'),
    ('xv-seda',                'split',     'double', 'center')
  ) as v(slug, variant, frame, align)
 where t.slug = v.slug
   and t.event_type = 'XV años'
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
--     from public.templates where is_active and event_type = 'XV años'
--    group by 1,2,3 having count(*) > 1;
--
-- Y en TODO el catálogo, nadie sin foto en variante que la pide — 0 filas:
--   select slug from public.templates
--    where is_active
--      and modules_config #>> '{0,config,variant}' in ('split','editorial','offset')
--      and coalesce(modules_config #>> '{0,config,imageUrl}', '') = '';
-- ============================================================================
