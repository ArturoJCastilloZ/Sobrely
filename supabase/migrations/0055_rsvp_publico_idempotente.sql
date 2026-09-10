-- ============================================================================
-- 0055 — El RSVP público deja de duplicar respuestas
--
-- EL PROBLEMA, reproducido en el E2E del 2026-09-10 y encontrado TAMBIÉN en
-- producción:
--
--   El mismo invitado, mismo nombre y mismo correo, confirmó dos veces tras un
--   refresh y quedaron dos filas idénticas. El panel del anfitrión pasó a decir
--   «2 personas en total» por UNA sola persona.
--
--   Y no es teórico. Medido en la base el 2026-09-10, en la invitación de un
--   cliente con el evento a 16 días:
--       2026-09-08 05:04:58   yes   13 pases
--       2026-09-08 05:05:33   yes    1 pase
--   Treinta y cinco segundos de diferencia y el MISMO correo: una persona
--   corrigiéndose, contada dos veces. (Sin nombre ni correo aquí: son datos de
--   una invitada de un cliente y no tienen por qué vivir en el historial de
--   git. Los ids de las dos filas están en la cabecera de la `0056`.) El anfitrión planea comida y lugares con
--   ese número, y en los planes con tope de invitados cada reenvío quema cupo.
--
-- El doble CLIC ya estaba protegido; lo que no estaba protegido era el REENVÍO.
--
-- LA CONDUCTA, decidida por el dev: si el correo coincide, se ACTUALIZA la
-- respuesta anterior en vez de añadir otra. Sin correo se sigue guardando,
-- porque deduplicar por nombre puede pisar a dos invitados que de verdad se
-- llaman igual.
--
-- POR QUÉ UNA FUNCIÓN Y NO UN `upsert` DESDE LA APLICACIÓN: el RSVP público
-- inserta con el rol ANÓNIMO (`src/lib/rsvp/actions.ts`), y `anon` sólo tiene
-- policy de INSERT sobre `rsvp_responses` — no puede hacer UPDATE, y no se le
-- va a dar, porque entonces cualquiera podría reescribir la respuesta de otro.
-- La salida es la que el repo ya usa para el otro modo de RSVP
-- (`respond_guest`, 0018): una función `security definer` que hace la
-- comprobación y la escritura, y a la que sólo se le concede EXECUTE.
-- ============================================================================

create or replace function public.registrar_rsvp_publico(
  p_invitation_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_attendance_status text,
  p_guest_count integer,
  p_message text,
  p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := nullif(btrim(coalesce(p_guest_email, '')), '');
begin
  -- MISMA puerta que la policy `rsvp_insert_published_public` (0001:328): sólo
  -- invitaciones publicadas. Se comprueba aquí porque una función definer se
  -- salta la RLS, así que el gate tiene que viajar con ella o desaparece.
  if not exists (
    select 1 from public.invitations i
     where i.id = p_invitation_id
       and i.is_published = true
  ) then
    raise exception 'invitacion no publicada' using errcode = '42501';
  end if;

  if v_email is not null then
    -- El correo se compara en minúsculas: «Ana@X.com» y «ana@x.com» son la
    -- misma persona para cualquiera menos para un `=` de SQL.
    update public.rsvp_responses r
       set guest_name        = p_guest_name,
           guest_email       = p_guest_email,
           attendance_status = p_attendance_status,
           guest_count       = p_guest_count,
           message           = p_message,
           answers           = p_answers,
           updated_at        = now()
     where r.invitation_id = p_invitation_id
       and lower(r.guest_email) = lower(v_email)
    returning r.id into v_id;

    if v_id is not null then
      return v_id;
    end if;
  end if;

  begin
    insert into public.rsvp_responses (
      invitation_id, guest_name, guest_email,
      attendance_status, guest_count, message, answers
    ) values (
      p_invitation_id, p_guest_name, v_email,
      p_attendance_status, p_guest_count, p_message, p_answers
    )
    returning id into v_id;
  exception when unique_violation then
    -- Sólo puede ocurrir con el índice único de la `0056` puesto Y dos envíos
    -- simultáneos del mismo correo: el otro ganó la carrera entre el UPDATE de
    -- arriba y este INSERT. Se reintenta el UPDATE, que ahora sí encuentra
    -- fila. Sin la `0056` esta rama es código muerto, y se escribe igual para
    -- que la función sea correcta ANTES y DESPUÉS de aplicarla.
    update public.rsvp_responses r
       set guest_name        = p_guest_name,
           guest_email       = p_guest_email,
           attendance_status = p_attendance_status,
           guest_count       = p_guest_count,
           message           = p_message,
           answers           = p_answers,
           updated_at        = now()
     where r.invitation_id = p_invitation_id
       and lower(r.guest_email) = lower(v_email)
    returning r.id into v_id;
  end;

  return v_id;
end;
$$;

comment on function public.registrar_rsvp_publico(uuid, text, text, text, integer, text, jsonb) is
  'RSVP publico idempotente por correo. Definer porque `anon` no tiene UPDATE '
  'sobre rsvp_responses y no debe tenerlo. Lleva dentro el mismo gate de '
  '`is_published` que la policy de insert.';

grant execute on function public.registrar_rsvp_publico(uuid, text, text, text, integer, text, jsonb)
  to anon, authenticated;


-- ---------------------------------------------------------------------------
-- VERIFICACIÓN. Devuelve filas: 2 filas, las 2 con `ok = true`.
-- No escribe nada: sólo comprueba que la función quedó instalada con la firma
-- y las propiedades correctas.
-- ---------------------------------------------------------------------------
select
  comprobacion,
  valor,
  esperado,
  valor = esperado as ok
from (
  values
    ('la funcion existe y es definer',
     (select count(*)::int from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = 'registrar_rsvp_publico'
         and p.prosecdef), 1),
    ('anon puede ejecutarla',
     (select count(*)::int
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = 'registrar_rsvp_publico'
         and has_function_privilege('anon', p.oid, 'EXECUTE')), 1)
) as t(comprobacion, valor, esperado);
