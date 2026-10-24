-- ============================================================================
-- 0065 · Un anónimo tampoco INSERTA una invitación ya publicada
--
-- Hallazgo H1 de la revisión T08 (docs/auditoria-2026-10/13). El disparador
-- `impedir_publicar_anonimo` (0062) solo corría en `UPDATE`, así que una sesión
-- anónima podía llamar a la API directo y hacer
--   INSERT INTO invitations (..., is_published, status) VALUES (..., true, 'published')
-- y el candado «un anónimo no publica» no se enteraba. Medido en una transacción
-- con JWT anónimo (revertida): el INSERT pasaba y el UPDATE equivalente fallaba
-- con `ANONIMO_NO_PUBLICA`.
--
-- Impacto real, que por eso era de gravedad baja: la RPC pública exige
-- `is_published` Y `is_entitlement_active(...)`, y `invitation_entitlements` no
-- tiene política de escritura para `authenticated`; sin acceso pagado la
-- invitación no se sirve. Lo que sí quedaba era una fila «publicada» en el panel
-- de quien nunca pudo publicar. Aquí se cierra el mismo candado para las dos
-- operaciones.
--
-- No cambia nada para personas registradas ni para `service_role`:
-- `es_sesion_anonima()` da `false` sin JWT anónimo.
--
-- Idempotente: se puede volver a aplicar sin daño.
-- ============================================================================

create or replace function public.impedir_publicar_anonimo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.es_sesion_anonima() then
    if tg_op = 'INSERT' then
      -- En un INSERT no existe `old`: cualquier intento de nacer publicada se rechaza.
      if new.is_published is true or new.status = 'published' then
        raise exception 'ANONIMO_NO_PUBLICA'
          using hint = 'Crea una cuenta para publicar.';
      end if;
    elsif (new.is_published is true and old.is_published is not true)
       or (new.status = 'published' and old.status is distinct from 'published') then
      raise exception 'ANONIMO_NO_PUBLICA'
        using hint = 'Crea una cuenta para publicar.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists invitaciones_anonimo_no_publica on public.invitations;
create trigger invitaciones_anonimo_no_publica
  before insert or update on public.invitations
  for each row execute function public.impedir_publicar_anonimo();

-- ----------------------------------------------------------------------------
-- Autocomprobación: si el disparador no cubre INSERT y UPDATE, la migración FALLA.
-- `tgtype`: 1 = por fila, 2 = BEFORE, 4 = INSERT, 16 = UPDATE.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'invitaciones_anonimo_no_publica'
      and tgrelid = 'public.invitations'::regclass
      and not tgisinternal
      and (tgtype & 1) <> 0 and (tgtype & 2) <> 0
      and (tgtype & 4) <> 0 and (tgtype & 16) <> 0
  ) then
    raise exception 'invitaciones_anonimo_no_publica no es BEFORE INSERT OR UPDATE por fila';
  end if;
end
$$;
