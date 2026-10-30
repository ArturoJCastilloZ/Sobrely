-- ============================================================================
-- 0071 · La lista de invitados es de Premium también en la BASE
--
-- Desde 35d3c46 la lista de invitados nominales con link único y QR
-- (`guest_management`) es solo de Premium: se ARMA gratis en borrador y se COBRA
-- al publicar; el ingreso en la puerta (check-in) es solo Premium. Ese gate vivía
-- únicamente en el servidor (`canManageGuestList`, `canUseGuestManagement`,
-- `setPublished`), pero las políticas `invitations_owner_update` (0001) y
-- `guests_owner_all` (0011) solo miran la propiedad. Con su JWT y la llave
-- pública, el dueño llamaba a PostgREST directo y, medido en local antes de esta
-- migración (`scripts/atacar-rls-lista-invitados.mts`, 16 de 16 ataques pasaban):
--   * PATCH `rsvp_mode = 'guest_list'` en una invitación ya publicada con
--     Esencial, Celebración o sin plan;
--   * PATCH `is_published = true` de un borrador en modo lista sin Premium;
--   * INSERT de una invitación que nace publicada en modo lista;
--   * INSERT / PATCH de invitados en una invitación publicada sin Premium;
--   * PATCH `checked_in_at` (ingreso) sin Premium.
--
-- Aquí la base impone la MISMA regla que el servidor:
--   1. `invitations`: no puede ENTRAR al estado «publicada en modo lista» si su
--      plan efectivo no incluye la lista. Disparador BEFORE INSERT OR UPDATE.
--      Solo la transición: una fila que ya estaba publicada en modo lista (p. ej.
--      el Premium venció) puede despublicarse, volver a `open` o editar su
--      título; lo que no puede es llegar ahí sin pagar.
--   2. `invitation_guests`: INSERT y UPDATE solo si la invitación NO está
--      publicada o su plan incluye la lista; tocar `checked_in_at` (marcar o
--      revertir el ingreso, también al insertar) solo con la lista en el plan.
--      DELETE queda libre: borrar un invitado es la salida, no el uso.
--
-- «Plan con la lista» = `plan_tiene_lista_invitados(invitation_effective_plan(id))`
-- o dueño admin (comp, `is_admin`). Las capacidades de los planes NO están en la
-- BD (0016 quitó `plans.features`; viven en `src/lib/billing/plans.ts`), así que
-- `plan_tiene_lista_invitados` es su espejo SQL y
-- `src/lib/billing/lista-invitados-sql.test.ts` falla si ambos divergen.
--
-- POR QUÉ DISPARADOR Y NO POLÍTICAS POR COMANDO
--   * Una política RLS no ve `old`: no puede distinguir «entra al estado
--     publicada+lista» de «ya estaba ahí», ni «cambió `checked_in_at`» de «se
--     editó el nombre». El disparador sí.
--   * Rechaza con un código propio (`LISTA_REQUIERE_PREMIUM`) en vez de un UPDATE
--     que devuelve 200 con 0 filas, que es justo el tipo de éxito falso que ya
--     costó caro en este proyecto.
--   * `guests_owner_all` se queda como está: sigue siendo la frontera de
--     PROPIEDAD; esto es la de PLAN, una capa encima.
--
-- ALCANCE POR ROL: solo `anon` y `authenticated` (las sesiones anónimas de
-- Supabase son `authenticated` con `is_anonymous`, así que también quedan
-- cubiertas). Se decide por `current_user` dentro de funciones SECURITY INVOKER:
--   * `service_role` (fulfillment.ts tras el pago, el panel de admin) y el
--     `postgres` de migraciones y mantenimiento no se tocan: ya validan en su
--     propio código y algunos DEBEN poder escribir (publicar tras cobrar).
--   * Las RPC SECURITY DEFINER (`respond_guest`, `get_guest_invitation`) corren
--     como su dueño, así que `current_user` deja de ser `anon`/`authenticated` y
--     el disparador no las frena: acotan por token y no tocan `checked_in_at`.
--   * Por eso estas funciones NO pueden ser SECURITY DEFINER (con ellas
--     `current_user` sería siempre el dueño y el candado no cerraría nada); la
--     autocomprobación lo exige.
--
-- Carrera (TOCTOU): el disparador de invitados bloquea la fila de la invitación
-- `for share` antes de leer `is_published`, así que no se cuela un invitado
-- mientras otra transacción la publica.
--
-- No borra ni modifica datos. Idempotente: se puede volver a aplicar sin daño.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Espejo SQL de `planHasFeature(plan, "guest_management")` (plans.ts).
-- ----------------------------------------------------------------------------
create or replace function public.plan_tiene_lista_invitados(p_plan_code text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_plan_code in ('premium'), false)
$$;

