-- ============================================================================
-- 0063 · Eventos del embudo (T05 del plan de 90 días)
--
-- Una tabla SOLO del servidor para contar el embudo comercial sin depender de
-- terceros ni de que el navegador del visitante deje correr un script.
--
--   event       uno de los 9 eventos del embudo (docs/auditoria-2026-10/07).
--               `page_view` no está: lo cubre Vercel Web Analytics.
--   event_key   huella sha256 de la clave de idempotencia (p. ej. el id de la
--               orden). Es opaca a propósito: la tabla no guarda ids de personas
--               ni de invitaciones.
--   params      parámetros ACOTADOS (plantilla, tipo de evento, plan, monto).
--               Nunca nombres, correos, teléfonos ni texto de invitaciones; el
--               código filtra por lista permitida antes de insertar.
--
-- `unique (event, event_key)` vuelve cada evento idempotente: un webhook
-- repetido o un doble clic no cuenta dos veces.
--
-- Acceso: igual que `reminder_log` (0061). RLS activada y SIN policies, `revoke
-- all` a anon/authenticated, `grant` a service_role. Sin filas previas.
--
-- Idempotente: se puede volver a aplicar sin daño.
-- ============================================================================

create table if not exists public.funnel_events (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event      text not null,
  event_key  text not null,
  params     jsonb not null default '{}'::jsonb,
  constraint funnel_events_event_chk check (event in (
    'view_category', 'view_template', 'start_customization', 'sign_up',
    'complete_draft', 'view_pricing', 'begin_checkout', 'payment_failed',
    'purchase'
  )),
  constraint funnel_events_una_vez unique (event, event_key)
);

create index if not exists funnel_events_event_created_idx
  on public.funnel_events (event, created_at desc);

alter table public.funnel_events enable row level security;

revoke all on table public.funnel_events from anon, authenticated;
grant select, insert on table public.funnel_events to service_role;

-- ----------------------------------------------------------------------------
-- Autocomprobación: si el acceso no quedó cerrado, la migración FALLA.
-- ----------------------------------------------------------------------------
do $$
begin
  if not (
    select relrowsecurity from pg_class
    where oid = 'public.funnel_events'::regclass
  ) then
    raise exception 'funnel_events: RLS NO está activada';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'funnel_events'
  ) then
    raise exception 'funnel_events: no debe tener policies (solo el servidor la usa)';
  end if;

  if has_table_privilege('anon', 'public.funnel_events',
       'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.funnel_events',
       'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'funnel_events: anon/authenticated NO deben tener permisos';
  end if;

  if not has_table_privilege('service_role', 'public.funnel_events', 'INSERT') then
    raise exception 'funnel_events: service_role no puede insertar';
  end if;
end
$$;
