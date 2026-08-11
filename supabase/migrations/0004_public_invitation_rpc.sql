-- ============================================================================
-- RPC pública para renderizar una invitación publicada por username + slug.
--
-- Las políticas RLS mantienen `profiles` como privado (solo el dueño lee su
-- perfil), por lo que un visitante anónimo no puede mapear username -> user.
-- Esta función SECURITY DEFINER resuelve ese mapeo de forma segura y ACOTADA:
-- solo devuelve invitaciones publicadas (is_published = true) y solo los
-- módulos visibles, sin exponer ninguna otra columna de profiles.
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
  limit 1;
$$;

-- Cualquiera (anónimo o autenticado) puede invocarla; la función solo expone
-- datos de invitaciones ya publicadas.
grant execute on function public.get_public_invitation(text, text) to anon, authenticated;