comment on function public.plan_tiene_lista_invitados(text) is
  'Espejo de guest_management en src/lib/billing/plans.ts. Si cambia allí, cambia aquí (lo vigila lista-invitados-sql.test.ts).';

-- ----------------------------------------------------------------------------
-- 1. invitations: no se publica en modo lista sin el plan.
-- ----------------------------------------------------------------------------
create or replace function public.impedir_lista_publicada_sin_premium()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.is_published is true and new.rsvp_mode = 'guest_list'
     and (
       tg_op = 'INSERT'
       or not (old.is_published is true and old.rsvp_mode = 'guest_list')
     )
     -- En un INSERT la fila aún no existe: el comp se resuelve por `user_id`.
     and not (
       public.is_admin(new.user_id)
       or public.plan_tiene_lista_invitados(public.invitation_effective_plan(new.id))
     )
  then
    raise exception 'LISTA_REQUIERE_PREMIUM'
      using hint = 'Publicar con lista de invitados requiere Premium.';
  end if;

  return new;
end
$$;

drop trigger if exists invitaciones_lista_solo_premium on public.invitations;
create trigger invitaciones_lista_solo_premium
  before insert or update on public.invitations
  for each row execute function public.impedir_lista_publicada_sin_premium();

-- ----------------------------------------------------------------------------
-- 2. invitation_guests: armar la lista en borrador o con el plan; el ingreso,
--    solo con el plan. DELETE no pasa por aquí.
-- ----------------------------------------------------------------------------
create or replace function public.impedir_invitados_sin_premium()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invitaciones uuid[];
  v_id uuid;
  v_publicada boolean;
  v_duenio uuid;
  v_tiene_lista boolean;
  v_toca_ingreso boolean;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  v_toca_ingreso := case
    when tg_op = 'INSERT' then new.checked_in_at is not null
    else new.checked_in_at is distinct from old.checked_in_at
  end;

  -- Si el invitado cambia de invitación, se exige en las dos.
  v_invitaciones := case
    when tg_op = 'UPDATE' and new.invitation_id is distinct from old.invitation_id
      then array[old.invitation_id, new.invitation_id]
    else array[new.invitation_id]
  end;

  foreach v_id in array v_invitaciones loop
    select i.is_published, i.user_id
      into v_publicada, v_duenio
      from public.invitations i
     where i.id = v_id
       for share;

    if not found then
      -- Fail-closed: lo que la sesión no puede leer no lo puede armar.
      raise exception 'LISTA_REQUIERE_PREMIUM'
        using hint = 'Invitación no encontrada.';
    end if;

    v_tiene_lista := public.is_admin(v_duenio)
      or public.plan_tiene_lista_invitados(public.invitation_effective_plan(v_id));

    if not v_tiene_lista and (v_toca_ingreso or v_publicada is true) then
      raise exception 'LISTA_REQUIERE_PREMIUM'
        using hint = case
          when v_toca_ingreso then 'El ingreso con QR requiere Premium.'
          else 'La lista de una invitación publicada requiere Premium.'
        end;
    end if;
  end loop;

  return new;
end
$$;

drop trigger if exists invitados_lista_solo_premium on public.invitation_guests;
create trigger invitados_lista_solo_premium
  before insert or update on public.invitation_guests
  for each row execute function public.impedir_invitados_sin_premium();

-- ----------------------------------------------------------------------------
-- Autocomprobación: si el candado queda abierto, la migración FALLA.
-- ----------------------------------------------------------------------------

