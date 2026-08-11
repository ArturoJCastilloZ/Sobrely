-- ============================================================================
-- 0006_monetization.sql — Capa comercial (Fase 8.2)
--
-- Tablas: plans, invitation_entitlements, orders.
-- (No se crea `subscriptions`: el modelo es pago ÚNICO por evento, no
--  recurrente. La tabla queda documentada como no-necesaria para este modelo.)
--
-- Modelo de seguridad (dominio crítico = dinero):
--   * `plans`      → lectura pública de planes activos; SIN policies de
--                    escritura → solo el service_role (migraciones/panel) escribe.
--   * `orders`     → el dueño solo LEE sus órdenes; SIN policies de escritura →
--                    solo el service_role (webhook de pago server-side) crea o
--                    actualiza órdenes. El cliente NUNCA fija `status = 'paid'`.
--   * `invitation_entitlements` → el dueño (vía propiedad de la invitación) solo
--                    LEE; SIN policies de escritura → el entitlement se otorga
--                    únicamente server-side tras confirmación del pago. Así un
--                    usuario NO puede auto-otorgarse premium desde el frontend.
-- ============================================================================

-- ============================================================================
-- plans — fuente de verdad en BD (sembrada desde src/lib/billing/plans.ts)
-- ============================================================================
create table if not exists public.plans (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null unique,
  name                   text not null,
  description            text,
  currency               text not null default 'MXN',
  billing_type           text not null,
  price_launch           numeric(10, 2) not null default 0,
  price_regular          numeric(10, 2) not null default 0,
  -- Vigencia (ver resolveExpiry en el código):
  publish_trial_days     integer,          -- demo al publicar en Free (Free=14)
  grace_days_after_event integer,          -- margen tras el evento (pagados)
  fallback_duration_days integer not null, -- si la invitación no tiene fecha
  max_guests             integer not null,
  max_storage_mb         integer not null,
  allowed_modules        jsonb not null default '[]'::jsonb,
  features               jsonb not null default '[]'::jsonb,
  coming_soon            jsonb not null default '[]'::jsonb,
  branding               text not null default 'none',
  is_recommended         boolean not null default false,
  is_active              boolean not null default true,
  display_order          integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint plans_billing_type_chk check (billing_type in ('free', 'per_event')),
  constraint plans_branding_chk check (branding in ('full', 'reduced', 'none'))
);

create index if not exists plans_active_order_idx
  on public.plans (is_active, display_order);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ============================================================================
-- orders — una compra (plan, servicio o renovación)
-- ============================================================================
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  invitation_id       uuid references public.invitations (id) on delete set null,
  plan_id             uuid references public.plans (id) on delete set null,
  product_type        text not null,
  amount              numeric(10, 2) not null,
  currency            text not null default 'MXN',
  status              text not null default 'pending',
  payment_provider    text,
  provider_order_id   text,   -- p.ej. id de la preferencia de Mercado Pago
  provider_payment_id text,   -- id del pago confirmado (idempotencia)
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_product_type_chk
    check (product_type in ('plan', 'service', 'renewal')),
  constraint orders_status_chk
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded'))
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_invitation_id_idx on public.orders (invitation_id);
create index if not exists orders_status_idx on public.orders (status);

-- Idempotencia / anti-webhook-duplicado: un pago confirmado del proveedor no
-- puede registrarse dos veces.
create unique index if not exists orders_provider_payment_unique
  on public.orders (payment_provider, provider_payment_id)
  where provider_payment_id is not null;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================================
-- invitation_entitlements — el plan aplicado a UNA invitación (1:1)
-- ============================================================================
create table if not exists public.invitation_entitlements (
  id                uuid primary key default gen_random_uuid(),
  invitation_id     uuid not null unique references public.invitations (id) on delete cascade,
  plan_id           uuid not null references public.plans (id),
  status            text not null default 'pending',
  starts_at         timestamptz,
  expires_at        timestamptz,
  guest_limit       integer,
  feature_overrides jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint invitation_entitlements_status_chk
    check (status in ('pending', 'active', 'expired', 'revoked'))
);

create index if not exists invitation_entitlements_plan_id_idx
  on public.invitation_entitlements (plan_id);
create index if not exists invitation_entitlements_expires_at_idx
  on public.invitation_entitlements (expires_at);

create trigger invitation_entitlements_set_updated_at
  before update on public.invitation_entitlements
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Funciones de verificación de entitlements (read-only, SECURITY DEFINER)
-- La expiración se evalúa DINÁMICAMENTE contra now(): una fila `active` cuyo
-- `expires_at` ya pasó se considera expirada aunque su columna `status` no se
-- haya barrido todavía.
-- ============================================================================

