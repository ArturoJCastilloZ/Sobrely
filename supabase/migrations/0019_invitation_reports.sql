-- ============================================================================
-- 0019_invitation_reports.sql — reporte compartible con PIN
--
-- El anfitrión genera una liga de SOLO LECTURA con las cifras del evento para
-- dársela al banquete, al salón o a los novios, sin que esa persona cree una
-- cuenta. La liga trae un token no adivinable y, detrás, pide un PIN.
--
-- Dos llaves y no una a propósito: el token viaja en la URL —y las URLs se
-- reenvían, se pegan en un chat y quedan en el historial—, así que por sí solo
-- no basta. El PIN se transmite por otro canal (se dicta por teléfono) y es lo
-- que convierte una liga filtrada en una liga inútil.
--
-- Qué NO expone, por decisión: nombres de invitados, sus respuestas y sus
-- mensajes. El reporte es agregado. Quien recibe la liga necesita el número
-- del banquete, no la lista de alergias de 300 personas.
--
-- ----------------------------------------------------------------------------
-- Por qué el PIN NO se verifica aquí, a diferencia de `get_guest_invitation`
-- ----------------------------------------------------------------------------
-- El plan preveía una RPC `SECURITY DEFINER` que resolviera todo en SQL. Se
-- desvió a propósito, con dos razones:
--
--   1. `pgcrypto` vive en el schema `extensions` en Supabase y NO es visible
--      con `set search_path = public`. Ese bug exacto ya se pagó una vez: la
--      `0002` existe para arreglarlo. Hashear el PIN aquí lo reintroduciría.
--   2. Un PIN de 6 dígitos son un millón de combinaciones: necesita un KDF de
--      verdad y un bloqueo por intentos. Ambos viven mejor en código probado
--      que en SQL.
--
-- Así que esta tabla solo GUARDA el hash y los contadores. Quien compara es
-- una server action en Node (scrypt), con el cliente admin. Consecuencia
-- directa: el anónimo NO tiene política de RLS sobre esta tabla — no la puede
-- leer ni con el token en la mano. El único camino es el servidor.
-- ============================================================================

create table if not exists public.invitation_reports (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid not null references public.invitations (id) on delete cascade,

  -- Va en la URL (`/r/<token>`). 48 hex, mismo calibre que `access_token` de
  -- invitation_guests. Es identificador, no credencial: el PIN es la credencial.
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),

  -- Formato propio, autodescriptivo: `scrypt$N$r$p$<salt b64>$<hash b64>`.
  -- Se guardan los parámetros junto al hash para poder subirlos después sin
  -- invalidar los PIN ya emitidos.
  pin_hash        text not null,

  -- Bloqueo por fuerza bruta. `locked_until` en el futuro = no se acepta ni el
  -- PIN correcto hasta que pase. Se limpian ambos al primer acierto.
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until    timestamptz,

  -- Para que el anfitrión vea si su liga se usó, y cuándo.
  view_count      integer not null default 0 check (view_count >= 0),
  last_viewed_at  timestamptz,

  -- Revocar en vez de borrar: si una liga se filtró, importa saber que existió.
  revoked_at      timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists invitation_reports_invitation_idx
  on public.invitation_reports (invitation_id);

-- La búsqueda por token es la del camino caliente. `token` ya es unique, que
-- crea su índice; no se agrega otro.

-- Una sola liga VIVA por invitación. Rotar = revocar la anterior y crear otra,
-- así el anfitrión nunca tiene dos ligas en circulación sin saber cuál dio.
create unique index if not exists invitation_reports_one_active_idx
  on public.invitation_reports (invitation_id)
  where revoked_at is null;

-- Idempotente a propósito: estas migraciones las aplica el dev A MANO en el SQL
-- Editor, así que tiene que poder re-correr el archivo entero sin que reviente
-- a la mitad. Mismo criterio que el `drop trigger if exists` de la 0001.
drop trigger if exists invitation_reports_set_updated_at on public.invitation_reports;
create trigger invitation_reports_set_updated_at
  before update on public.invitation_reports
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: el dueño de la invitación gestiona sus reportes. El anónimo NO tiene
-- política — queda denegado, incluso con el token. Ver la nota de arriba: el
-- acceso público entra por el servidor con el cliente admin, nunca directo.
-- ----------------------------------------------------------------------------
alter table public.invitation_reports enable row level security;

drop policy if exists "reports_owner_all" on public.invitation_reports;
create policy "reports_owner_all"
  on public.invitation_reports for all
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

comment on table public.invitation_reports is
  'Ligas de solo lectura con las cifras agregadas de un evento, protegidas por PIN. El PIN se verifica en el servidor (scrypt), no en SQL: ver la cabecera de 0019.';

comment on column public.invitation_reports.token is
  'Identificador público que viaja en /r/<token>. NO es la credencial — el PIN lo es.';

comment on column public.invitation_reports.pin_hash is
  'scrypt$N$r$p$<salt b64>$<hash b64>. Nunca el PIN en claro.';

comment on column public.invitation_reports.locked_until is
  'Bloqueo por intentos fallidos. Mientras esté en el futuro no se acepta ningún PIN, ni el correcto.';
