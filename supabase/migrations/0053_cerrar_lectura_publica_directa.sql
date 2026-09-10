-- ============================================================================
-- 0053 — Cerrar la lectura pública DIRECTA de `invitations` e `invitation_modules`
--
-- QUÉ CIERRA (medido contra producción el 2026-09-10 con la llave publicable,
-- la misma que viaja al navegador de cualquier visitante):
--
--     invitations                     HTTP 206  content-range 0-0/7
--     invitation_modules              HTTP 206  content-range 0-0/46
--     invitation_modules is_visible=false       0-0/4   <- OCULTOS por el anfitrión
--     CONTROL profiles                */0             <- la sonda discrimina
--     CONTROL invitation_entitlements */0
--
-- Es decir: cualquiera puede enumerar las invitaciones publicadas sin conocer
-- ningún enlace, correlacionar anfitriones por `user_id` (que además es la
-- carpeta de Storage), leer los módulos que el anfitrión OCULTÓ con su `config`
-- —la dirección del salón que creyó retirar— y saltarse el muro de pago, porque
-- las RPC `security definer` que acotan columnas, filtran `is_visible` y aplican
-- el entitlement quedan PUENTEADAS: las policies son *permissive* y se OR-ean.
--
-- ⚠️ POR QUÉ ESTA MIGRACIÓN NO ES SÓLO DOS `drop policy`
--
-- El informe de auditoría proponía retirarlas a secas «porque toda la lectura
-- pública ya pasa por las RPC». **Eso rompe producción**, y se comprobó antes de
-- escribir nada. En PostgreSQL la subconsulta de una policy se evalúa con la RLS
-- del rol que consulta, así que hay policies que HOY dependen de que `anon`
-- pueda leer `invitations`:
--
--   1. `rsvp_insert_published_public` (0001:328) — su `with check` hace
--      `exists (select 1 from invitations ...)`. El RSVP público inserta con el
--      cliente ANÓNIMO (`src/lib/rsvp/actions.ts:53`, verificado en la línea, no
--      deducido), así que sin la policy el `with check` deja de ver la fila y
--      **todo el RSVP abierto deja de funcionar**, con el mensaje genérico de
--      `actions.ts:64`.
--   2. `signatures_public_select` (0024:86) — mismo patrón. El muro de firmas se
--      quedaría **vacío en silencio**, sin error.
--   3. `signatures_public_insert` (0025:33) — además hace `join` con
--      `invitation_modules`, así que depende de las DOS policies. Hoy es camino
--      muerto (`signGuestbook` inserta con service_role), pero se arregla igual:
--      una bomba latente no es un no-problema.
--
-- La salida es la que recomienda la propia documentación de PostgreSQL para
-- este caso: mover la comprobación a funciones `security definer`, que no
-- evalúan la RLS del invocador. Con eso las tres policies siguen decidiendo
-- exactamente lo mismo y dejan de necesitar la lectura pública.
--
-- ⚠️ 0026 (álbum) NO ESTÁ APLICADA y sigue congelada (§17 del roadmap). Su
-- policy `album_public_read` (0026:154) también hace `exists` sobre
-- `invitations` **y** `invitation_modules`. Si algún día se aplica DESPUÉS de
-- esta migración, habrá que reescribirla con `public.invitacion_esta_publicada`
-- o nacerá muerta. Queda dicho aquí porque no puedo tocar una migración
-- congelada por decisión del dev.
--
-- LO QUE **NO** CAMBIA: el dueño sigue leyendo lo suyo por
-- `invitations_owner_select` (0001:223) y `modules_owner_all` (0001:254), que
-- son independientes y no se tocan. El render público sigue por las RPC de la
-- 0012. Efecto secundario DESEADO: un usuario logueado deja de poder abrir el
-- editor y el panel de una invitación AJENA publicada por id — las dos páginas
-- ya hacen `notFound()` cuando la consulta no devuelve fila.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. ¿La invitación está publicada?
--
-- `security definer` para que la comprobación siga funcionando cuando el rol
-- que consulta ya NO puede leer `invitations` — que es justo lo que hace esta
-- migración. Sin esto, retirar las policies rompe el RSVP público.
-- `stable` y no `volatile` para que el planificador pueda cachearla dentro de
-- la sentencia. `set search_path = public` es obligatorio en toda función
-- definer: sin él, un `search_path` manipulado puede reapuntar los nombres.
-- ---------------------------------------------------------------------------
create or replace function public.invitacion_esta_publicada(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invitations i
    where i.id = p_invitation_id
      and i.is_published = true
  );
$$;

