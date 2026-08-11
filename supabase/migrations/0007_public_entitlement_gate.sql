-- ============================================================================
-- 0007_public_entitlement_gate.sql — Fase 8.4
--
-- La invitación pública deja de mostrarse cuando su entitlement expira. Se
-- redefine `get_public_invitation` para exigir, además de `is_published`, un
-- entitlement VIGENTE (`is_entitlement_active`). Como la publicación ahora
-- siempre crea un entitlement (demo Free de 14 días o el del plan pagado), esto
-- es consistente; una invitación cuya vigencia venció se oculta sola.
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

grant execute on function public.get_public_invitation(text, text) to anon, authenticated;
