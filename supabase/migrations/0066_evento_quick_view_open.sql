-- ============================================================================
-- 0066 · Evento `quick_view_open` del embudo
--
-- La vista rápida del catálogo (docs/auditoria-2026-10/14, fase 1) registra cada apertura
-- para poder medirla contra `view_template` y `start_customization`. `funnel_events` limita
-- los eventos con una restricción CHECK (0063): aquí se amplía con el evento nuevo.
--
-- No toca filas ni permisos. Idempotente: se puede volver a aplicar sin daño.
-- ============================================================================

alter table public.funnel_events drop constraint if exists funnel_events_event_chk;
alter table public.funnel_events add constraint funnel_events_event_chk check (event in (
  'view_category', 'view_template', 'quick_view_open', 'start_customization',
  'sign_up', 'complete_draft', 'view_pricing', 'begin_checkout',
  'payment_failed', 'purchase'
));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.funnel_events'::regclass
      and conname = 'funnel_events_event_chk'
      and pg_get_constraintdef(oid) like '%quick_view_open%'
  ) then
    raise exception 'funnel_events_event_chk no incluye quick_view_open';
  end if;
end
$$;
