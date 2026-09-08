-- ============================================================================
-- 0026_invitation_album.sql — álbum digital colaborativo post-evento
--
-- Los invitados suben fotos DESPUÉS de la fiesta desde la misma página pública.
-- Invitio lo vende como add-on de $599 MXN; aquí es un módulo más.
--
-- ----------------------------------------------------------------------------
-- Por qué este módulo NO se parece al libro de firmas, aunque suene igual
-- ----------------------------------------------------------------------------
-- Las firmas son TEXTO: la `0023` deja que el visitante anónimo inserte directo
-- con la llave `anon` porque una fila de texto con topes de longitud no puede
-- costarle dinero a nadie. Una FOTO sí. La llave `anon` es pública, así que una
-- policy de insert sobre Storage para anónimos significa, literalmente, que
-- cualquiera con el enlace de una invitación publicada puede llenar el bucket
-- del anfitrión —y la factura del proyecto— desde una terminal.
--
-- Por eso el álbum invierte la decisión de la `0023`:
--
--   * **NO hay policy de insert para `anon` ni sobre esta tabla ni sobre
--     Storage.** La subida entra SIEMPRE por nuestro servidor, que valida con
--     la llave de servicio. Es la misma doctrina de `invitation_reports`
--     (`0019`), que tampoco tiene RLS para anónimos: tener el enlace no
--     alcanza.
--   * Lo que la base SÍ defiende es la LECTURA pública (sin filtrar) y la
--     CUOTA, que es lo que no se puede confiar al código de aplicación.
--
-- ----------------------------------------------------------------------------
-- La cuota, y por qué es una sola sentencia
-- ----------------------------------------------------------------------------
-- Un contador que DEFIENDE algo no puede ser leer-en-una-consulta y
-- escribir-en-otra: 200 subidas concurrentes leen el mismo valor y ninguna ve
-- el tope. Ese bug ya se pagó en la `0020` con el PIN del reporte, y la
-- lección quedó escrita: **el intento se cobra por adelantado, en el almacén,
-- en una sola sentencia.**
--
-- `claim_album_slot` hace exactamente eso: un `insert ... on conflict do update
-- ... where <cabe> returning`. Si no cabe, no devuelve fila y no hay nada que
-- subir. El espacio se RESERVA antes de tocar Storage y se libera con
-- `release_album_slot` si la subida falla — al revés (subir y luego contar) el
-- lote entra igual.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Las fotos
-- ----------------------------------------------------------------------------
create table if not exists public.invitation_album_photos (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,

  -- Ruta DENTRO del bucket `invitation-images`, no la URL pública. La URL se
  -- deriva al leer: guardar la absoluta amarra las filas al host de Supabase.
  storage_path  text not null,
  -- Bytes reales del objeto subido. Es lo que se le cobró a la cuota, y lo que
  -- hay que devolverle al borrar la foto.
  byte_size     integer not null,

  guest_name    text not null,
  caption       text not null default '',

  -- Misma semántica que en las firmas: nace oculta si el anfitrión pidió
  -- moderar, y también sirve para esconder una foto sin borrarla.
  is_hidden     boolean not null default false,

  created_at    timestamptz not null default now()
);

alter table public.invitation_album_photos
  drop constraint if exists invitation_album_photos_path_uq;
alter table public.invitation_album_photos
  add constraint invitation_album_photos_path_uq unique (storage_path);

alter table public.invitation_album_photos
  drop constraint if exists invitation_album_photos_name_len_chk;
alter table public.invitation_album_photos
  add constraint invitation_album_photos_name_len_chk
  check (char_length(btrim(guest_name)) between 1 and 60);

alter table public.invitation_album_photos
  drop constraint if exists invitation_album_photos_caption_len_chk;
alter table public.invitation_album_photos
  add constraint invitation_album_photos_caption_len_chk
  check (char_length(caption) <= 280);

-- Un objeto de 0 bytes no es una foto, y uno enorme no debe poder registrarse
-- aunque el código de aplicación se equivoque. 12 MB es el techo por archivo.
alter table public.invitation_album_photos
  drop constraint if exists invitation_album_photos_size_chk;
alter table public.invitation_album_photos
  add constraint invitation_album_photos_size_chk
  check (byte_size > 0 and byte_size <= 12 * 1024 * 1024);

-- El muro se lee "las más recientes primero" por invitación. `id` desempata
-- porque una tanda de subidas comparte `created_at` casi al microsegundo y sin
-- desempate el orden se reacomoda entre lecturas.
create index if not exists invitation_album_photos_wall_idx
  on public.invitation_album_photos (invitation_id, created_at desc, id desc);

-- ----------------------------------------------------------------------------
-- El contador por invitación. Vive aparte de las fotos a propósito: contar
-- filas con `count(*)` en cada subida no es atómico contra el tope, y encima se
-- vuelve lento justo cuando el álbum sirve para algo.
-- ----------------------------------------------------------------------------
create table if not exists public.invitation_album_state (
  invitation_id uuid primary key references public.invitations (id) on delete cascade,
  photo_count   integer not null default 0,
  bytes_used    bigint  not null default 0
);

