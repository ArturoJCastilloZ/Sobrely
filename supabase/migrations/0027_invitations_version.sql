-- ============================================================================
-- 0027 — Bloqueo optimista del editor: columna `version` en invitations
-- ============================================================================
--
-- El problema: `saveEditor` no tenía token de versión, así que dos pestañas
-- (o dos dispositivos) sobre la misma invitación se pisaban EN SILENCIO. Y no
-- era solo "el último gana" sobre los ajustes: la reconciliación de módulos
-- calcula los borrados contra la lista que MANDA el cliente, así que la
-- pestaña B borraba los módulos que la pestaña A acababa de crear. Nadie veía
-- un error.
--
-- La solución es un entero que se compara y se incrementa en la MISMA
-- sentencia (compare-and-set):
--
--   update invitations set ..., version = <esperada> + 1
--    where id = ? and user_id = ? and version = <esperada>
--
-- De N guardados concurrentes con la misma versión esperada, la cláusula
-- `where` deja pasar exactamente UNO; los demás afectan 0 filas y el servidor
-- responde conflicto. Es el mismo principio que la `0020` del reporte con PIN:
-- una defensa que se lee en una consulta y se escribe en otra no defiende
-- nada.
--
-- Por qué un entero y no `updated_at`, que ya existe con su trigger: un
-- `timestamptz` viaja al navegador y vuelve por JSON, y JS solo tiene
-- milisegundos, así que la comparación perdería los microsegundos que
-- Postgres sí guarda — falla justo del modo silencioso que esto viene a
-- arreglar. Este proyecto ya pagó una lección con colisiones de `created_at`
-- al microsegundo en el pegado masivo de invitados.
--
-- `default 1` cubre las 12 invitaciones que ya existen sin necesidad de
-- backfill: al leerlas devuelven 1, y el primer guardado las deja en 2.
-- ============================================================================

alter table public.invitations
  add column if not exists version integer not null default 1;

comment on column public.invitations.version is
  'Token de bloqueo optimista del editor. saveEditor lo compara y lo incrementa en una sola sentencia; si no coincide, el guardado se rechaza en vez de pisar el trabajo de otra pestaña.';
