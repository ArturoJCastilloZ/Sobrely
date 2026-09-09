-- ============================================================================
-- 0042 — BODA: que no compartan tampoco la COMPOSICIÓN
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- Las 13 bodas ya tienen 13 fondos distintos (`0040`, `0041`). Siguen viéndose
-- parecidas porque comparten algo que pesa más: **la composición**.
--
-- Medido sobre las 65 activas: el producto tiene 5 variantes de portada,
-- 4 marcos, 3 alineaciones y 2 sangrados, y **casi nadie los usa**:
--
--     hero.variant   50 de 65 en defecto
--     frame         415 módulos en defecto
--     align         437 en defecto
--     bleed         460 en defecto — CERO usan `full`
--
-- O sea: las primitivas de la Fase 11 están en el esquema y en el renderer, y
-- el catálogo entero se dibuja con la misma combinación. Esta migración le da a
-- cada boda una combinación ÚNICA de (variant, frame, align).
--
-- ----------------------------------------------------------------------------
-- Dos decisiones que acotan el riesgo
-- ----------------------------------------------------------------------------
-- 1. `split` sólo donde HAY foto de portada. Sin imagen, esa variante reserva
--    media caja para una figura que no existe (`@2xl/inv:w-1/2` en
--    `HERO_TEXTO_CLASSES`). Las nueve sin foto se reparten entre `centered`,
--    `offset`, `editorial` y `plain`, que componen el TEXTO y no dependen de
--    la imagen.
-- 2. El `frame` va sólo en los DOS primeros módulos de sección, no en los diez.
--    Un marco repetido en cada sección satura y además es justo lo que
--    volvería a igualarlas. Arriba es donde se ve, y es lo que entra en la
--    miniatura.
--
-- ----------------------------------------------------------------------------
-- El reparto (las 13 combinaciones son distintas entre sí)
-- ----------------------------------------------------------------------------
--   botanica          centered  line    center      carta-romantica  plain   none   center
--   cinematografica   centered  double  center      de-lujo          plain   double center
--   destino           editorial line    start       elegante         centered inset center
--   en-la-playa       offset    none    start       jardin           centered inset start
--   minimalista       plain     none    start       terracota        centered line   start
--   jardin-partido    split     line    center      marco-nuestro    split   double center
--   papel-y-lino      editorial inset   center
--
-- `boda-minimalista` va con `plain` + `align: start` + sin marco: es lo que
-- promete su descripción — «sin adornos, todo tipografía»— y ya se quedó sin
-- telón en la `0041`.
-- ============================================================================

update public.templates as t
   set modules_config = (
     select jsonb_agg(
              case
                when elem->>'module_type' = 'hero'
                  then jsonb_set(elem, '{config,variant}', to_jsonb(v.variant))
                -- Sólo los dos primeros módulos de sección llevan marco.
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
    ('boda-botanica',        'centered',  'line',   'center'),
    ('boda-carta-romantica', 'plain',     'none',   'center'),
    ('boda-cinematografica', 'centered',  'double', 'center'),
    ('boda-de-lujo',         'plain',     'double', 'center'),
    ('boda-destino',         'editorial', 'line',   'start'),
    ('boda-elegante',        'centered',  'inset',  'center'),
    ('boda-en-la-playa',     'offset',    'none',   'start'),
    ('boda-jardin',          'centered',  'inset',  'start'),
    ('boda-minimalista',     'plain',     'none',   'start'),
    ('boda-terracota',       'centered',  'line',   'start'),
    ('boda-jardin-partido',  'split',     'line',   'center'),
    ('boda-marco-nuestro',   'split',     'double', 'center'),
    ('boda-papel-y-lino',    'editorial', 'inset',  'center')
  ) as v(slug, variant, frame, align)
 where t.slug = v.slug
   and t.event_type = 'Boda'
   -- Guardas de forma: que siga habiendo módulos y que el primero sea el hero.
   and jsonb_array_length(t.modules_config) > 1
   and t.modules_config -> 0 ->> 'module_type' = 'hero'
   -- `split` sólo si de verdad hay foto de portada; si alguna la perdió, esta
   -- fila no se toca en vez de dejar media caja vacía.
   and (v.variant <> 'split'
        or coalesce(t.modules_config #>> '{0,config,imageUrl}', '') <> '');

-- ============================================================================
-- Verificación
-- ============================================================================
--   select slug,
--          modules_config #>> '{0,config,variant}' as variante,
--          modules_config #>> '{1,config,frame}'   as marco,
--          modules_config #>> '{1,config,align}'   as alineacion
--     from public.templates
--    where is_active and event_type = 'Boda' order by slug;      -- 13 filas
--
-- Ninguna combinación repetida (debe devolver 0 filas):
--   select modules_config #>> '{0,config,variant}' as v,
--          modules_config #>> '{1,config,frame}'   as f,
--          modules_config #>> '{1,config,align}'   as a, count(*)
--     from public.templates where is_active and event_type = 'Boda'
--    group by 1,2,3 having count(*) > 1;
--
-- Que las dos `split` conserven su foto (debe devolver 2):
--   select count(*) from public.templates
--    where slug in ('boda-jardin-partido','boda-marco-nuestro')
--      and coalesce(modules_config #>> '{0,config,imageUrl}','') <> '';
--
-- Después: `node scripts/capturar-miniaturas.mts` de las 13 y MIRARLAS. Si
-- `offset` o `editorial` sin foto no cuajan, se corrigen en una 0043 — el
-- cambio es cosmético y reversible.
-- ============================================================================
