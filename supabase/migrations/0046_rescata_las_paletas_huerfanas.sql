-- ============================================================================
-- 0046 — Cinco plantillas declaran colores que NADIE lee
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
-- ⚠️ UNA SOLA SENTENCIA, termina en `returning`. Se esperan **5 filas**.
--
-- ----------------------------------------------------------------------------
-- El defecto
-- ----------------------------------------------------------------------------
-- Cinco plantillas —UNA POR CATEGORÍA, y por los nombres son las cinco
-- originales del seed— guardan `text`, `primary` y `background` **sueltos en la
-- raíz** de `theme_config`, no dentro del objeto `colors`:
--
--   baby-shower · boda-elegante · cumpleanos-moderno · evento-corporativo · xv-anos
--
-- `themeSchema` (src/lib/theme/theme.ts) lee `colors` como un objeto anidado,
-- así que esas tres claves **no las lee nadie**: `parseTheme` no encuentra
-- `colors`, aplica su `.default(...)` y las cinco se dibujan con el tema por
-- defecto —dorado sobre blanco— ignorando los colores que ellas mismas
-- declaran. Ninguna tiene `themePack` que las rescate.
--
-- Es un fallo silencioso de datos: nada peta, simplemente el color declarado no
-- llega nunca al render.
--
-- ----------------------------------------------------------------------------
-- Cómo se descubrió, y por qué se arreglan las CINCO
-- ----------------------------------------------------------------------------
-- Apareció porque la `0044` devolvió 9 filas en vez de 10: su rama `paleta`
-- para `cumpleanos-moderno` no entró. Al ir a ver por qué, resultó que la
-- plantilla no era un caso aislado sino uno de cinco. Arreglar sólo la que se
-- ve es el error que esta sesión ya ha pagado tres veces.
--
-- ----------------------------------------------------------------------------
-- Qué se escribe
-- ----------------------------------------------------------------------------
-- Se RESCATA lo declarado —no se inventa una paleta— moviendo los tres valores
-- a `colors`, y se añade el `secondary` que les falta, derivado del tono de su
-- propio `primary`. Las tres claves sueltas se borran: son residuo y confunden
-- a quien lea la fila.
-- ============================================================================

update public.templates as t
   set theme_config =
         (t.theme_config - 'text' - 'primary' - 'background')
         || jsonb_build_object('colors', jsonb_build_object(
              'text',       t.theme_config ->> 'text',
              'primary',    t.theme_config ->> 'primary',
              'background', t.theme_config ->> 'background',
              'secondary',  v.secondary))
  from (values
    ('baby-shower',        '#bae6fd'),  -- azul claro del cielo de su primary
    ('boda-elegante',      '#c2b49a'),  -- arena, bajo su dorado
    ('cumpleanos-moderno', '#fb7185'),  -- rosa del mismo tono que su carmín
    ('evento-corporativo', '#93c5fd'),  -- azul claro de su azul corporativo
    ('xv-anos',            '#f0abfc')   -- lila del mismo tono que su magenta
  ) as v(slug, secondary)
 where t.slug = v.slug
   -- Guardas: sólo las que de verdad están rotas. Si alguna ya tiene `colors`
   -- o un `themePack`, no se toca — su paleta ya llega al render por otra vía.
   and t.theme_config -> 'colors' is null
   and t.theme_config -> 'themePack' is null
   and t.theme_config ? 'text'
   and t.theme_config ? 'primary'
   and t.theme_config ? 'background'
returning t.slug, t.theme_config -> 'colors' as colors_nuevo;

-- ============================================================================
-- Verificación (aparte)
-- ============================================================================
-- Ninguna plantilla sin paleta efectiva — debe devolver 0 filas:
--   select slug from public.templates
--    where is_active
--      and theme_config -> 'colors' is null
--      and theme_config -> 'themePack' is null;
--
-- Ninguna con colores sueltos en la raíz — debe devolver 0 filas:
--   select slug from public.templates
--    where is_active
--      and (theme_config ? 'text' or theme_config ? 'primary'
--           or theme_config ? 'background' or theme_config ? 'secondary');
--
-- Después: `node scripts/capturar-miniaturas.mts baby-shower boda-elegante
--          cumpleanos-moderno evento-corporativo xv-anos`
-- ============================================================================
