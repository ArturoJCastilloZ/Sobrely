-- ============================================================================
-- Fix: "Database error saving new user" al registrarse.
--
-- Causa: la versión anterior de handle_new_user usaba gen_random_bytes()
-- (extensión pgcrypto). En Supabase pgcrypto vive en el schema `extensions`,
-- que no es visible con `search_path = public`, por lo que el trigger fallaba
-- y abortaba el INSERT en auth.users.
--
-- Solución: generar el sufijo con md5(random()), que es núcleo de Postgres.
-- Re-ejecuta esta migración (o solo este bloque) en el SQL Editor.
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
