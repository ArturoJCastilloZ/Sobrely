-- ============================================================================
-- Supabase Storage para imágenes de invitaciones (Fase 5).
-- Bucket público de lectura; escritura restringida a la carpeta del usuario:
-- las rutas se organizan como  <user_id>/<invitation_id>/<archivo>.
-- ============================================================================

-- Crea el bucket (idempotente). Público para poder mostrar las imágenes.
insert into storage.buckets (id, name, public)
values ('invitation-images', 'invitation-images', true)
on conflict (id) do nothing;

-- Lectura pública de los objetos del bucket.
drop policy if exists "invitation_images_public_read" on storage.objects;
create policy "invitation_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using ( bucket_id = 'invitation-images' );

-- Subida: solo a la carpeta cuyo primer segmento es el uid del usuario.
drop policy if exists "invitation_images_owner_insert" on storage.objects;
create policy "invitation_images_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'invitation-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Actualizar / eliminar: solo objetos de la propia carpeta.
drop policy if exists "invitation_images_owner_update" on storage.objects;
create policy "invitation_images_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'invitation-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "invitation_images_owner_delete" on storage.objects;
create policy "invitation_images_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'invitation-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
