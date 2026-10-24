-- ============================================================================
-- 0064 · Registro propio de errores (T04 del plan de 90 días)
--
-- Una tabla SOLO del servidor donde se anotan los errores que importan (pago,
-- publicación, auth, crons y cualquier error no atrapado del servidor) sin
-- depender de un servicio de terceros.
--
--   origen     de dónde viene: webhook_pago | checkout | publicar | auth |
--              reconciliar | embudo | servidor
--   severidad  critico (dinero o acceso en juego) | aviso
--   huella     sha256 de (origen + mensaje normalizado): agrupa el mismo error
--              repetido. Los números y ids del mensaje no cambian la huella.
--   mensaje    texto YA LIMPIO (sin correos, tokens, llaves ni teléfonos) y
--              recortado; el código lo filtra antes de insertar. Sin stack.
--   contexto   solo claves de una lista permitida (id de orden o de invitación,
--              código de estado, ruta del archivo). Nunca datos personales.
--   alertado_en  cuándo se mandó el correo de alerta de esta fila, si se mandó.
--
-- Acceso: igual que `funnel_events` (0063). RLS activada y SIN policies, `revoke
-- all` a anon/authenticated, `grant` a service_role. Sin filas previas.
--
-- Idempotente: se puede volver a aplicar sin daño.
-- ============================================================================

create table if not exists public.error_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  origen      text not null,
  severidad   text not null,
  huella      text not null,
  mensaje     text not null,
  contexto    jsonb not null default '{}'::jsonb,
  alertado_en timestamptz,
  constraint error_events_origen_chk check (origen in (
    'webhook_pago', 'checkout', 'publicar', 'auth', 'reconciliar', 'embudo',
    'servidor'
  )),
  constraint error_events_severidad_chk check (severidad in ('critico', 'aviso'))
);

create index if not exists error_events_created_idx
  on public.error_events (created_at desc);
create index if not exists error_events_huella_created_idx
  on public.error_events (huella, created_at desc);

alter table public.error_events enable row level security;

revoke all on table public.error_events from anon, authenticated;
grant select, insert, update on table public.error_events to service_role;

-- ----------------------------------------------------------------------------
-- Autocomprobación: si el acceso no quedó cerrado, la migración FALLA.
-- ----------------------------------------------------------------------------
do $$
begin
  if not (
    select relrowsecurity from pg_class
    where oid = 'public.error_events'::regclass
  ) then
    raise exception 'error_events: RLS NO está activada';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'error_events'
  ) then
    raise exception 'error_events: no debe tener policies (solo el servidor la usa)';
  end if;

  if has_table_privilege('anon', 'public.error_events',
       'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.error_events',
       'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'error_events: anon/authenticated NO deben tener permisos';
  end if;

  if not has_table_privilege('service_role', 'public.error_events', 'INSERT') then
    raise exception 'error_events: service_role no puede insertar';
  end if;
end
$$;
