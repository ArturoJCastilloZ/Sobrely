-- ============================================================================
-- 0020_report_attempt_atomic.sql — el bloqueo del PIN, ahora sí atómico
--
-- Arregla un defecto REAL de la 0019, encontrado por la auditoría antes de
-- llegar a producción.
--
-- Cómo estaba: la server action leía `failed_attempts` en una consulta y
-- escribía `failed_attempts + 1` en otra. Entre las dos no había nada. Un lote
-- de 200 peticiones simultáneas leía 0 las 200 veces y escribía 1 las 200
-- veces: el contador quedaba en 1, `locked_until` en null, y el bloqueo de
-- cinco intentos NUNCA se disparaba. La protección contra fuerza bruta se
-- saltaba con concurrencia, que es la forma obvia de atacar un PIN de seis
-- dígitos.
--
-- No bastaba con incrementar atómicamente. Si el intento se cobra DESPUÉS de
-- verificar el PIN, un lote concurrente igual pasa entero: las 200 leen
-- `locked_until = null`, las 200 verifican, y recién después se acumulan los
-- fallos. Por eso el intento se COBRA POR ADELANTADO: se descuenta antes de
-- verificar, y quien llega cuando el cupo ya se agotó recibe "bloqueado" sin
-- que su PIN se compare nunca. Un acierto lo devuelve todo a cero.
--
-- Por qué la política sigue en TypeScript: `p_max_attempts` y `p_lock_minutes`
-- son PARÁMETROS, no constantes horneadas aquí. Los manda `constants.ts`, que
-- es también de donde la UI saca el número que le enseña al usuario. Lo que
-- baja a SQL es solo lo que SQL puede hacer y el código no: la atomicidad.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Cobra un intento y devuelve lo necesario para verificar el PIN.
--
-- Devuelve `null` si el token no existe o está revocado (no se distinguen).
-- Devuelve `locked = true` si el cupo ya estaba agotado, y en ese caso NO
-- entrega el hash: quien está bloqueado no llega ni a comparar.
-- ----------------------------------------------------------------------------
create or replace function public.claim_report_attempt(
  p_token         text,
  p_max_attempts  integer,
  p_lock_minutes  integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id            uuid;
  v_invitation_id uuid;
  v_pin_hash      text;
  v_locked_until  timestamptz;
  v_attempts      integer;
begin
  -- `for update` serializa a los concurrentes: el segundo espera al primero y
  -- lee el contador YA incrementado. Es la pieza que faltaba.
  select id, invitation_id, pin_hash, locked_until
    into v_id, v_invitation_id, v_pin_hash, v_locked_until
  from public.invitation_reports
  where token = p_token
    and revoked_at is null
  for update;

  if v_id is null then
    return null;
  end if;

  if v_locked_until is not null and v_locked_until > now() then
    return jsonb_build_object('locked', true, 'locked_until', v_locked_until);
  end if;

  -- El intento se cobra ANTES de verificar. El contador NO se reinicia al
  -- expirar el bloqueo: si se reiniciara, quien ataca recuperaría el cupo
  -- completo cada `p_lock_minutes` en vez de ganar un intento suelto.
  update public.invitation_reports
     set failed_attempts = failed_attempts + 1,
         locked_until = case
           when failed_attempts + 1 >= p_max_attempts
             then now() + make_interval(mins => p_lock_minutes)
           else locked_until
         end
   where id = v_id
  returning failed_attempts, locked_until
       into v_attempts, v_locked_until;

  return jsonb_build_object(
    'locked',          false,
    'invitation_id',   v_invitation_id,
    'pin_hash',        v_pin_hash,
    'failed_attempts', v_attempts,
    'locked_until',    v_locked_until
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Acierto: devuelve el intento cobrado, limpia el bloqueo y cuenta la visita.
-- El `view_count` sube aquí y no desde el código por la misma razón que el
-- contador de fallos: dos aperturas a la vez registraban una sola.
-- ----------------------------------------------------------------------------
create or replace function public.finish_report_attempt(
  p_token text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.invitation_reports
     set failed_attempts = 0,
         locked_until    = null,
         view_count      = view_count + 1,
         last_viewed_at  = now()
   where token = p_token
     and revoked_at is null;
$$;

-- ----------------------------------------------------------------------------
-- Permisos: NADIE público puede llamarlas.
--
-- A diferencia de `get_guest_invitation` y `respond_guest`, estas NO se otorgan
-- a `anon`. Se mantiene la propiedad de la 0019: el visitante nunca habla con
-- la base, ni por RPC. El único que las invoca es el servidor con la
-- service_role, que además es quien tiene el PIN que el visitante tecleó.
--
-- Postgres otorga EXECUTE a PUBLIC por defecto, así que hay que revocarlo
-- explícitamente — si no, el `anon` podría cobrar intentos ajenos y dejar
-- bloqueada la liga de cualquiera con solo tener el token.
-- ----------------------------------------------------------------------------
revoke all on function public.claim_report_attempt(text, integer, integer) from public;
revoke all on function public.finish_report_attempt(text) from public;

grant execute on function public.claim_report_attempt(text, integer, integer) to service_role;
grant execute on function public.finish_report_attempt(text) to service_role;

comment on function public.claim_report_attempt(text, integer, integer) is
  'Cobra un intento de PIN de forma atómica (for update) y devuelve el hash para verificarlo. Cobrar por adelantado es lo que impide que un lote concurrente se salte el bloqueo. No otorgada a anon.';

comment on function public.finish_report_attempt(text) is
  'Acierto de PIN: limpia contador y bloqueo, y suma una visita. No otorgada a anon.';
