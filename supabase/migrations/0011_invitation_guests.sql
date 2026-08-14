-- ============================================================================
-- P1 — Invitados personalizados con QR (modo "lista de invitados")
--
-- Añade el modo RSVP por invitación y la tabla de invitados nominales. Cada
-- invitado tiene un `access_token` no adivinable que ES su credencial: el link
-- personalizado y (en P2) el QR se derivan de él. La escritura anónima (el
-- invitado confirma sin login) NO toca la tabla directo: pasa por RPCs
-- SECURITY DEFINER acotadas por token. La tabla es dinero/PII → el dueño lee y
-- gestiona por RLS; el anónimo no tiene ninguna política (queda denegado).
-- ============================================================================

-- Necesario para gen_random_bytes (tokens). En Supabase suele estar, pero lo
-- aseguramos idempotente.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Modo RSVP por invitación: 'open' (form público, comportamiento actual) o
-- 'guest_list' (invitados nominales con link/QR). Default preserva lo existente.
-- ----------------------------------------------------------------------------
alter table public.invitations
  add column if not exists rsvp_mode text not null default 'open';

alter table public.invitations
  drop constraint if exists invitations_rsvp_mode_check;
alter table public.invitations
  add constraint invitations_rsvp_mode_check
  check (rsvp_mode in ('open', 'guest_list'));

-- ----------------------------------------------------------------------------
-- invitation_guests
-- ----------------------------------------------------------------------------
create table if not exists public.invitation_guests (
  id               uuid primary key default gen_random_uuid(),
  invitation_id    uuid not null references public.invitations (id) on delete cascade,
  name             text not null,
  -- Cupo asignado a este invitado (los "2 adultos" del competidor).
  max_guests       integer not null default 1 check (max_guests >= 1),
  -- Credencial no adivinable: 48 hex. Deriva el link personalizado y el QR (P2).
  access_token     text not null unique default encode(gen_random_bytes(24), 'hex'),
  -- pending | confirmed | declined
  status           text not null default 'pending',
  -- Cupo que efectivamente confirmó (<= max_guests). null mientras pending.
  confirmed_count  integer,
  message          text,
  -- Sello de check-in en la puerta (P2). null = no ha entrado.
  checked_in_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint invitation_guests_status_check
    check (status in ('pending', 'confirmed', 'declined')),
  constraint invitation_guests_confirmed_count_check
    check (confirmed_count is null or (confirmed_count >= 0 and confirmed_count <= max_guests))
);

create index if not exists invitation_guests_invitation_id_idx
  on public.invitation_guests (invitation_id);
create index if not exists invitation_guests_token_idx
  on public.invitation_guests (access_token);

create trigger invitation_guests_set_updated_at
  before update on public.invitation_guests
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: el dueño de la invitación gestiona sus invitados; el anónimo NO tiene
-- política (denegado). Todo acceso anónimo pasa por las RPCs de abajo.
-- ----------------------------------------------------------------------------
alter table public.invitation_guests enable row level security;

create policy "guests_owner_all"
  on public.invitation_guests for all
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

-- ============================================================================
-- RPC pública: resolver la invitación + los datos del invitado por token.
--
-- Solo devuelve invitaciones PUBLICADAS en modo 'guest_list'. Expone del
-- invitado únicamente lo necesario para su página (nombre, cupo, estado). No
-- lista invitados ni filtra por otra columna: el token es la única llave.
-- ============================================================================
create or replace function public.get_guest_invitation(
  p_token text
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'invitation', jsonb_build_object(
      'id', i.id,
      'title', i.title,
      'slug', i.slug,
      'event_type', i.event_type,
      'event_date', i.event_date,
      'theme_config', i.theme_config,
      'owner_name', p.display_name,
      'owner_username', p.username,
      'modules', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'module_type', m.module_type,
              'sort_order', m.sort_order,
              'is_visible', m.is_visible,
              'config', m.config
            )
            order by m.sort_order
          )
          from public.invitation_modules m
          where m.invitation_id = i.id
            and m.is_visible = true
        ),
        '[]'::jsonb
      )
    ),
    'guest', jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'max_guests', g.max_guests,
      'status', g.status,
      'confirmed_count', g.confirmed_count,
      'message', g.message,
      'checked_in', (g.checked_in_at is not null)
    )
  )
  from public.invitation_guests g
  join public.invitations i on i.id = g.invitation_id
  join public.profiles p on p.id = i.user_id
  where g.access_token = p_token
    and i.is_published = true
    and i.rsvp_mode = 'guest_list'
  limit 1;
$$;

grant execute on function public.get_guest_invitation(text) to anon, authenticated;

-- ============================================================================
-- RPC pública: el invitado confirma/declina su asistencia por token.
--
-- `p_confirmed_count`:
--   > 0  → status 'confirmed', cupo confirmado (clamp 1..max_guests).
--   = 0  → status 'declined' ("Cancelar asistencia").
-- Solo opera sobre invitaciones publicadas en modo 'guest_list'. Devuelve el
-- invitado actualizado (o null si el token no resuelve). Idempotente.
-- ============================================================================
create or replace function public.respond_guest(
  p_token text,
  p_confirmed_count integer,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g_id   uuid;
  g_max  integer;
  new_status text;
  new_count  integer;
begin
  select g.id, g.max_guests
    into g_id, g_max
  from public.invitation_guests g
  join public.invitations i on i.id = g.invitation_id
  where g.access_token = p_token
    and i.is_published = true
    and i.rsvp_mode = 'guest_list'
  limit 1;

  if g_id is null then
    return null;
  end if;

  if p_confirmed_count is null or p_confirmed_count <= 0 then
    new_status := 'declined';
    new_count := 0;
  else
    new_status := 'confirmed';
    -- clamp 1..max_guests
    new_count := least(greatest(p_confirmed_count, 1), g_max);
  end if;

  update public.invitation_guests
    set status = new_status,
        confirmed_count = new_count,
        message = coalesce(p_message, message)
  where id = g_id;

  return jsonb_build_object(
    'id', g_id,
    'status', new_status,
    'confirmed_count', new_count,
    'max_guests', g_max
  );
end;
$$;

grant execute on function public.respond_guest(text, integer, text) to anon, authenticated;