-- (a) Estructura. `tgtype`: 1 = por fila, 2 = BEFORE, 4 = INSERT, 8 = DELETE,
--     16 = UPDATE.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'invitaciones_lista_solo_premium'
      and tgrelid = 'public.invitations'::regclass
      and not tgisinternal and tgenabled <> 'D'
      and (tgtype & 1) <> 0 and (tgtype & 2) <> 0
      and (tgtype & 4) <> 0 and (tgtype & 16) <> 0
  ) then
    raise exception 'invitaciones_lista_solo_premium no es BEFORE INSERT OR UPDATE por fila';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'invitados_lista_solo_premium'
      and tgrelid = 'public.invitation_guests'::regclass
      and not tgisinternal and tgenabled <> 'D'
      and (tgtype & 1) <> 0 and (tgtype & 2) <> 0
      and (tgtype & 4) <> 0 and (tgtype & 16) <> 0
      and (tgtype & 8) = 0
  ) then
    raise exception 'invitados_lista_solo_premium no es BEFORE INSERT OR UPDATE por fila (sin DELETE)';
  end if;

  -- SECURITY DEFINER haría que `current_user` fuera siempre el dueño: todo pasaría.
  if exists (
    select 1 from pg_proc
    where oid in (
      'public.impedir_lista_publicada_sin_premium()'::regprocedure,
      'public.impedir_invitados_sin_premium()'::regprocedure
    )
    and prosecdef
  ) then
    raise exception 'los disparadores de la lista no pueden ser SECURITY DEFINER';
  end if;

  -- El espejo de plans.ts: exactamente Premium entre los planes de la tabla.
  if (select array_agg(code order by code) from public.plans
       where public.plan_tiene_lista_invitados(code)) is distinct from array['premium']
     or public.plan_tiene_lista_invitados(null) is not false then
    raise exception 'plan_tiene_lista_invitados no coincide con plans.ts (solo premium)';
  end if;
end
$$;

-- (b) Comportamiento, como `authenticated`, dentro de un bloque que SIEMPRE se
--     revierte (no deja filas). Se usa un usuario existente que no sea admin; en
--     una base sin usuarios se omite con aviso.
do $$
declare
  v_user uuid;
  v_inv uuid;
  v_guest uuid;
  v_premium uuid;
  v_publicar_sin_plan text;
  v_ingreso_sin_plan text;
  v_volver_a_open text;
  v_ingreso_premium text;
begin
  select u.id into v_user
    from auth.users u
   where not public.is_admin(u.id)
   limit 1;
  if v_user is null then
    raise notice '0071: sin usuarios no admin, se omite la prueba de comportamiento';
    return;
  end if;
  select id into v_premium from public.plans where code = 'premium';

  begin
    insert into public.invitations (user_id, title, slug, rsvp_mode)
    values (v_user, 'autocomprobacion 0071', 'autocomprobacion-0071-' || gen_random_uuid(), 'guest_list')
    returning id into v_inv;
    insert into public.invitation_guests (invitation_id, name)
    values (v_inv, 'autocomprobacion')
    returning id into v_guest;

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    begin
      update public.invitations set is_published = true, status = 'published' where id = v_inv;
      v_publicar_sin_plan := 'abierto';
    exception when others then
      v_publicar_sin_plan := case when sqlerrm = 'LISTA_REQUIERE_PREMIUM' then 'cerrado' else sqlerrm end;
    end;

    begin
      update public.invitation_guests set checked_in_at = now() where id = v_guest;
      v_ingreso_sin_plan := 'abierto';
    exception when others then
      v_ingreso_sin_plan := case when sqlerrm = 'LISTA_REQUIERE_PREMIUM' then 'cerrado' else sqlerrm end;
    end;

    begin
      update public.invitations set rsvp_mode = 'open' where id = v_inv;
      update public.invitations set rsvp_mode = 'guest_list' where id = v_inv;
      v_volver_a_open := 'pasa';
    exception when others then
      v_volver_a_open := sqlerrm;
    end;

    perform set_config('role', 'postgres', true);
    insert into public.invitation_entitlements (invitation_id, plan_id, status, starts_at, expires_at)
    values (v_inv, v_premium, 'active', now(), now() + interval '1 day');
    perform set_config('role', 'authenticated', true);

    begin
      update public.invitations set is_published = true, status = 'published' where id = v_inv;
      update public.invitation_guests set checked_in_at = now() where id = v_guest;
      v_ingreso_premium := 'pasa';
    exception when others then
      v_ingreso_premium := sqlerrm;
    end;

    raise exception 'REVERTIR_0071';
  exception when others then
    if sqlerrm <> 'REVERTIR_0071' then
      raise;
    end if;
  end;

  if v_publicar_sin_plan <> 'cerrado' then
    raise exception '0071: publicar en modo lista sin Premium quedó %', v_publicar_sin_plan;
  end if;
  if v_ingreso_sin_plan <> 'cerrado' then
    raise exception '0071: el ingreso sin Premium quedó %', v_ingreso_sin_plan;
  end if;
  if v_volver_a_open <> 'pasa' then
    raise exception '0071: cambiar de modo en borrador sin Premium falló: %', v_volver_a_open;
  end if;
  if v_ingreso_premium <> 'pasa' then
    raise exception '0071: Premium no pudo publicar o hacer el ingreso: %', v_ingreso_premium;
  end if;
end
$$;
