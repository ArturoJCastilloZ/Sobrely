-- ============================================================================
-- InvitaFlow — Fase 1: esquema inicial
-- Tablas: profiles, invitations, invitation_modules, rsvp_responses, templates
-- Incluye: relaciones, índices, triggers de updated_at, trigger de perfil
-- automático al registrarse, y Row Level Security.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Helper: mantiene updated_at en cada UPDATE
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles
-- ============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text,
  avatar_url   text,
  plan         text not null default 'free',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- templates
-- ============================================================================
create table if not exists public.templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique,
  description       text,
  event_type        text,
  preview_image_url text,
  theme_config      jsonb not null default '{}'::jsonb,
  modules_config    jsonb not null default '[]'::jsonb,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists templates_is_active_idx on public.templates (is_active);

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- invitations
-- ============================================================================
create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  template_id  uuid references public.templates (id) on delete set null,
  title        text not null,
  slug         text not null,
  event_type   text,
  event_date   timestamptz,
  status       text not null default 'draft',
  is_published boolean not null default false,
  theme_config jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Un usuario no puede tener dos invitaciones con el mismo slug
  constraint invitations_user_slug_unique unique (user_id, slug)
);

create index if not exists invitations_user_id_idx on public.invitations (user_id);
create index if not exists invitations_template_id_idx on public.invitations (template_id);
create index if not exists invitations_published_idx on public.invitations (is_published);

create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- invitation_modules
-- ============================================================================
create table if not exists public.invitation_modules (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  module_type   text not null,
  sort_order    integer not null,
  config        jsonb not null default '{}'::jsonb,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists invitation_modules_invitation_id_idx
  on public.invitation_modules (invitation_id);
create index if not exists invitation_modules_order_idx
  on public.invitation_modules (invitation_id, sort_order);

create trigger invitation_modules_set_updated_at
  before update on public.invitation_modules
  for each row execute function public.set_updated_at();

-- ============================================================================
-- rsvp_responses
-- ============================================================================
create table if not exists public.rsvp_responses (
  id                uuid primary key default gen_random_uuid(),
  invitation_id     uuid not null references public.invitations (id) on delete cascade,
  guest_name        text not null,
  guest_email       text,
  attendance_status text not null,
  guest_count       integer not null default 1,
  message           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists rsvp_responses_invitation_id_idx
  on public.rsvp_responses (invitation_id);

create trigger rsvp_responses_set_updated_at
  before update on public.rsvp_responses
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Trigger: crear un profile automáticamente cuando se registra un usuario
-- Deriva un username único desde el email + sufijo corto aleatorio.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := regexp_replace(
    split_part(coalesce(new.email, 'user'), '@', 1),
    '[^a-zA-Z0-9_]', '', 'g'
  );
  if base_username is null or length(base_username) = 0 then
    base_username := 'user';
  end if;

  -- Garantiza unicidad con un sufijo aleatorio de 6 hex.
  -- Usa md5(random()) (núcleo de Postgres) para NO depender de la extensión
  -- pgcrypto, que en Supabase vive en el schema `extensions` y no sería
  -- visible con search_path = public.
  final_username := base_username || '-' || substr(md5(random()::text), 1, 6);

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.templates          enable row level security;
alter table public.invitations        enable row level security;
alter table public.invitation_modules enable row level security;
alter table public.rsvp_responses     enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: el usuario solo lee/actualiza su propio perfil
-- (la inserción la hace el trigger security definer)
-- ---------------------------------------------------------------------------
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- ---------------------------------------------------------------------------
-- templates: los templates activos son públicos (lectura)
-- ---------------------------------------------------------------------------
create policy "templates_select_active_public"
  on public.templates for select
  to anon, authenticated
  using ( is_active = true );

-- ---------------------------------------------------------------------------
-- invitations
--  - dueño: control total sobre sus invitaciones
--  - público: solo lectura de invitaciones publicadas
-- ---------------------------------------------------------------------------
create policy "invitations_owner_select"
  on public.invitations for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "invitations_owner_insert"
  on public.invitations for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "invitations_owner_update"
  on public.invitations for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "invitations_owner_delete"
  on public.invitations for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "invitations_select_published_public"
  on public.invitations for select
  to anon, authenticated
  using ( is_published = true );

-- ---------------------------------------------------------------------------
-- invitation_modules
--  - dueño de la invitación: control total
--  - público: solo lectura de módulos de invitaciones publicadas
-- ---------------------------------------------------------------------------
create policy "modules_owner_all"
  on public.invitation_modules for all
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.user_id = (select auth.uid())
    )
  );

create policy "modules_select_published_public"
  on public.invitation_modules for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.is_published = true
    )
  );

-- ---------------------------------------------------------------------------
-- rsvp_responses
--  - dueño de la invitación: puede leer/editar/eliminar las respuestas
--  - público: solo puede INSERTAR respuestas en invitaciones publicadas
-- ---------------------------------------------------------------------------
create policy "rsvp_owner_select"
  on public.rsvp_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.user_id = (select auth.uid())
    )
  );

create policy "rsvp_owner_update"
  on public.rsvp_responses for update
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.user_id = (select auth.uid())
    )
  );

create policy "rsvp_owner_delete"
  on public.rsvp_responses for delete
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.user_id = (select auth.uid())
    )
  );

create policy "rsvp_insert_published_public"
  on public.rsvp_responses for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.is_published = true
    )
  );
