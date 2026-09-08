-- ============================================================================
-- 0028 — El contador de las 5 plantillas originales usa la fecha del evento
-- ============================================================================
--
-- Encontrado al montar la vista de plantilla de la Fase 4. El contador resuelve
-- su objetivo así (`previews.tsx`):
--
--     const targetStr = config.useEventDate ? eventDate : config.targetDate;
--
-- y `useEventDate` tiene default `false` en el esquema. Las 5 plantillas del
-- seed original (`0003`) traen `config = {title:'Faltan', targetDate:''}`: sin
-- `useEventDate`, el contador IGNORA la fecha del evento y cae a su propio
-- `targetDate`, que está vacío. Resultado: quien elige una de esas 5 recibe una
-- invitación cuyo contador muestra «Define la fecha del evento para activar la
-- cuenta regresiva» —copy dirigido al ANFITRIÓN— aunque haya puesto la fecha en
-- Ajustes. Y si la publica, eso es lo que leen sus invitados.
--
-- Las 45 que añadió la `0015` ya traen `useEventDate: true`. Son estas 5:
--   boda-elegante · cumpleanos-moderno · xv-anos · baby-shower ·
--   evento-corporativo
-- o sea una por tipo de evento, el lote original.
--
-- Medido antes de escribir esto: de 50 plantillas activas con contador, 45 usan
-- la fecha del evento y 5 no. En invitaciones REALES hay 3 con el contador
-- muerto, las tres en BORRADOR: **0 publicadas afectadas**, así que ningún
-- invitado lo está viendo hoy. Es latente, no activo — pero está a un
-- «publicar» de distancia.
--
-- Por qué se arregla en el SEED y no en la vista de plantilla: la Fase 4 captura
-- las miniaturas contra la misma normalización que usa `createFromTemplate`,
-- justo para que la galería no pueda mostrar algo distinto de lo que se
-- entrega. Forzar `useEventDate` solo en la captura habría dado una miniatura
-- bonita y una invitación con el contador muerto — la galería mintiendo, que es
-- exactamente lo que ese diseño viene a impedir.
--
-- El `jsonb_agg` lleva `order by ord` a propósito: sin él el orden del array de
-- módulos no está garantizado, y `sort_order` no salva la portada de acabar
-- después del RSVP en la copia.
-- ============================================================================

update public.templates t
set modules_config = (
  select jsonb_agg(
           case
             when e.m->>'module_type' = 'countdown'
              and coalesce(e.m->'config'->>'useEventDate', 'false') <> 'true'
              and coalesce(e.m->'config'->>'targetDate', '') = ''
             then jsonb_set(e.m, '{config,useEventDate}', 'true'::jsonb, true)
             else e.m
           end
           order by e.ord
         )
    from jsonb_array_elements(t.modules_config) with ordinality as e(m, ord)
)
where exists (
  select 1
    from jsonb_array_elements(t.modules_config) as m
   where m->>'module_type' = 'countdown'
     and coalesce(m->'config'->>'useEventDate', 'false') <> 'true'
     and coalesce(m->'config'->>'targetDate', '') = ''
);

-- ============================================================================
-- Verificación (debe devolver 0 filas tras aplicar):
--
--   select t.slug
--     from public.templates t,
--          jsonb_array_elements(t.modules_config) as m
--    where t.is_active
--      and m->>'module_type' = 'countdown'
--      and coalesce(m->'config'->>'useEventDate', 'false') <> 'true'
--      and coalesce(m->'config'->>'targetDate', '') = '';
--
-- Y que siguen siendo 50 con contador, ninguna perdida por el rebuild:
--
--   select count(*) from public.templates t
--    where t.is_active
--      and exists (select 1 from jsonb_array_elements(t.modules_config) m
--                   where m->>'module_type' = 'countdown');
-- ============================================================================
