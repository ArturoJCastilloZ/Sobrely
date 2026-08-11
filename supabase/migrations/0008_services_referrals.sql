-- ============================================================================
-- 0008_services_referrals.sql — Servicios manuales + referidos (Fase 8.6)
--
-- Tablas:
--   * service_requests  → solicitudes de servicios asistidos (flujo manual).
--   * referral_codes    → un código de referido por usuario.
--   * referrals         → vínculo referente↔referido (un referido por persona).
--   * referral_credits  → ledger inmutable de crédito acreditado al referente.
--
-- Modelo de seguridad (idéntico a 0006, dominio crítico = dinero):
--   El dueño SOLO LEE lo suyo; NO hay policies de escritura → toda escritura es
--   server-side vía service_role (acciones de confianza + webhook de pago). Así
--   un usuario no puede auto-crear solicitudes ajenas, auto-acreditarse crédito,
--   ni fabricar referidos desde el frontend.
--
-- Nota: `invitation_renewal` (servicio no-manual) queda DIFERIDO — esta
--       migración cubre solo los servicios manuales y el programa de referidos.
-- ============================================================================

-- ============================================================================
-- service_requests — una solicitud de servicio asistido (flujo solicitud-primero)
--
-- El usuario solicita; se registra la fila (status 'pending') y se le muestran
-- instrucciones de contacto (WhatsApp). El pago se arregla manualmente; si más
-- adelante se cobra vía MP, se enlaza `order_id`. El ciclo de vida lo mueve el
-- equipo (panel admin de la Fase 8.7).
-- ============================================================================
create table if not exists public.service_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  invitation_id uuid references public.invitations (id) on delete set null,
  service_code  text not null,   -- coincide con ADDITIONAL_SERVICES[].code
  status        text not null default 'pending',
  quoted_amount numeric(10, 2),  -- precio final (los "desde $X" se cierran manual)
  currency      text not null default 'MXN',
  order_id      uuid references public.orders (id) on delete set null,
  contact_note  text,            -- lo que el usuario escribe en el formulario
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint service_requests_status_chk
    check (status in ('pending', 'contacted', 'in_progress', 'completed', 'cancelled'))
);

create index if not exists service_requests_user_id_idx
  on public.service_requests (user_id);
create index if not exists service_requests_status_idx
  on public.service_requests (status);

create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute function public.set_updated_at();

-- ============================================================================
-- referral_codes — un código estable por usuario
-- ============================================================================
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  code       text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- referrals — vínculo referente ↔ referido
--
-- Un usuario solo puede ser referido UNA vez (unique en referred_user_id).
-- Estados: pending (referido aplicó el código) → qualified (referido hizo una
-- compra pagada) → credited (se acreditó el crédito al referente).
-- ============================================================================
create table if not exists public.referrals (
  id                 uuid primary key default gen_random_uuid(),
  referrer_user_id   uuid not null references auth.users (id) on delete cascade,
  referred_user_id   uuid not null unique references auth.users (id) on delete cascade,
  status             text not null default 'pending',
  credit_amount      numeric(10, 2) not null default 0,
  qualifying_order_id uuid references public.orders (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  qualified_at       timestamptz,
  constraint referrals_status_chk
    check (status in ('pending', 'qualified', 'credited', 'cancelled')),
  -- Anti auto-referido: nadie se refiere a sí mismo.
  constraint referrals_no_self_chk
    check (referrer_user_id <> referred_user_id)
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_user_id);

create trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

-- ============================================================================
-- referral_credits — ledger INMUTABLE del crédito del referente
--
-- El saldo se deriva sumando (`sum(amount)`), no se guarda un contador mutable.
-- Auditable: cada crédito es una fila con su origen y el referral que lo generó.
-- ============================================================================
create table if not exists public.referral_credits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      numeric(10, 2) not null,
  currency    text not null default 'MXN',
  source      text not null default 'referral',
  referral_id uuid references public.referrals (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint referral_credits_source_chk
    check (source in ('referral', 'adjustment'))
);

create index if not exists referral_credits_user_id_idx
  on public.referral_credits (user_id);

-- Un referral acredita crédito una sola vez (idempotencia del fulfillment).
create unique index if not exists referral_credits_referral_unique
  on public.referral_credits (referral_id)
  where referral_id is not null;

-- ============================================================================
-- get_referrer_by_code — resuelve un código a su dueño sin exponer la tabla.
-- SECURITY DEFINER: valida el código durante la aplicación (server-side) sin
-- dar lectura pública a referral_codes.
-- ============================================================================
create or replace function public.get_referrer_by_code(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id
  from public.referral_codes
  where code = upper(trim(p_code))
  limit 1;
$$;

-- ============================================================================
-- Row Level Security — dueño LEE lo suyo; escritura solo service_role.
-- ============================================================================
alter table public.service_requests enable row level security;
alter table public.referral_codes   enable row level security;
alter table public.referrals         enable row level security;
alter table public.referral_credits  enable row level security;

-- service_requests: el dueño lee sus solicitudes.
create policy "service_requests_owner_select"
  on public.service_requests for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- referral_codes: el dueño lee su propio código.
create policy "referral_codes_owner_select"
  on public.referral_codes for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- referrals: el referente lee a quién refirió (no el referido).
create policy "referrals_referrer_select"
  on public.referrals for select
  to authenticated
  using ( (select auth.uid()) = referrer_user_id );

-- referral_credits: el dueño lee su ledger de crédito.
create policy "referral_credits_owner_select"
  on public.referral_credits for select
  to authenticated
  using ( (select auth.uid()) = user_id );
