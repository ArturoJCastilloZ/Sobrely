-- ============================================================================
-- 0010_vanity_slugs.sql — URL personalizada premium (Fase B de la URL)
--
-- Los planes Premium pueden reclamar un slug GLOBAL único para servir la
-- invitación en `/<slug>` (sin el usuario). Es un ALIAS: `/<usuario>/<slug>`
-- sigue funcionando; el vanity es una URL adicional.
--
-- Seguridad (mismo patrón que el resto): el dueño LEE lo suyo; la escritura es
-- solo server-side (service_role), tras verificar propiedad + entitlement
-- Premium en la Server Action. Sin policies de escritura.
-- ============================================================================

create table if not exists public.vanity_slugs (
  slug          text primary key,
  invitation_id uuid not null unique references public.invitations (id) on delete cascade,
  created_at    timestamptz not null default now()
);

create index if not exists vanity_slugs_invitation_idx
  on public.vanity_slugs (invitation_id);

alter table public.vanity_slugs enable row level security;

-- El dueño de la invitación LEE su vanity. Sin policies de escritura.
create policy "vanity_slugs_owner_select"
  on public.vanity_slugs for select
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = vanity_slugs.invitation_id
        and i.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- ¿El vanity slug está libre? (chequeo de disponibilidad sin exponer la tabla)
-- ============================================================================
create or replace function public.vanity_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.vanity_slugs where slug = lower(trim(p_slug))
  );
$$;

-- ============================================================================
-- Resolver la invitación pública por su vanity slug. Igual que
-- get_public_invitation pero por slug global, exigiendo publicada + entitlement
-- vigente (la invitación se oculta al expirar, como en la ruta con usuario).
-- ============================================================================
create or replace function public.get_public_invitation_by_vanity(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
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
  )
  from public.vanity_slugs v
  join public.invitations i on i.id = v.invitation_id
  join public.profiles p on p.id = i.user_id
  where v.slug = lower(trim(p_slug))
    and i.is_published = true
    and public.is_entitlement_active(i.id)
  limit 1;
$$;

grant execute on function public.vanity_slug_available(text) to anon, authenticated;
grant execute on function public.get_public_invitation_by_vanity(text) to anon, authenticated;
