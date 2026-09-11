-- ============================================================================
-- 0056 — Índice único que cierra la carrera del RSVP  ✅ APLICADA 2026-09-11
--
-- La `0055` deja el RSVP público idempotente en la práctica, pero por
-- UPDATE-y-si-no-INSERT, que tiene una ventana de carrera: dos envíos
-- simultáneos del mismo correo pueden colarse los dos. Este índice la cierra
-- de verdad, y la `0055` ya trae el manejador de `unique_violation` que lo
-- aprovecha.
--
-- ✅ APLICADA el 2026-09-11, tras reconciliar el duplicado. Las 2
--    comprobaciones de abajo salieron en `ok = true`.
--    Verificado por efecto contra el UNIVERSO, no el filtro:
--      · `rsvp_responses` 14 -> 13 filas; la desaparecida es EXACTAMENTE la de
--        13 pases (`4d16d81b`) y ninguna otra; 0 filas nuevas que atribuir.
--      · la de 1 pase (`ec880b48`) sigue viva con `guest_count = 1`.
--      · 0 pares duplicados por correo en toda la tabla.
--      · el `create index` no movio ni una fila (13 -> 13).
--
-- Lo de abajo se conserva como historia de POR QUE estuvo bloqueada y como se
-- decidio. El runbook ya no hay que ejecutarlo.
--
-- ⛔ (HISTORICO) NO SE PUDO APLICAR HASTA RECONCILIAR UN DUPLICADO QUE YA EXISTIA.
--
-- Medido el 2026-09-10: hay UN par duplicado en producción, y es de un cliente
-- real, en una invitación con el evento a 16 días. Crear el índice con ese par
-- vivo falla con `23505` y no se aplica nada.
--
--     invitación  33872752-88de-42d8-a93e-ff75a545fc6e
--     respuesta   4d16d81b-6eb7-4a4e-a666-44a86769953a   2026-09-08 05:04:58   13 pases
--     respuesta   ec880b48-9830-4b69-bd82-11c422230ef2   2026-09-08 05:05:33    1 pase
--
-- (Sin nombre ni correo a propósito: son datos de una invitada de un cliente y
-- no tienen por qué vivir en el historial de git. Con los ids basta, y el PASO
-- 1 los muestra en pantalla cuando hace falta decidir.)
--
-- ── MEDIDO DE NUEVO el 2026-09-11 (04:41 UTC), y aparecio un dato que esta
--    cabecera NO tenia y que INCLINA la decision:
--
--      · la fila de  1 pase (ec880b48) fue ACTUALIZADA el 2026-09-10 21:13 UTC
--      · la fila de 13 pases (4d16d81b) NUNCA se ha tocado (created = updated)
--
--    El unico camino del producto que actualiza UNA fila por id es
--    `updateRsvp` (`src/lib/rsvp/actions.ts:165`), que es «el ANFITRION edita
--    una respuesta desde su panel». La RPC de la `0055` no pudo ser: su UPDATE
--    filtra por (invitation_id, correo) SIN limite, asi que habria tocado las
--    DOS filas, y la de 13 sigue intacta.
--    O sea: el dueño del evento ya trato esa fila como la buena.
--
--    Universo recontado: `rsvp_responses` = 14 filas (no 13), 7 con correo y
--    7 sin. La fila nueva es `4881fdc5`, del 2026-09-10 19:01 UTC, trafico
--    REAL de esta misma invitacion — no es de prueba. Sigue habiendo
--    EXACTAMENTE 1 par duplicado, este.
--
--    Contexto: invitacion de un CLIENTE (no del dev), publicada, `rsvp_mode`
--    abierto, evento el 2026-09-26 — 15 dias — y sigue recibiendo respuestas.
--
-- ⚠️ (YA NO APLICA, el indice esta puesto) ORDEN QUE IMPORTABA: mientras el
--    duplicado siguiera vivo, NO convenia desplegar
--    el codigo que llama a la RPC de la `0055`. Su UPDATE sin limite tocaria
--    las dos filas a la vez, asi que un reenvio de esa invitada MACHACARIA la
--    fila de 13 pases con lo que escriba — destruyendo el dato sobre el que
--    aun no se ha decidido. Primero el PASO 2, despues desplegar.
--
-- Son 35 segundos de diferencia y el mismo correo: casi con seguridad la misma
-- persona corrigiéndose. Pero CUÁL de las dos es la buena —13 pases o 1— es un
-- dato del cliente y la decisión es del dev, no mía. Trece pases o uno cambian
-- la comida de un evento.
--
-- PASO 1 (mirar, no borrar). Una sola sentencia, devuelve filas:
--
--     select id, guest_name, guest_email, attendance_status,
--            guest_count, message, created_at
--       from public.rsvp_responses
--      where id in ('4d16d81b-6eb7-4a4e-a666-44a86769953a',
--                   'ec880b48-9830-4b69-bd82-11c422230ef2')
--      order by created_at;
--
-- PASO 2 (decidir y borrar UNA, con el id explícito). Esperado: 1 fila.
--
--     delete from public.rsvp_responses
--      where id = '<el id que el dev decida>'
--     returning id, guest_name, guest_count;
--
-- PASO 3 (comprobar que no queda ningún otro duplicado). Esperado: 0 filas.
--
--     select invitation_id, lower(guest_email) as correo, count(*)
--       from public.rsvp_responses
--      where guest_email is not null
--      group by 1, 2
--     having count(*) > 1;
--
-- PASO 4: sólo entonces, la sentencia de abajo.
-- ============================================================================

-- Parcial: `guest_email is not null`. El correo es OPCIONAL en el formulario, y
-- sin la cláusula todas las respuestas sin correo colisionarían entre sí — que
-- es justo lo que el dev decidió NO hacer, porque dos invitados pueden
-- llamarse igual de verdad.
create unique index if not exists rsvp_responses_invitacion_correo_unico
  on public.rsvp_responses (invitation_id, lower(guest_email))
  where guest_email is not null;


-- ---------------------------------------------------------------------------
-- VERIFICACIÓN. Devuelve filas: 2 filas, las 2 con `ok = true`.
-- ---------------------------------------------------------------------------
select
  comprobacion,
  valor,
  esperado,
  valor = esperado as ok
from (
  values
    ('el indice unico existe',
     (select count(*)::int from pg_indexes
       where schemaname = 'public'
         and tablename = 'rsvp_responses'
         and indexname = 'rsvp_responses_invitacion_correo_unico'), 1),
    ('y no queda ningun duplicado por correo',
     (select count(*)::int from (
        select 1 from public.rsvp_responses
         where guest_email is not null
         group by invitation_id, lower(guest_email)
        having count(*) > 1
      ) d), 0)
) as t(comprobacion, valor, esperado);
