-- ============================================================================
-- 0009_admin.sql — Vista admin protegida + métricas (Fase 8.7)
--
-- Rol admin NO auto-asignable:
--   * El flag vive en su propia tabla `admin_users` (NO en `profiles`, que sí
--     tiene policy de update propia → un usuario podría auto-otorgarse el flag).
--   * `admin_users` no tiene policies de escritura → solo `service_role` o las
--     funciones SECURITY DEFINER de abajo escriben. El PRIMER admin se siembra
--     manualmente por SQL (bootstrap). Otorgar/revocar admin exige ser admin.
--
-- Métricas y utilidades admin como funciones SECURITY DEFINER con GATE interno
-- (`is_admin(auth.uid())`): aunque un autenticado no-admin las invoque, se
-- rechazan. El gate vive en la BD además del gate de ruta (defensa en profundidad).
-- ============================================================================

-- ============================================================================
-- admin_users — quién es admin
-- ============================================================================
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  note       text
);

alter table public.admin_users enable row level security;

-- El usuario puede leer SU propia fila (para saber si es admin). No expone a
-- otros. Sin policies de escritura → concesión solo server-side.
create policy "admin_users_select_own"
  on public.admin_users for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ============================================================================
-- is_admin — ¿el uuid dado es admin? (SECURITY DEFINER para saltar la RLS de
-- select-own cuando se consulta a otro usuario desde funciones internas).
-- ============================================================================
create or replace function public.is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = p_uid);
$$;

-- ============================================================================
-- get_admin_metrics — agregados del negocio. GATE: solo admin.
-- ============================================================================
create or replace function public.get_admin_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'orders_by_status', coalesce((
      select jsonb_object_agg(status, cnt)
      from (select status, count(*) cnt from public.orders group by status) s
    ), '{}'::jsonb),
    'revenue_paid', coalesce((
      select sum(amount) from public.orders where status = 'paid'
    ), 0),
    'refunds_total', coalesce((
      select sum(amount) from public.orders where status = 'refunded'
    ), 0),
    'orders_paid_count', (select count(*) from public.orders where status = 'paid'),
    'paying_users', (
      select count(distinct user_id) from public.orders where status = 'paid'
    ),
    'conversion_rate', (
      case when (select count(*) from public.profiles) > 0
        then round(
          (select count(distinct user_id) from public.orders where status = 'paid')::numeric
          / (select count(*) from public.profiles)::numeric, 4)
        else 0 end
    ),
    'service_requests_by_status', coalesce((
      select jsonb_object_agg(status, cnt)
      from (select status, count(*) cnt from public.service_requests group by status) s
    ), '{}'::jsonb),
    'referrals_by_status', coalesce((
      select jsonb_object_agg(status, cnt)
      from (select status, count(*) cnt from public.referrals group by status) s
    ), '{}'::jsonb),
    'referral_credit_granted', coalesce((
      select sum(amount) from public.referral_credits
    ), 0)
  ) into result;

  return result;
end;
$$;

-- ============================================================================
-- admin_list_admins — lista de admins con su email. GATE: solo admin.
-- ============================================================================
create or replace function public.admin_list_admins()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', a.user_id,
      'email', u.email,
      'granted_at', a.granted_at,
      'note', a.note
    ) order by a.granted_at
  ), '[]'::jsonb)
  into result
  from public.admin_users a
  join auth.users u on u.id = a.user_id;

  return result;
end;
$$;

-- ============================================================================
-- admin_user_id_by_email — resuelve un email a su uuid (para otorgar admin).
-- GATE: solo admin. Devuelve null si no existe.
-- ============================================================================
create or replace function public.admin_user_id_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select id into uid
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  return uid;
end;
$$;

-- ============================================================================
-- admin_recent_service_requests — solicitudes recientes con email del cliente.
-- GATE: solo admin. (Cross-user + auth.users → SECURITY DEFINER.)
-- ============================================================================
create or replace function public.admin_recent_service_requests(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into result
  from (
    select
      sr.id,
      sr.service_code,
      coalesce(sr.metadata->>'service_name', sr.service_code) as service_name,
      sr.status,
      u.email,
      sr.contact_note,
      sr.created_at
    from public.service_requests sr
    left join auth.users u on u.id = sr.user_id
    order by sr.created_at desc
    limit greatest(1, least(p_limit, 200))
  ) t;

  return result;
end;
$$;
