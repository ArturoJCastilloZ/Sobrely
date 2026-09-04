-- ============================================================================
-- 0014_realtime_rsvp.sql — el panel del evento en vivo
--
-- El indicador "En vivo" del panel se suscribe por Realtime a los cambios de
-- las respuestas de la invitación. Sin publicar las tablas, la suscripción se
-- establece pero NUNCA emite: el panel se quedaría mudo sin ningún error, que
-- es el peor modo de fallar.
--
-- La RLS sigue mandando: Realtime evalúa las policies del usuario sobre cada
-- fila antes de emitirla, y ambas tablas ya tienen policy de solo-dueño
-- (0001 y 0011). Publicar la tabla NO expone datos a terceros; el anónimo no
-- recibe filas porque no tiene policy de select.
--
-- `add table` falla si la tabla ya está publicada, así que se hace condicional
-- para que la migración sea idempotente.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'invitation_guests'
  ) then
    alter publication supabase_realtime add table public.invitation_guests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rsvp_responses'
  ) then
    alter publication supabase_realtime add table public.rsvp_responses;
  end if;
end $$;
