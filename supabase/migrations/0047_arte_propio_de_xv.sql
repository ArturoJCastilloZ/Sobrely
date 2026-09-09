-- ============================================================================
-- 0047 — XV AÑOS: arte propio para las siete que compartían fondo
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
-- ⚠️ UNA SOLA SENTENCIA, termina en `returning`. Se esperan **7 filas**.
--    Y sin CTE: cada fila se toca UNA vez. La `0044` metió una plantilla en dos
--    ramas de un CTE y Postgres descartó una de las dos en silencio.
--
-- ----------------------------------------------------------------------------
-- Qué hay
-- ----------------------------------------------------------------------------
-- La categoría tiene **12** plantillas, no 7. Cinco ya estaban resueltas:
-- `xv-manuscrita` (piloto), `xv-corona` y `xv-seda` (Fase 11, con foto y sin
-- telón), y `xv-noche-estelar` / `xv-produccion-completa`, que ya tienen fondo
-- propio y único.
--
-- Las otras SIETE compartían: tres `xv-rosa-polvo.svg` y cuatro
-- `foto/xv-brillo-rosa.jpg`.
--
-- ----------------------------------------------------------------------------
-- Aquí el arte carga con más trabajo que en las otras categorías
-- ----------------------------------------------------------------------------
-- DOS PARES comparten la paleta EXACTA, así que el color no puede distinguirlos
-- y sólo queda la silueta:
--
--   pack `xv-clasico` → xv-clasicos-elegantes · xv-con-sesion   (vino y oro)
--   pack `xv-glam`    → xv-con-video · xv-glam-moderno          (magenta y violeta)
--
-- Por eso a esos cuatro se les dio el motivo más contrastado posible entre sí:
-- laurel contra esquinas de álbum, y diafragma de lente contra tubos de neón.
--
--   xv-anos                greca de rombos
--   xv-con-salon           arquería del salón
--   xv-con-video           diafragma de lente
--   xv-clasicos-elegantes  laurel clásico
--   xv-con-sesion          esquinas de álbum
--   xv-glam-moderno        tubos de neón
--   xv-sencillos           un filete y dos puntos
--
-- `xv-con-video` se rehízo: la primera versión eran «destellos» que acabaron
-- siendo ROMBOS, o sea lo mismo que la greca de `xv-anos` y en un magenta
-- parecido — en la hoja de contacto se confundían. Es el cuarto motivo de vídeo
-- del catálogo (pista, carrete, neón, diafragma) y ninguno se repite.
--
-- Peso en las FRANJAS LATERALES. Contraste medido: entre **5.59 y 13.70**
-- (AA pide 4.5). Media 0.7 KB gzip.
-- ============================================================================

update public.templates as t
   set theme_config = jsonb_set(
         t.theme_config, '{backgroundImage}',
         jsonb_build_object('url', v.url, 'overlay', 0), true)
  from (values
    ('xv-anos',               '/arte/xv-anos-arte.svg'),
    ('xv-clasicos-elegantes', '/arte/xv-clasicos-elegantes-arte.svg'),
    ('xv-con-salon',          '/arte/xv-con-salon-arte.svg'),
    ('xv-con-sesion',         '/arte/xv-con-sesion-arte.svg'),
    ('xv-con-video',          '/arte/xv-con-video-arte.svg'),
    ('xv-glam-moderno',       '/arte/xv-glam-moderno-arte.svg'),
    ('xv-sencillos',          '/arte/xv-sencillos-arte.svg')
  ) as v(slug, url)
 where t.slug = v.slug
   and t.event_type = 'XV años'
   and t.theme_config ? 'backgroundImage'
returning t.slug, v.url;

-- ============================================================================
-- Verificación (aparte)
-- ============================================================================
-- Ningún fondo compartido dentro de la categoría — 0 filas:
--   select theme_config #>> '{backgroundImage,url}' as f, count(*)
--     from public.templates
--    where is_active and event_type = 'XV años'
--      and theme_config ? 'backgroundImage'
--    group by 1 having count(*) > 1;
-- ============================================================================
