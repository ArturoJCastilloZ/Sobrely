-- ============================================================================
-- 0043 — `editorial` y `offset` también piden foto: corrige dos bodas
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- La `0042` repartió la composición de las 13 bodas y **once quedaron bien**.
-- Dos no, y son justo las que se avisó que había que mirar:
--
--   `boda-destino`      editorial + sin foto
--   `boda-en-la-playa`  offset    + sin foto
--
-- Miradas en la miniatura: el título sale pequeño y arriba a la izquierda, sin
-- jerarquía, y se lee como el encabezado de un documento en vez de como una
-- portada. Al lado, `boda-elegante` con `centered` pone el nombre grande y
-- centrado y sí funciona.
--
-- ----------------------------------------------------------------------------
-- La regla que faltaba
-- ----------------------------------------------------------------------------
-- La `0042` guardaba `split` porque sin imagen reserva media caja vacía. La
-- regla era CORRECTA pero INCOMPLETA: `editorial` y `offset` sufren lo mismo
-- por otro camino. No dejan un hueco — dejan el texto sin nada que lo sostenga.
--
--     HERO_TEXTO_CLASSES.offset     items-start  max-w-xl
--     HERO_TEXTO_CLASSES.editorial  items-start  max-w-3xl
--
-- Las tres están pensadas para que el PESO lo lleve la fotografía y el texto la
-- acompañe. Sin foto sólo sirven `centered` y `plain`, que centran y dan al
-- título el tamaño de portada.
--
-- Esto no se dedujo del código: se vio MIRANDO las miniaturas. La prueba de la
-- `0042` ya recoge la regla ampliada para que no vuelva a colarse.
--
-- ----------------------------------------------------------------------------
-- Adónde van, sin repetir combinación
-- ----------------------------------------------------------------------------
--   boda-destino      -> plain    + line + center
--   boda-en-la-playa  -> centered + none + start
--
-- Las dos combinaciones estaban libres; el resto de las once no se toca.
-- `editorial` se queda sólo en `boda-papel-y-lino`, que SÍ tiene foto.
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
    ('boda-destino',     'plain',    'line', 'center'),
    ('boda-en-la-playa', 'centered', 'none', 'start')
  ) as v(slug, variant, frame, align)
 where t.slug = v.slug
   and t.event_type = 'Boda'
   and t.modules_config -> 0 ->> 'module_type' = 'hero'
   -- Sólo si siguen en la variante que venimos a quitar: si el dev ya las tocó
   -- a mano, esta migración no le pisa el cambio.
   and t.modules_config #>> '{0,config,variant}' in ('editorial', 'offset');

-- ============================================================================
-- Verificación
-- ============================================================================
--   select slug, modules_config #>> '{0,config,variant}' as variante
--     from public.templates
--    where is_active and event_type = 'Boda' order by slug;
--
-- Ninguna plantilla SIN foto puede quedar en split/editorial/offset
-- (debe devolver 0 filas):
--   select slug, modules_config #>> '{0,config,variant}'
--     from public.templates
--    where is_active
--      and modules_config #>> '{0,config,variant}' in ('split','editorial','offset')
--      and coalesce(modules_config #>> '{0,config,imageUrl}', '') = '';
--
-- Las 13 combinaciones siguen siendo distintas (debe devolver 0 filas):
--   select modules_config #>> '{0,config,variant}' as v,
--          modules_config #>> '{1,config,frame}'   as f,
--          modules_config #>> '{1,config,align}'   as a, count(*)
--     from public.templates where is_active and event_type = 'Boda'
--    group by 1,2,3 having count(*) > 1;
--
-- Después: `node scripts/capturar-miniaturas.mts boda-destino boda-en-la-playa`
-- ============================================================================
