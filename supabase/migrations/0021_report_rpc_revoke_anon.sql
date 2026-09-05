-- ============================================================================
-- 0021_report_rpc_revoke_anon.sql — quitarle de verdad las RPC al anónimo
--
-- Arregla un agujero de la 0020, demostrado contra la base ANTES de mergear.
--
-- Qué pasó: la 0020 hacía `revoke all ... from public` creyendo que con eso
-- bastaba, porque Postgres otorga EXECUTE a PUBLIC por defecto. No bastaba.
-- Supabase tiene DEFAULT PRIVILEGES sobre el schema `public` que otorgan
-- EXECUTE a `anon`, `authenticated` y `service_role` en CADA función nueva.
-- Ese grant es explícito y a un rol nombrado, así que revocarle a PUBLIC no lo
-- toca: quedó vivo.
--
-- Consecuencia medida, no supuesta: con solo el token de la URL, un visitante
-- anónimo podía llamar `finish_report_attempt` y ponerse `failed_attempts = 0`
-- y `locked_until = null`. Es decir, se desbloqueaba solo entre intento e
-- intento y el límite de cinco dejaba de existir por completo — exactamente la
-- protección que la 0020 venía a arreglar. Se reprodujo con la llave pública:
-- liga bloqueada tras 5 intentos, una llamada del anon, liga abierta otra vez.
--
-- La lección para las próximas RPC de este proyecto: en Supabase, "no se la
-- doy a nadie" se escribe `revoke ... from anon, authenticated`, y se COMPRUEBA
-- llamando la función con la llave pública. `revoke from public` es una
-- afirmación que suena bien y no hace lo que parece.
-- ============================================================================

revoke all on function public.claim_report_attempt(text, integer, integer)
  from anon, authenticated, public;

revoke all on function public.finish_report_attempt(text)
  from anon, authenticated, public;

-- El único que las llama es el servidor con la service_role. Se re-otorga por
-- si el revoke de arriba se la quitó también (revocarle a PUBLIC sí afecta lo
-- que un rol hereda de PUBLIC).
grant execute on function public.claim_report_attempt(text, integer, integer)
  to service_role;

grant execute on function public.finish_report_attempt(text)
  to service_role;
