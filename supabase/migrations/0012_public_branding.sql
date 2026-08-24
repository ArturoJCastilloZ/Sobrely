-- ============================================================================
-- 0012_public_branding.sql — branding condicional por plan
--
-- El pie "Hecho con Sobrely" de la invitación pública se renderizaba SIEMPRE,
-- aunque los planes Celebración y Premium prometen `branding: "none"`. El
-- render no tenía forma de saber el plan: ninguna RPC pública lo exponía.
--
-- Se añade `plan_code` (código del plan efectivo, vía la función ya existente
-- `invitation_effective_plan`) al payload de las tres RPC públicas. El cliente
-- deriva de ahí el nivel de branding. `null` = sin entitlement vigente, y el
-- front cae al branding completo (fail-safe: nunca se oculta la marca por un
-- dato faltante).
--
-- Solo se agrega una clave; el resto del payload queda idéntico.
-- ============================================================================

create or replace function public.get_public_invitation(
  p_username text,
  p_slug text
)
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
    'plan_code', public.invitation_effective_plan(i.id),
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
  from public.profiles p
  join public.invitations i on i.user_id = p.id
  where p.username = p_username
    and i.slug = p_slug
    and i.is_published = true
    and public.is_entitlement_active(i.id)
  limit 1;
$$;

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
    'plan_code', public.invitation_effective_plan(i.id),
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
      'plan_code', public.invitation_effective_plan(i.id),
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

grant execute on function public.get_public_invitation(text, text) to anon, authenticated;
grant execute on function public.get_public_invitation_by_vanity(text) to anon, authenticated;
grant execute on function public.get_guest_invitation(text) to anon, authenticated;
