-- ============================================================================
-- 0054 — Distinguir «caducada» de «no existe» en la página pública
--
-- EL PROBLEMA, medido en producción el 2026-09-10:
--
--     slug                evento       ent.vigente
--     invitacion-i7t0nb   2026-08-15   false        <- caida
--     invitacion-ol3b6q   2027-08-01   false        <- caida, evento a 11 meses
--
-- Las dos tienen `is_published = true` y un entitlement **Free** (la demo de 14
-- días) que caducó el 2026-08-26. Sus dueños no tienen NINGUNA orden: nunca
-- pagaron. O sea que el muro de pago está funcionando; lo que está roto es que
-- nadie se lo dijo a nadie. `get_public_invitation` exige
-- `is_entitlement_active` (0012:61), así que el invitado que abre el enlace que
-- le repartieron lee **«Esta invitación no existe o aún no ha sido
-- publicada»** — un 404 que le echa la culpa a él.
--
-- Decisión del dev: que el invitado vea una pantalla amable de «caducada» en
-- vez de un 404. Para eso la página tiene que poder DISTINGUIR los dos casos, y
-- desde la `0053` el rol anónimo ya no puede leer `invitations` para averiguarlo.
-- Esta función es ese discriminador, y nada más.
--
-- QUÉ REVELA, dicho explícitamente: a quien acierte un par
-- (usuario, slug) le confirma que existe y está publicada aunque haya caducado.
-- Es un oráculo pequeño y es INHERENTE a la conducta pedida — sin él no hay
-- forma de dar un mensaje distinto. Revela estrictamente MENOS que hoy: hoy
-- `anon` puede leer la fila entera de las 7 publicadas (ver la 0053). No
-- devuelve ni un dato del evento: sólo una de tres palabras.
--
-- `security definer` + `set search_path` por lo mismo que la 0053. `stable`
-- para que el planificador la cachee dentro de la sentencia.
-- ============================================================================

create or replace function public.estado_publico_de_invitacion(
  p_username text,
  p_slug text
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when public.is_entitlement_active(i.id) then 'vigente'
        else 'caducada'
      end
      from public.profiles p
      join public.invitations i on i.user_id = p.id
      where p.username = p_username
        and i.slug = p_slug
        -- Un borrador NO se distingue de algo inexistente: revelar que existe
        -- un borrador con ese slug seria filtrar trabajo sin publicar.
        and i.is_published = true
      limit 1
    ),
    'inexistente'
  );
$$;

comment on function public.estado_publico_de_invitacion(text, text) is
  'Discriminador para la pagina publica: vigente | caducada | inexistente. '
  'Existe para poder mostrar «esta invitacion caduco» en vez de un 404 al '
  'invitado de una invitacion cuya demo Free vencio. No devuelve ningun dato '
  'del evento.';

grant execute on function public.estado_publico_de_invitacion(text, text)
  to anon, authenticated;


-- ---------------------------------------------------------------------------
-- VERIFICACIÓN. Devuelve filas: 3 filas, las 3 con `ok = true`.
--
-- Los dos primeros casos son las invitaciones REALES que hoy están caídas, y
-- el tercero es el control negativo — sin él, una función que devolviera
-- siempre 'caducada' pasaría las dos primeras comprobaciones.
-- ---------------------------------------------------------------------------
select
  caso,
  valor,
  esperado,
  valor = esperado as ok
from (
  values
    ('una publicada VIGENTE',
     (select public.estado_publico_de_invitacion(p.username, i.slug)
        from public.invitations i
        join public.profiles p on p.id = i.user_id
       where i.slug = 'invitacion-zbckns'),
     'vigente'),
    ('una publicada CADUCADA',
     (select public.estado_publico_de_invitacion(p.username, i.slug)
        from public.invitations i
        join public.profiles p on p.id = i.user_id
       where i.slug = 'invitacion-ol3b6q'),
     'caducada'),
    ('un slug que no existe',
     public.estado_publico_de_invitacion('nadie-zz', 'no-existe-zz'),
     'inexistente')
) as t(caso, valor, esperado);
