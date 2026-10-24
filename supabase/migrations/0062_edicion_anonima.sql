-- ============================================================================
-- 0062 · Edición sin cuenta: topes y candados para sesiones anónimas
--
-- Contexto. Con «Allow anonymous sign-ins» activado en Supabase, cualquiera obtiene
-- una sesión con UNA petición, sin cuenta ni correo. Esa sesión usa el rol
-- `authenticated`, así que hereda TODO lo que una persona registrada puede hacer sobre
-- sus propias filas. Ninguna política actual distingue a un anónimo; esta migración
-- las distingue donde el abuso sale barato:
--
--   1. Invitaciones: tope de 3 por anónimo.
--   2. Publicar: un anónimo NO puede poner `is_published = true`. El servidor ya lo
--      rechaza (`setPublished`); esto lo cierra también si alguien llama a la API
--      directo, que es la única forma de saltarse el servidor.
--   3. Almacenamiento: tope de 20 archivos por anónimo, y el bucket público
--      `invitation-images` limitado a imágenes de hasta 10 MiB. Hoy NO tiene ningún
--      límite de tamaño ni de tipo (medido): con sesiones anónimas sería hospedaje
--      gratis de cualquier archivo bajo tu dominio.
--
-- El claim: Supabase pone `is_anonymous` en el JWT (medido). Sin JWT (service_role,
-- migraciones, el cron) la función da `false`: nada de esto frena a nuestro servidor.
--
-- Medido en producción antes de escribir esto (solo lectura): 59 archivos en el bucket,
-- TODOS `image/jpeg`, máximo 780 KB. La lista de tipos y el tope no rompen ninguno.
--
-- Idempotente: se puede volver a aplicar sin daño.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ¿La sesión que ejecuta esto es anónima?
-- ----------------------------------------------------------------------------
create or replace function public.es_sesion_anonima()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

comment on function public.es_sesion_anonima() is
  'true si el JWT de la petición es de una sesión anónima de Supabase. false sin JWT (service_role).';

-- ----------------------------------------------------------------------------
-- 1. Tope de invitaciones por anónimo
-- ----------------------------------------------------------------------------
create or replace function public.limitar_invitaciones_anonimas()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.es_sesion_anonima() then
    -- Se cuenta con la sesión de quien inserta: la política de lectura ya filtra
    -- por su propio id, así que esto cuenta SUS invitaciones.
    if (select count(*) from public.invitations where user_id = new.user_id) >= 3 then
      raise exception 'LIMITE_ANONIMO_INVITACIONES'
        using hint = 'Una sesión sin cuenta puede tener hasta 3 invitaciones.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists invitaciones_limite_anonimo on public.invitations;
create trigger invitaciones_limite_anonimo
  before insert on public.invitations
  for each row execute function public.limitar_invitaciones_anonimas();

-- ----------------------------------------------------------------------------
-- 2. Un anónimo no publica
-- ----------------------------------------------------------------------------
create or replace function public.impedir_publicar_anonimo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.es_sesion_anonima()
     and (
       (new.is_published is true and old.is_published is not true)
       or (new.status = 'published' and old.status is distinct from 'published')
     ) then
    raise exception 'ANONIMO_NO_PUBLICA'
      using hint = 'Crea una cuenta para publicar.';
  end if;
  return new;
end
$$;

drop trigger if exists invitaciones_anonimo_no_publica on public.invitations;
create trigger invitaciones_anonimo_no_publica
  before update on public.invitations
  for each row execute function public.impedir_publicar_anonimo();

-- ----------------------------------------------------------------------------
-- 3. Almacenamiento
-- ----------------------------------------------------------------------------
-- Política RESTRICTIVA: se suma (AND) a las permisivas existentes, no las reemplaza.
drop policy if exists "invitation_images_anonimo_tope" on storage.objects;
create policy "invitation_images_anonimo_tope"
  on storage.objects
  as restrictive
  for insert
  to authenticated
  with check (
    bucket_id <> 'invitation-images'
    or not public.es_sesion_anonima()
    or (
      select count(*)
      from storage.objects o
      where o.bucket_id = 'invitation-images'
        and (storage.foldername(o.name))[1] = (select auth.uid())::text
    ) < 20
  );

-- El bucket: solo imágenes, hasta 10 MiB (el tope de origen del navegador es 10 MB y
-- la compresión lo deja por debajo de 1 MB; ver `src/lib/images/compress.ts`).
-- SVG queda FUERA a propósito: un SVG puede llevar script y este bucket es público.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'invitation-images';

-- ----------------------------------------------------------------------------
-- Autocomprobación: si algo no quedó puesto, la migración FALLA.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'invitaciones_limite_anonimo'
                 and tgrelid = 'public.invitations'::regclass and not tgisinternal) then
    raise exception 'falta el disparador invitaciones_limite_anonimo';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'invitaciones_anonimo_no_publica'
                 and tgrelid = 'public.invitations'::regclass and not tgisinternal) then
    raise exception 'falta el disparador invitaciones_anonimo_no_publica';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'invitation_images_anonimo_tope' and permissive = 'RESTRICTIVE') then
    raise exception 'la política de tope de almacenamiento no es RESTRICTIVA (o no existe)';
  end if;
  if not exists (select 1 from storage.buckets where id = 'invitation-images'
                 and file_size_limit = 10485760
                 and allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']) then
    raise exception 'el bucket invitation-images no quedó limitado';
  end if;
end
$$;
