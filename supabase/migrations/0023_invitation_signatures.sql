-- ============================================================================
-- 0023_invitation_signatures.sql — libro de firmas
--
-- Los invitados dejan un mensaje en la página pública. Invitio lo regala en su
-- plan gratis; en Sobrely vive en **Celebración y Premium**, por decisión de
-- precio del dev (2026-09-05): `ALL_MODULES = MODULE_TYPES` hace que todo
-- módulo nuevo nazca en Premium únicamente, donde casi nadie lo vería.
--
-- Las firmas NO caben en el `config` del módulo: las escribe un visitante
-- ANÓNIMO y `invitation_modules` es solo-dueño por RLS. Van a su propia tabla,
-- igual que las respuestas del RSVP.
--
-- ----------------------------------------------------------------------------
-- Lo que este archivo defiende, y por qué está en SQL y no en el código
-- ----------------------------------------------------------------------------
-- La llave `anon` es pública: cualquiera puede hablarle a PostgREST con ella,
-- sin pasar por nuestra página. Así que todo lo que importe tiene que ser
-- imposible desde la base, no solo difícil desde la UI:
--
--   1. **Solo invitaciones publicadas.** No se firma un borrador ajeno.
--   2. **Solo si el módulo existe y está visible.** Sin libro de firmas, no hay
--      firmas: no se puede sembrar contenido en una invitación que no lo ofrece.
--   3. **La moderación la impone la base.** Si el anfitrión pidió revisar antes
--      de publicar, la fila DEBE nacer oculta. Si eso lo decidiera el código,
--      un cliente hecho a mano insertaría con `is_hidden = false` y se saltaría
--      la moderación entera. Por eso el `with check` compara contra el
--      `requireApproval` que vive en el config del módulo.
--   4. **Topes de longitud como restricción**, no como validación de formulario.
--
-- Ojo con lo que esto SÍ expone: las firmas visibles las puede leer cualquiera
-- que tenga el enlace de la invitación. Es lo que un libro de firmas es —un
-- muro público— y por eso el módulo no debe usarse para nada privado. Las
-- ocultas solo las ve el dueño.
-- ============================================================================

create table if not exists public.invitation_signatures (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,

  guest_name    text not null,
  message       text not null,

  -- Oculta: la escribió alguien pero no se muestra. Nace en `true` cuando el
  -- anfitrión pidió moderar; también es lo que se usa para esconder una firma
  -- ofensiva sin borrarla (y sin que el autor lo note al recargar).
  is_hidden     boolean not null default false,

  created_at    timestamptz not null default now()
);

alter table public.invitation_signatures
  drop constraint if exists invitation_signatures_name_len_chk;
alter table public.invitation_signatures
  add constraint invitation_signatures_name_len_chk
  check (char_length(btrim(guest_name)) between 1 and 60);

alter table public.invitation_signatures
  drop constraint if exists invitation_signatures_message_len_chk;
alter table public.invitation_signatures
  add constraint invitation_signatures_message_len_chk
  check (char_length(btrim(message)) between 1 and 500);

-- El muro se lee "las más recientes primero", que es esta consulta exacta.
create index if not exists invitation_signatures_wall_idx
  on public.invitation_signatures (invitation_id, created_at desc);

alter table public.invitation_signatures enable row level security;

-- ----------------------------------------------------------------------------
-- Dueño: ve todo (incluidas las ocultas), modera y borra.
-- ----------------------------------------------------------------------------
drop policy if exists "signatures_owner_all" on public.invitation_signatures;
create policy "signatures_owner_all"
  on public.invitation_signatures for all
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

-- ----------------------------------------------------------------------------
-- Público: lee las visibles de una invitación publicada. Nada más.
-- ----------------------------------------------------------------------------
drop policy if exists "signatures_public_select" on public.invitation_signatures;
create policy "signatures_public_select"
  on public.invitation_signatures for select
  to anon, authenticated
  using (
    is_hidden = false
    and exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.is_published = true
    )
  );

-- ----------------------------------------------------------------------------
-- Público: firma. Las tres condiciones de arriba, impuestas aquí.
-- ----------------------------------------------------------------------------
drop policy if exists "signatures_public_insert" on public.invitation_signatures;
create policy "signatures_public_insert"
  on public.invitation_signatures for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = invitation_id
        and i.is_published = true
    )
    and exists (
      select 1 from public.invitation_modules m
      where m.invitation_id = invitation_id
        and m.module_type = 'signatures'
        and m.is_visible = true
    )
    -- La fila nace oculta si y solo si el anfitrión pidió moderar. Cualquier
    -- otro valor se rechaza: es lo que impide saltarse la revisión insertando
    -- `is_hidden = false` a mano con la llave pública.
    and is_hidden = coalesce(
      (
        select (m.config ->> 'requireApproval')::boolean
        from public.invitation_modules m
        where m.invitation_id = invitation_id
          and m.module_type = 'signatures'
        limit 1
      ),
      false
    )
  );

comment on table public.invitation_signatures is
  'Libro de firmas. Escritura anónima acotada por RLS a invitaciones publicadas que tienen el módulo visible. Las visibles las lee cualquiera con el enlace — es un muro público a propósito; las ocultas solo el dueño.';

comment on column public.invitation_signatures.is_hidden is
  'Oculta. Nace en true si el módulo pide moderación (lo impone el with check del insert, no el código) y también sirve para esconder una firma sin borrarla.';
