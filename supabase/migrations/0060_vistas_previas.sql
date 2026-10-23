-- ============================================================================
-- 0060 — Ligas de VISTA PREVIA privada de una invitación (Fase 4 del embudo)
--
-- PARA QUÉ: con la demo de 14 días fuera (Fase 3), publicar siempre cuesta, y
-- sin una vista previa nadie puede enseñarle su diseño a su pareja o a su
-- familia antes de pagar. Una liga con token abre la invitación SIN publicarla,
-- sin RSVP real y sin que la vean los invitados.
--
-- DECISIONES DEL DEV (2026-10-23, pedidas por el §34 porque exigen migración):
--   - tabla aparte, token guardado como HASH (nunca en claro),
--   - vigencia de 7 días (la fija el código; la tabla guarda `expires_at`).
--
-- QUÉ ES LA TABLA: una fila por liga. `token_hash` es el SHA-256 hexadecimal de
-- un token de 256 bits que solo se muestra UNA vez, al crearlo. Con el hash en
-- base de datos, una copia, un volcado o un log no bastan para abrir la
-- invitación de nadie. Varias ligas vigentes por invitación se pueden revocar
-- todas a la vez (`revoked_at`); al borrar la invitación se borran sus ligas
-- (`on delete cascade`).
--
-- ACCESO: SOLO el servidor, con la llave de servicio. Ni `anon` ni
-- `authenticated` pueden leer ni escribir esta tabla por la API:
--   1. RLS activada y SIN ninguna policy → deniega todo a esos roles.
--   2. `revoke all` explícito → un `default privileges` heredado no la abre.
--   3. `grant` explícito a `service_role` → hace falta en un Supabase NUEVO,
--      donde las tablas ya no se conceden solas a los roles de la API (medido en
--      la Fase 2: sin esto un proyecto recién creado desde estas migraciones
--      daría 403 en todo). Producción ya lo tiene por su antigüedad.
-- El anfitrión nunca toca la tabla: crea y revoca desde server actions que
-- primero comprueban, con SU sesión, que la invitación es suya.
--
-- LO QUE ESTA MIGRACIÓN NO HACE: no borra ligas vencidas. Ocupan una fila
-- pequeña y no molestan; limpiarlas es un `delete` periódico que hoy no tiene
-- dónde correr, así que queda como seguimiento y no como promesa.
--
-- Idempotente: se puede volver a aplicar sin daño.
-- ============================================================================

create table if not exists public.invitation_previews (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  -- SHA-256 hexadecimal: 64 caracteres. Único, y es la llave de búsqueda.
  token_hash    text not null unique,
  expires_at    timestamptz not null,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  constraint invitation_previews_hash_chk check (char_length(token_hash) = 64)
);

create index if not exists invitation_previews_invitation_idx
  on public.invitation_previews (invitation_id);

alter table public.invitation_previews enable row level security;

-- Sin policies, a propósito: nadie por la API.
revoke all on table public.invitation_previews from anon, authenticated;
grant select, insert, update on table public.invitation_previews to service_role;

-- ----------------------------------------------------------------------------
-- Autocomprobación: si el acceso no quedó cerrado, la migración FALLA en vez de
-- terminar «bien» con una tabla de tokens abierta.
-- ----------------------------------------------------------------------------
do $$
begin
  if not (
    select relrowsecurity from pg_class
    where oid = 'public.invitation_previews'::regclass
  ) then
    raise exception 'invitation_previews: RLS NO está activada';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invitation_previews'
  ) then
    raise exception 'invitation_previews: no debe tener policies (solo el servidor la usa)';
  end if;

  -- `has_table_privilege` con varios privilegios es verdadero si se tiene ALGUNO.
  if has_table_privilege('anon', 'public.invitation_previews',
       'SELECT, INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.invitation_previews',
       'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'invitation_previews: anon/authenticated NO deben tener permisos';
  end if;

  if not has_table_privilege('service_role', 'public.invitation_previews',
       'SELECT') then
    raise exception 'invitation_previews: service_role no puede leer la tabla';
  end if;
end
$$;
