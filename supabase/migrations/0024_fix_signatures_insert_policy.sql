-- ============================================================================
-- 0024_fix_signatures_insert_policy.sql — la política de la 0023 no defendía nada
--
-- Encontrado atacando la 0023 con la LLAVE PÚBLICA antes de mergear. La
-- política `signatures_public_insert` prometía tres cosas y cumplía una.
--
-- ----------------------------------------------------------------------------
-- El bug: una columna que se llama igual en las dos tablas
-- ----------------------------------------------------------------------------
-- La 0023 escribía, dentro de un subquery sobre `invitation_modules`:
--
--     where m.invitation_id = invitation_id
--
-- La intención era "el módulo de ESTA invitación". Pero `invitation_id` también
-- es columna de `invitation_modules`, y en un subquery el scope interno GANA:
-- Postgres lo lee como `m.invitation_id = m.invitation_id`, que es siempre
-- verdadero. El subquery deja de estar correlacionado y mira TODOS los módulos
-- de firmas de TODAS las invitaciones.
--
-- Consecuencias medidas con la llave `anon`, no supuestas:
--
--   * Se podía firmar en una invitación **sin libro de firmas** (el `exists`
--     era cierto porque alguna OTRA invitación sí tenía el módulo).
--   * La moderación **no se aplicaba**: el `requireApproval` que se leía era el
--     de un módulo cualquiera, elegido con `limit 1` sin `order by` — o sea, no
--     determinista. En una invitación que pedía revisión se insertaba con
--     `is_hidden = false` sin problema, y la que sí quería nacer oculta era
--     rechazada.
--
-- Lo único que la 0023 sí defendía era "solo invitaciones publicadas", porque
-- ahí el subquery es sobre `invitations` y `invitation_id` NO es columna suya,
-- así que la referencia sí salía al scope de afuera. El bug solo aparece cuando
-- el nombre existe en las dos tablas — que es justo cuando parece más natural
-- escribirlo sin calificar.
--
-- ----------------------------------------------------------------------------
-- El arreglo: calificar SIEMPRE la fila que se está evaluando
-- ----------------------------------------------------------------------------
-- Dentro de una política, la fila nueva se nombra con la tabla completa:
-- `public.invitation_signatures.invitation_id`. Es más largo y es el punto:
-- no hay forma de que el scope interno lo capture.
--
-- Regla para las próximas políticas de este proyecto: en un subquery dentro de
-- una policy, **toda** referencia a la fila evaluada va calificada con el nombre
-- de la tabla. Y se comprueba atacándola con la llave pública — esta política
-- se leía perfectamente bien y no hacía nada.
-- ============================================================================

drop policy if exists "signatures_public_insert" on public.invitation_signatures;

create policy "signatures_public_insert"
  on public.invitation_signatures for insert
  to anon, authenticated
  with check (
    -- 1. La invitación existe y está publicada.
    exists (
      select 1 from public.invitations i
      where i.id = public.invitation_signatures.invitation_id
        and i.is_published = true
    )
    -- 2. Y ofrece libro de firmas, visible.
    and exists (
      select 1 from public.invitation_modules m
      where m.invitation_id = public.invitation_signatures.invitation_id
        and m.module_type = 'signatures'
        and m.is_visible = true
    )
    -- 3. Y la fila nace oculta si y solo si ESE módulo pide moderación.
    and public.invitation_signatures.is_hidden = coalesce(
      (
        select (m.config ->> 'requireApproval')::boolean
        from public.invitation_modules m
        where m.invitation_id = public.invitation_signatures.invitation_id
          and m.module_type = 'signatures'
        limit 1
      ),
      false
    )
  );

-- La política de lectura de la 0023 no tiene el problema —su subquery es sobre
-- `invitations`, donde `invitation_id` no es columna— pero se recrea calificada
-- para que no quede una sola referencia ambigua en la tabla.
drop policy if exists "signatures_public_select" on public.invitation_signatures;

create policy "signatures_public_select"
  on public.invitation_signatures for select
  to anon, authenticated
  using (
    public.invitation_signatures.is_hidden = false
    and exists (
      select 1 from public.invitations i
      where i.id = public.invitation_signatures.invitation_id
        and i.is_published = true
    )
  );
