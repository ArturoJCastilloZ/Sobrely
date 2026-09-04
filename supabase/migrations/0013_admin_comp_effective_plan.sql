-- ============================================================================
-- 0013_admin_comp_effective_plan.sql — el comp de admin baja a SQL
--
-- `0012` dejó DOS implementaciones del plan efectivo:
--
--   * TS  `getInvitationEffectivePlan` (src/lib/billing/entitlements.ts) — sí
--     aplicaba el comp de cuentas admin (acceso de cortesía al plan más alto).
--   * SQL `public.invitation_effective_plan` — NO lo aplicaba.
--
-- Las tres RPC públicas (`get_public_invitation`, `..._by_vanity`,
-- `get_guest_invitation`) leen la SQL, así que la invitación de un admin se
-- publicaba con `plan_code = 'free'` (marca "Hecho con Sobrely" visible) y
-- quedaba sujeta a la vigencia del demo de 14 días → 404 al vencer, justo lo
-- contrario de "acceso completo sin compra".
--
-- Aquí el comp queda en UNA sola fuente de verdad — la BD — y el TS la consume
-- por RPC. Dos funciones cambian de comportamiento:
--
--   * `invitation_effective_plan` → 'premium' si el dueño es admin.
--   * `is_entitlement_active`     → true si el dueño es admin (sin comprar ni
--     depender de una fila de entitlement, que es lo que gatea la visibilidad
--     pública). `is_published` sigue gateando aparte: el comp da plan, no
--     publica nada por su cuenta.
--
-- El comp NO es auto-asignable: cuelga de `admin_users`, tabla sin policies de
-- escritura (solo service_role) — misma garantía que `is_admin` (0009).
-- ============================================================================

-- ¿El DUEÑO de la invitación es una cuenta admin (comp)?
-- SECURITY DEFINER: resuelve el dueño y consulta `admin_users` saltando la RLS
-- de select-own, para que también funcione en contexto anónimo (RSVP público,
-- página del invitado) donde nadie puede leer ni la invitación ni la tabla.
create or replace function public.invitation_owner_is_comped(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select public.is_admin(i.user_id)
      from public.invitations i
      where i.id = p_invitation_id
    ),
    false
  );
$$;

-- ¿La invitación tiene un entitlement vigente ahora? (o comp de admin)
create or replace function public.is_entitlement_active(p_invitation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.invitation_owner_is_comped(p_invitation_id)
    or exists (
      select 1
      from public.invitation_entitlements e
      where e.invitation_id = p_invitation_id
        and e.status = 'active'
        and (e.expires_at is null or e.expires_at > now())
    );
$$;

-- Código del plan efectivo de una invitación (o null si no tiene entitlement
-- vigente y su dueño no es admin).
create or replace function public.invitation_effective_plan(p_invitation_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.invitation_owner_is_comped(p_invitation_id) then 'premium'
    else (
      select p.code
      from public.invitation_entitlements e
      join public.plans p on p.id = e.plan_id
      where e.invitation_id = p_invitation_id
        and e.status = 'active'
        and (e.expires_at is null or e.expires_at > now())
      limit 1
    )
  end;
$$;

-- El TS la invoca con el cliente de sesión (y el anónimo la usa indirectamente
-- vía las RPC públicas, que ya son SECURITY DEFINER).
grant execute on function public.invitation_owner_is_comped(uuid) to anon, authenticated;