comment on function public.invitacion_esta_publicada(uuid) is
  'Usada por las policies públicas de rsvp_responses e invitation_signatures. '
  'Es definer a propósito: desde la 0053 el rol anónimo ya no puede leer '
  'invitations, así que un `exists` normal dentro de una policy devolvería '
  'siempre falso.';


-- ---------------------------------------------------------------------------
-- 2. ¿Se acepta esta firma del libro?
--
-- Encapsula ENTERA la condición de la 0025, que además de la invitación mira el
-- módulo `signatures` y compara `is_hidden` con su `requireApproval`. Va en una
-- función porque toca las DOS tablas que dejan de ser legibles.
-- ---------------------------------------------------------------------------
create or replace function public.firma_publica_permitida(
  p_invitation_id uuid,
  p_is_hidden boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invitations i
    join public.invitation_modules m
      on m.invitation_id = i.id
     and m.module_type = 'signatures'
     and m.is_visible = true
    where i.id = p_invitation_id
      and i.is_published = true
      and p_is_hidden = coalesce((m.config ->> 'requireApproval')::boolean, false)
  );
$$;

comment on function public.firma_publica_permitida(uuid, boolean) is
  'Condición completa de signatures_public_insert (0025), movida a definer '
  'porque hace join con invitation_modules, que desde la 0053 tampoco es '
  'legible por el rol anónimo.';


-- Sólo EXECUTE, y sólo a los roles que las necesitan. Ninguna de las dos expone
-- datos: devuelven un booleano sobre un id que el llamante ya tiene.
grant execute on function public.invitacion_esta_publicada(uuid) to anon, authenticated;
grant execute on function public.firma_publica_permitida(uuid, boolean) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3. Las tres policies dependientes, recreadas sobre las funciones.
--    Deciden EXACTAMENTE lo mismo que antes; lo único que cambia es de dónde
--    sacan la respuesta.
-- ---------------------------------------------------------------------------
drop policy if exists "rsvp_insert_published_public" on public.rsvp_responses;

create policy "rsvp_insert_published_public"
  on public.rsvp_responses for insert
  to anon, authenticated
  with check (
    public.invitacion_esta_publicada(public.rsvp_responses.invitation_id)
  );


drop policy if exists "signatures_public_select" on public.invitation_signatures;

create policy "signatures_public_select"
  on public.invitation_signatures for select
  to anon, authenticated
  using (
    public.invitation_signatures.is_hidden = false
    and public.invitacion_esta_publicada(
          public.invitation_signatures.invitation_id
        )
  );


drop policy if exists "signatures_public_insert" on public.invitation_signatures;

create policy "signatures_public_insert"
  on public.invitation_signatures for insert
  to anon, authenticated
  with check (
    public.firma_publica_permitida(
      public.invitation_signatures.invitation_id,
      public.invitation_signatures.is_hidden
    )
  );


-- ---------------------------------------------------------------------------
-- 4. Y AHORA sí: fuera la lectura pública directa. Este es el arreglo; todo lo
--    anterior es lo que hay que hacer ANTES para no romper nada.
-- ---------------------------------------------------------------------------
drop policy if exists "invitations_select_published_public" on public.invitations;
drop policy if exists "modules_select_published_public" on public.invitation_modules;


-- ---------------------------------------------------------------------------
-- 5. VERIFICACIÓN. Devuelve filas, así que sirve de cierre de la migración.
--    Esperado: exactamente 5 filas y las 5 con `ok = true`.
-- ---------------------------------------------------------------------------
select
  comprobacion,
  valor,
  esperado,
  valor = esperado as ok
from (
  values
    ('policy publica de invitations retirada',
     (select count(*) from pg_policies
       where schemaname = 'public' and tablename = 'invitations'
         and policyname = 'invitations_select_published_public'), 0),
    ('policy publica de invitation_modules retirada',
     (select count(*) from pg_policies
       where schemaname = 'public' and tablename = 'invitation_modules'
         and policyname = 'modules_select_published_public'), 0),
    ('el dueno conserva su select sobre invitations',
     (select count(*) from pg_policies
       where schemaname = 'public' and tablename = 'invitations'
         and policyname = 'invitations_owner_select'), 1),
    ('el dueno conserva su acceso a los modulos',
     (select count(*) from pg_policies
       where schemaname = 'public' and tablename = 'invitation_modules'
         and policyname = 'modules_owner_all'), 1),
    ('las tres policies dependientes existen',
     (select count(*) from pg_policies
       where schemaname = 'public'
         and policyname in ('rsvp_insert_published_public',
                            'signatures_public_select',
                            'signatures_public_insert')), 3)
) as t(comprobacion, valor, esperado);
