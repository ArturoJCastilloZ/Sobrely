-- ============================================================================
-- 0061 · Recordatorios por correo al borrador sin publicar (Fase 5)
--
-- Dos tablas, ambas SOLO del servidor:
--
--   reminder_preferences  una fila por persona que ALGUNA VEZ decidió algo sobre
--                         los recordatorios. `opted_in` es la decisión vigente;
--                         `consent_text_version` y `decided_at` dejan constancia
--                         de QUÉ aceptó y CUÁNDO (LFPDPPP). Sin fila = sin
--                         consentimiento = no se le escribe. Nunca se infiere
--                         consentimiento de la ausencia de una baja.
--
--   reminder_log          un renglón por (invitación, tipo) YA RECLAMADO para
--                         enviar. El `unique (invitation_id, kind)` es lo que
--                         vuelve el envío idempotente: dos ejecuciones del cron
--                         a la vez (o un reintento) no pueden mandar el mismo
--                         correo dos veces, porque la segunda choca al reclamar.
--
-- Acceso: igual que `invitation_previews` (0060). RLS activada y SIN policies,
-- `revoke all` explícito a anon/authenticated, `grant` a `service_role`. La
-- persona decide desde server actions que primero comprueban su sesión; nunca
-- toca estas tablas.
--
-- LO QUE ESTA MIGRACIÓN NO HACE: no envía nada ni programa nada. El envío lo
-- dispara un cron que está APAGADO hasta que se defina `REMINDERS_ENABLED=1`.
-- No hay filas de consentimiento previas: nadie de la base actual recibe correo
-- hasta que lo acepte.
--
-- Idempotente: se puede volver a aplicar sin daño.
-- ============================================================================

create table if not exists public.reminder_preferences (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  opted_in             boolean not null,
  -- Versión del texto que la persona vio al decidir (p. ej. 'v1-2026-10').
  consent_text_version text not null,
  -- De dónde vino la decisión: registro | panel | baja.
  source               text not null,
  decided_at           timestamptz not null default now(),
  constraint reminder_preferences_source_chk
    check (source in ('registro', 'panel', 'baja'))
);

create table if not exists public.reminder_log (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  -- Denormalizado a propósito: el tope «un correo por persona por día» se
  -- consulta por persona y no debe depender de un join con invitaciones.
  user_id       uuid not null references auth.users (id) on delete cascade,
  kind          text not null,
  sent_at       timestamptz not null default now(),
  constraint reminder_log_kind_chk
    check (kind in ('borrador_24h', 'borrador_3d', 'evento_7d')),
  constraint reminder_log_una_vez unique (invitation_id, kind)
);

create index if not exists reminder_log_user_sent_idx
  on public.reminder_log (user_id, sent_at desc);

alter table public.reminder_preferences enable row level security;
alter table public.reminder_log enable row level security;

revoke all on table public.reminder_preferences from anon, authenticated;
revoke all on table public.reminder_log from anon, authenticated;
grant select, insert, update on table public.reminder_preferences to service_role;
-- `delete` en el log: si el envío falla se retira el reclamo para reintentar.
grant select, insert, delete on table public.reminder_log to service_role;

-- ----------------------------------------------------------------------------
-- Autocomprobación: si el acceso no quedó cerrado, la migración FALLA.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['reminder_preferences', 'reminder_log'] loop
    if not (
      select relrowsecurity from pg_class
      where oid = ('public.' || t)::regclass
    ) then
      raise exception '%: RLS NO está activada', t;
    end if;

    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t
    ) then
      raise exception '%: no debe tener policies (solo el servidor la usa)', t;
    end if;

    if has_table_privilege('anon', 'public.' || t,
         'SELECT, INSERT, UPDATE, DELETE')
       or has_table_privilege('authenticated', 'public.' || t,
         'SELECT, INSERT, UPDATE, DELETE') then
      raise exception '%: anon/authenticated NO deben tener permisos', t;
    end if;

    if not has_table_privilege('service_role', 'public.' || t, 'SELECT') then
      raise exception '%: service_role no puede leer la tabla', t;
    end if;
  end loop;
end
$$;
