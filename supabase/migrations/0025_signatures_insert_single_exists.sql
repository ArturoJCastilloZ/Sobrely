-- ============================================================================
-- 0025_signatures_insert_single_exists.sql — una sola condición, sin escalares
--
-- La 0024 arregló el shadowing de la 0023, pero al probarla contra la base el
-- caso legítimo de la moderación seguía sin funcionar, y **el resultado
-- cambiaba entre corridas con la misma entrada**. Esa inconsistencia es la
-- señal de que algo en la expresión no es determinista.
--
-- En vez de seguir persiguiendo el porqué de un subquery escalar, se elimina la
-- categoría entera de problema: las tres condiciones pasan a ser UN solo
-- `exists` con un join.
--
--   * Sin subquery escalar → sin `limit 1` sin `order by`, que es lo único de
--     la 0024 que podía dar resultados distintos en corridas idénticas. Un
--     `limit 1` sobre un conjunto sin orden es una elección arbitraria, y
--     `invitation_modules` NO tiene unique en `(invitation_id, module_type)`
--     —las "secciones repetibles" del producto dependen de que no lo tenga—,
--     así que una invitación PUEDE tener dos libros de firmas y el escalar
--     elegiría uno al azar.
--   * Con `exists` y join, dos módulos no rompen nada: basta con que UNO
--     autorice la fila, que es la semántica correcta.
--   * Todas las referencias a la fila evaluada van calificadas con el nombre
--     de la tabla, la lección de la 0024: si el nombre de la columna existe
--     también en la tabla del subquery, el scope interno gana.
--
-- La condición completa, en una frase: existe una invitación PUBLICADA con este
-- id, que tiene un módulo de firmas VISIBLE, y la fila nace oculta exactamente
-- cuando ese módulo pide moderación.
-- ============================================================================

drop policy if exists "signatures_public_insert" on public.invitation_signatures;

create policy "signatures_public_insert"
  on public.invitation_signatures for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.invitations i
      join public.invitation_modules m
        on m.invitation_id = i.id
       and m.module_type = 'signatures'
       and m.is_visible = true
      where i.id = public.invitation_signatures.invitation_id
        and i.is_published = true
        and public.invitation_signatures.is_hidden
            = coalesce((m.config ->> 'requireApproval')::boolean, false)
    )
  );