alter table public.invitation_album_state
  drop constraint if exists invitation_album_state_nonneg_chk;
alter table public.invitation_album_state
  add constraint invitation_album_state_nonneg_chk
  check (photo_count >= 0 and bytes_used >= 0);

comment on table public.invitation_album_state is
  'Cuota del álbum, cobrada por adelantado y en una sola sentencia (claim_album_slot). No es un caché de count(*): es la barrera. Si diverge de invitation_album_photos, manda esta tabla para admitir y la otra para mostrar.';

-- ----------------------------------------------------------------------------
-- RLS de las fotos
-- ----------------------------------------------------------------------------
alter table public.invitation_album_photos enable row level security;

-- Dueño: ve todo (incluidas las ocultas), modera y borra.
drop policy if exists "album_owner_all" on public.invitation_album_photos;
create policy "album_owner_all"
  on public.invitation_album_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = public.invitation_album_photos.invitation_id
        and i.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = public.invitation_album_photos.invitation_id
        and i.user_id = (select auth.uid())
    )
  );

-- Público: solo las VISIBLES de una invitación PUBLICADA que además tenga el
-- módulo de álbum VISIBLE. Un solo `exists` con join, no un subquery escalar:
-- `invitation_modules` no tiene unique en (invitation_id, module_type) —las
-- secciones repetibles del producto dependen de que no lo tenga— así que un
-- escalar con `limit 1` elegiría una fila arbitraria y el resultado cambiaría
-- entre corridas idénticas. Es el bug que costó las migraciones 0023→0025.
--
-- Y toda referencia a la fila evaluada va CALIFICADA con el nombre de la tabla:
-- `invitation_id` existe también en `invitation_modules`, y sin calificar el
-- scope interno gana y la condición se vuelve siempre verdadera.
drop policy if exists "album_public_read" on public.invitation_album_photos;
create policy "album_public_read"
  on public.invitation_album_photos for select
  to anon, authenticated
  using (
    public.invitation_album_photos.is_hidden = false
    and exists (
      select 1
      from public.invitations i
      join public.invitation_modules m
        on m.invitation_id = i.id
       and m.module_type = 'album'
       and m.is_visible = true
      where i.id = public.invitation_album_photos.invitation_id
        and i.is_published = true
    )
  );

-- NO hay policy de INSERT ni de UPDATE para `anon`. Es deliberado: la subida
-- entra por el servidor con la llave de servicio, que valida publicación,
-- visibilidad del módulo, si el álbum está abierto, el tipo real del archivo y
-- la cuota. Un invitado no puede escribir en esta tabla ni con la llave
-- pública en la mano.

-- ----------------------------------------------------------------------------
-- El estado/cuota: NADIE lo toca directo, ni el dueño. Solo las funciones.
-- ----------------------------------------------------------------------------
alter table public.invitation_album_state enable row level security;

drop policy if exists "album_state_owner_read" on public.invitation_album_state;
create policy "album_state_owner_read"
  on public.invitation_album_state for select
  to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = public.invitation_album_state.invitation_id
        and i.user_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- Reservar un lugar. UNA sentencia: o cabe y queda cobrado, o no devuelve nada.
-- ----------------------------------------------------------------------------
create or replace function public.claim_album_slot(
  p_invitation_id uuid,
  p_bytes         integer,
  p_max_photos    integer,
  p_max_bytes     bigint
)
returns table (photo_count integer, bytes_used bigint)
language sql
security definer
set search_path = public
as $$
  insert into public.invitation_album_state as s (invitation_id, photo_count, bytes_used)
  values (p_invitation_id, 1, p_bytes)
  on conflict (invitation_id) do update
     set photo_count = s.photo_count + 1,
         bytes_used  = s.bytes_used + p_bytes
   where s.photo_count + 1 <= p_max_photos
     and s.bytes_used + p_bytes <= p_max_bytes
  returning s.photo_count, s.bytes_used;
$$;

-- Devolver el lugar cuando la subida falló o el dueño borró la foto. Se topa en
-- cero: un `release` de más no debe dejar el contador negativo y regalar cupo.
create or replace function public.release_album_slot(
  p_invitation_id uuid,
  p_bytes         integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.invitation_album_state
     set photo_count = greatest(0, photo_count - 1),
         bytes_used  = greatest(0, bytes_used - p_bytes)
   where invitation_id = p_invitation_id;
$$;

-- La lección de la 0021: `revoke ... from public` NO sirve, porque Supabase
-- otorga EXECUTE a `anon` y `authenticated` por *default privileges*. Hay que
-- nombrarlos, y comprobarlo llamando con la llave pública.
revoke all on function public.claim_album_slot(uuid, integer, integer, bigint)
  from public, anon, authenticated;
revoke all on function public.release_album_slot(uuid, integer)
  from public, anon, authenticated;

-- El primer `insert` de claim_album_slot corre como el DUEÑO de la función, que
-- salta RLS por ser SECURITY DEFINER; no hace falta darle policy de insert a
-- nadie sobre invitation_album_state.
