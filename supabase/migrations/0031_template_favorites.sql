-- ============================================================================
-- 0031_template_favorites.sql — favoritos del marketplace de plantillas
-- ============================================================================
--
-- Cierra la ultima pieza de la Fase 4. El catalogo ya filtra por tipo de evento
-- y busca; falta que el usuario pueda marcar las que le gustan y volver a
-- ellas. Eso necesita persistencia y no habia tabla.
--
-- ---------------------------------------------------------------------------
-- FORMA DE LA TABLA, y por que
-- ---------------------------------------------------------------------------
--
--   * La clave primaria es COMPUESTA `(user_id, template_id)` y no un `id`
--     sintetico. Un favorito no es una entidad con vida propia: es una
--     relacion, y su identidad ES el par. Con PK compuesta, marcar dos veces
--     la misma plantilla es imposible por construccion en vez de depender de
--     que el cliente no mande el insert dos veces. Ademas evita la fila
--     duplicada que un `unique` anadido despues tendria que limpiar.
--
--   * `on delete cascade` en las dos referencias. Si se borra el usuario, sus
--     favoritos se van con el; si se retira una plantilla del catalogo, el
--     favorito deja de apuntar a nada y debe desaparecer. Sin cascade, borrar
--     una plantilla fallaria por la FK, o peor, quedarian filas apuntando a un
--     id inexistente.
--
--   * NO se guarda nada mas. Ni `updated_at` ni notas: no hay ningun campo
--     mutable, que es justo lo que permite prescindir de una politica de
--     UPDATE (ver abajo).
--
--   * El indice por `template_id`: la PK ordena por `(user_id, template_id)`,
--     asi que sirve para "los favoritos de este usuario" pero NO para "quien
--     marco esta plantilla". Ese segundo acceso es el que necesitaria un
--     futuro contador de populares, y sin el indice seria un seq scan.
--
-- ---------------------------------------------------------------------------
-- LAS POLITICAS
-- ---------------------------------------------------------------------------
--
--   * Una politica POR COMANDO (select / insert / delete) y NO un `for all`.
--     El `for all` es lo que dejo al dueno del libro de firmas viendo las
--     firmas que el mismo habia ocultado (§7): concede mas de lo que uno lee
--     cuando lo escribe. Aqui cada comando dice exactamente lo que permite.
--
--   * NO HAY POLITICA DE UPDATE, y es deliberado. Sin ella, RLS deniega todo
--     update por defecto. Un favorito no tiene nada que actualizar: lo unico
--     que un update podria hacer es REAPUNTAR la fila —cambiar `user_id` a
--     otra persona, o `template_id` a otra plantilla—, que no es una
--     operacion del producto. Marcar y desmarcar son insert y delete.
--
--   * La condicion es una comparacion DIRECTA contra la columna de la propia
--     fila, sin ningun subquery. Eso elimina de raiz la categoria de fallo que
--     costo tres migraciones en el libro de firmas (0023 → 0025): alli el
--     nombre de la columna existia tambien en la tabla del subquery, el scope
--     interno ganaba y la condicion se volvia `x = x`, siempre cierta. Sin
--     subquery no hay scope interno que pueda ganar. Aun asi la referencia va
--     CALIFICADA con el nombre de la tabla, que es la leccion de la 0024.
--
--   * `(select auth.uid())` envuelto en un select, como el resto del esquema:
--     Postgres lo evalua una vez por sentencia en vez de una vez por fila.
--
--   * Para el ANONIMO, `auth.uid()` es NULL y `null = user_id` da NULL, que no
--     es TRUE, asi que RLS deniega. No hace falta ninguna clausula extra para
--     excluirlo — pero NO se da por bueno por razonamiento: se ataca con la
--     llave publicable, clausula por clausula e incluido el caso legitimo,
--     ANTES de que ningun codigo que dependa de esta tabla entre a `main`.
--
--   * `revoke` a `anon` ademas de RLS. RLS ya lo denegaria, pero el privilegio
--     de tabla es una segunda cerradura independiente: si algun dia alguien
--     anade una politica permisiva por error, el anonimo sigue sin poder tocar
--     la tabla. Defensa en profundidad sobre datos de usuario.
-- ============================================================================

create table if not exists public.template_favorites (
  user_id     uuid        not null references auth.users(id)      on delete cascade,
  template_id uuid        not null references public.templates(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, template_id)
);

create index if not exists template_favorites_template_id_idx
  on public.template_favorites (template_id);

alter table public.template_favorites enable row level security;

-- Nadie sin sesion toca esta tabla, ni siquiera para leer.
revoke all on public.template_favorites from anon;
grant select, insert, delete on public.template_favorites to authenticated;

drop policy if exists "template_favorites_select_own" on public.template_favorites;
create policy "template_favorites_select_own"
  on public.template_favorites for select
  to authenticated
  using (public.template_favorites.user_id = (select auth.uid()));

drop policy if exists "template_favorites_insert_own" on public.template_favorites;
create policy "template_favorites_insert_own"
  on public.template_favorites for insert
  to authenticated
  -- `with check` y no `using`: en un insert no hay fila previa que mirar. Esto
  -- es lo que impide marcar un favorito A NOMBRE DE OTRO usuario.
  with check (public.template_favorites.user_id = (select auth.uid()));

drop policy if exists "template_favorites_delete_own" on public.template_favorites;
create policy "template_favorites_delete_own"
  on public.template_favorites for delete
  to authenticated
  using (public.template_favorites.user_id = (select auth.uid()));
