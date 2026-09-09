-- ============================================================================
-- 0041 — Cierra BODA: ninguna plantilla comparte fondo con otra
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- La `0040` dio arte propio a SEIS bodas y yo dije que la categoría quedaba
-- cerrada. Era falso: Boda tiene **13** plantillas y conté sólo las que
-- llevaban SVG viejo. Tres seguían compartiendo la MISMA fotografía
-- `foto/boda-marco-floral.jpg` —`boda-cinematografica`, `boda-elegante` y
-- `boda-minimalista`— y en la hoja de contacto se veían casi idénticas.
--
-- ----------------------------------------------------------------------------
-- Por qué NO se reasignan fotografías
-- ----------------------------------------------------------------------------
-- Medido: las 18 fotos del disco están todas en uso, ninguna libre. Mover una
-- de otra plantilla sólo trasladaría la repetición.
--
-- ----------------------------------------------------------------------------
-- Qué se hace con cada una
-- ----------------------------------------------------------------------------
-- `boda-minimalista` — **se le QUITA el telón**. Su propia descripción dice
--   «Blanco, negro y un acento. Sin adornos, todo tipografía», y llevaba encima
--   un fondo floral: el telón contradecía la plantilla. Queda en blanco puro,
--   que es lo que promete. Hay precedente: las 15 del piloto tampoco llevan
--   telón. Es la opción de «eliminar» antes que la de «sustituir».
--
-- `boda-cinematografica` — arte propio, motivo de PELÍCULA. No basta con que
--   sea distinto de las otras dos: comparte el pack `boda-lujo` con
--   `boda-de-lujo`, o sea la misma paleta de oro exacta, así que lo único que
--   puede distinguirlas es la silueta. Perforaciones de carrete en los bordes,
--   letterbox y marcas de encuadre. Contraste medido: **10.31** (AA pide 4.5).
--
-- `boda-elegante` — se queda `foto/boda-marco-floral.jpg` y pasa a ser su
--   ÚNICA usuaria. No se toca.
--
-- Tras esto, las 13 bodas tienen 13 fondos distintos.
--
-- ⚠️ Lo que esto NO arregla, y sigue abierto:
--   · `boda-destino` y `boda-en-la-playa` comparten el pack `tropical`.
--   · `boda-cinematografica` y `boda-de-lujo` comparten el pack `boda-lujo`
--     (y `corporativo-cena-fin-de-ano` también lo usa, cruzando de categoría).
--   · La ESTRUCTURA de módulos sigue repetida en 54 de las 65 del catálogo.
-- ============================================================================

-- 1) La cinematográfica estrena arte propio.
update public.templates
   set theme_config = jsonb_set(
         theme_config, '{backgroundImage}',
         jsonb_build_object('url', '/arte/boda-cinematografica-arte.svg', 'overlay', 0),
         true)
 where slug = 'boda-cinematografica'
   and event_type = 'Boda'
   and theme_config ? 'backgroundImage';

-- 2) La minimalista se queda SIN telón, que es lo coherente con su concepto.
update public.templates
   set theme_config = theme_config - 'backgroundImage'
 where slug = 'boda-minimalista'
   and event_type = 'Boda'
   -- Guarda: sólo si sigue teniendo el fondo compartido que veníamos a quitar.
   and theme_config #>> '{backgroundImage,url}' = '/arte/foto/boda-marco-floral.jpg';

-- ============================================================================
-- Verificación
-- ============================================================================
--   select slug, coalesce(theme_config #>> '{backgroundImage,url}', '(sin telon)')
--     from public.templates where is_active and event_type = 'Boda' order by slug;
--
-- Ninguna boda comparte fondo (debe devolver 0 filas):
--   select theme_config #>> '{backgroundImage,url}' as fondo, count(*)
--     from public.templates
--    where is_active and event_type = 'Boda'
--      and theme_config ? 'backgroundImage'
--    group by 1 having count(*) > 1;
--
-- La minimalista sin telón (debe devolver false):
--   select theme_config ? 'backgroundImage' from public.templates
--    where slug = 'boda-minimalista';
--
-- Después: `node scripts/capturar-miniaturas.mts boda-cinematografica boda-minimalista`
-- ============================================================================