-- ¿La invitación tiene un entitlement vigente ahora?
create or replace function public.is_entitlement_active(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invitation_entitlements e
    where e.invitation_id = p_invitation_id
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Código del plan efectivo de una invitación (o null si no tiene entitlement
-- vigente). Útil para derivar límites/módulos server-side.
create or replace function public.invitation_effective_plan(p_invitation_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.code
  from public.invitation_entitlements e
  join public.plans p on p.id = e.plan_id
  where e.invitation_id = p_invitation_id
    and e.status = 'active'
    and (e.expires_at is null or e.expires_at > now())
  limit 1;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.plans                   enable row level security;
alter table public.orders                  enable row level security;
alter table public.invitation_entitlements enable row level security;

-- ---------------------------------------------------------------------------
-- plans: lectura pública de planes activos. Sin policies de escritura →
-- solo el service_role puede modificar (panel admin / seed).
-- ---------------------------------------------------------------------------
create policy "plans_select_active_public"
  on public.plans for select
  to anon, authenticated
  using ( is_active = true );

-- ---------------------------------------------------------------------------
-- orders: el dueño solo LEE sus órdenes. Sin policies de escritura → las
-- órdenes se crean/actualizan únicamente server-side (service_role).
-- ---------------------------------------------------------------------------
create policy "orders_owner_select"
  on public.orders for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- ---------------------------------------------------------------------------
-- invitation_entitlements: el dueño de la invitación LEE su entitlement.
-- Sin policies de escritura → el entitlement se otorga solo server-side tras
-- pago confirmado. El usuario NO puede auto-otorgarse premium.
-- ---------------------------------------------------------------------------
create policy "invitation_entitlements_owner_select"
  on public.invitation_entitlements for select
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_entitlements.invitation_id
        and i.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- Seed de planes (idempotente) — refleja src/lib/billing/plans.ts.
-- Mantener sincronizado con el archivo tipado (la fuente de verdad del código).
-- ============================================================================
insert into public.plans (
  code, name, description, currency, billing_type,
  price_launch, price_regular,
  publish_trial_days, grace_days_after_event, fallback_duration_days,
  max_guests, max_storage_mb,
  allowed_modules, features, coming_soon,
  branding, is_recommended, is_active, display_order
) values
  (
    'free', 'Free',
    'Arma tu invitación y vela en preview sin costo. Publícala como demo por 14 días o elige un plan para tu evento.',
    'MXN', 'free', 0, 0,
    14, null, 14,
    25, 50,
    '["hero","welcome","countdown","rsvp"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'full', false, true, 1
  ),
  (
    'esencial', 'Esencial',
    'Publica una invitación con lo esencial: portada, cuenta regresiva, mapa, mesa de regalos y confirmaciones.',
    'MXN', 'per_event', 199, 299,
    null, 7, 90,
    100, 200,
    '["hero","welcome","countdown","rsvp","map","gifts"]'::jsonb,
    '["csv_export"]'::jsonb,
    '[]'::jsonb,
    'reduced', false, true, 2
  ),
  (
    'celebracion', 'Celebración',
    'Todos los módulos de contenido, sin branding y con personalización avanzada de colores y tipografías.',
    'MXN', 'per_event', 399, 499,
    null, 30, 180,
    250, 500,
    '["hero","welcome","countdown","rsvp","map","gifts","gallery","itinerary","dresscode","music"]'::jsonb,
    '["csv_export","advanced_personalization"]'::jsonb,
    '["basic_analytics"]'::jsonb,
    'none', true, true, 3
  ),
  (
    'premium', 'Premium',
    'Todos los módulos (incluido video), mayor capacidad de invitados y almacenamiento, y revisión visual a solicitud.',
    'MXN', 'per_event', 699, 899,
    null, 90, 365,
    500, 2000,
    '["hero","welcome","countdown","map","gallery","video","itinerary","dresscode","gifts","music","rsvp"]'::jsonb,
    '["csv_export","advanced_personalization","priority_support","visual_review"]'::jsonb,
    '["advanced_analytics","custom_domain"]'::jsonb,
    'none', false, true, 4
  )
on conflict (code) do update set
  name                   = excluded.name,
  description            = excluded.description,
  currency               = excluded.currency,
  billing_type           = excluded.billing_type,
  price_launch           = excluded.price_launch,
  price_regular          = excluded.price_regular,
  publish_trial_days     = excluded.publish_trial_days,
  grace_days_after_event = excluded.grace_days_after_event,
  fallback_duration_days = excluded.fallback_duration_days,
  max_guests             = excluded.max_guests,
  max_storage_mb         = excluded.max_storage_mb,
  allowed_modules        = excluded.allowed_modules,
  features               = excluded.features,
  coming_soon            = excluded.coming_soon,
  branding               = excluded.branding,
  is_recommended         = excluded.is_recommended,
  is_active              = excluded.is_active,
  display_order          = excluded.display_order,
  updated_at             = now();
