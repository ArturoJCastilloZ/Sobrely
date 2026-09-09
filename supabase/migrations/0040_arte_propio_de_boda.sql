-- ============================================================================
-- 0040 — Las seis BODAS estrenan arte propio
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- Primera categoría completa de las 37 que compartían SVG (§24). Cuatro de las
-- seis llevaban el MISMO `boda-botanica.svg` y dos el mismo
-- `boda-lino-sello.svg`: la categoría entera se veía igual en el marketplace.
--
-- ----------------------------------------------------------------------------
-- Lo que se midió antes de componer
-- ----------------------------------------------------------------------------
-- Cuatro de las seis NO tienen `colors` en su `theme_config`: su paleta viene
-- del `themePack` (`boda-lujo`, `tropical`, `terracota-otono`,
-- `botanico-greenery`). Estuve a punto de darlas por «sin paleta» — el arte se
-- compuso contra la paleta EFECTIVA, resuelta desde el pack, no contra el campo.
--
-- Ojo con un efecto lateral que este cambio NO arregla: `boda-destino` y
-- `boda-en-la-playa` comparten el pack `tropical`, o sea la MISMA paleta exacta.
-- Ahora se distinguen por el arte (sellos de viaje contra marea), pero su color
-- sigue siendo idéntico. Si se quiere separarlas de verdad, hace falta decidir
-- un pack propio para una de las dos.
--
-- ----------------------------------------------------------------------------
-- Silueta distinta, no sólo color distinto
-- ----------------------------------------------------------------------------
-- §19.9 dice que el techo ya no es la fotografía sino que varias plantillas
-- comparten silueta. Por eso cada una lleva una composición diferente:
--
--   boda-botanica     tallos de eucalipto en los lados + racimos
--   boda-de-lujo      filete doble en oro + cenefa simétrica (Ostell 1848)
--   boda-destino      sellos circulares unidos por línea de puntos (Ostell)
--   boda-en-la-playa  marea que sube por los lados + oleaje en la base
--   boda-jardin       tallo florido en los lados + arco superior
--   boda-terracota    hojarasca agolpada en los lados, dispersa al centro
--
-- El peso visual va en las FRANJAS LATERALES (x<63 y x>357). Es lo que hizo
-- utilizable la tanda: el ancho del SVG nunca se recorta y el script de
-- contraste muestrea x 63..357, así que los lados se ven siempre y no cuestan
-- contraste. La primera versión puso todo en el centro, muy tenue para no
-- perderlo, y se veía MÁS vacía que el fondo que sustituía.
--
-- ----------------------------------------------------------------------------
-- Velo y peso
-- ----------------------------------------------------------------------------
-- `overlay: 0` en las seis. Medido con `verificar-contraste-arte.mts`, que sale
-- con código 0: entre **5.55 y 9.95** de contraste. AA pide 4.5.
-- Peso: media **5.0 KB gzip** por pieza.
--
-- Los archivos viejos NO se tocan: `boda-lino-sello.svg` lo siguen usando
-- `boda-carta-romantica` (ya migrada) y nadie más de boda; `boda-botanica.svg`
-- se queda huérfano dentro de la categoría pero sigue registrado en `arte.ts`.
-- ============================================================================

update public.templates as t
   set theme_config = jsonb_set(
         t.theme_config,
         '{backgroundImage}',
         jsonb_build_object('url', v.url, 'overlay', 0),
         true)
  from (values
    ('boda-botanica',    '/arte/boda-botanica-arte.svg'),
    ('boda-de-lujo',     '/arte/boda-de-lujo-arte.svg'),
    ('boda-destino',     '/arte/boda-destino-arte.svg'),
    ('boda-en-la-playa', '/arte/boda-en-la-playa-arte.svg'),
    ('boda-jardin',      '/arte/boda-jardin-arte.svg'),
    ('boda-terracota',   '/arte/boda-terracota-arte.svg')
  ) as v(slug, url)
 where t.slug = v.slug
   and t.event_type = 'Boda'
   -- Guarda de forma: si perdió el fondo, no se escribe nada en vez de inventar
   -- una clave sobre un theme que ya no es el que se midió.
   and t.theme_config ? 'backgroundImage';

-- ============================================================================
-- Verificación (6 filas, todas con velo 0 y url `boda-*-arte.svg`)
-- ============================================================================
--   select slug,
--          theme_config #>> '{backgroundImage,url}'     as fondo,
--          theme_config #>> '{backgroundImage,overlay}' as velo
--     from public.templates
--    where event_type = 'Boda' order by slug;
--
-- Que ninguna boda comparta ya fondo con otra:
--   select theme_config #>> '{backgroundImage,url}' as fondo, count(*)
--     from public.templates where is_active and event_type = 'Boda'
--    group by 1 having count(*) > 1;      -- 0 filas
--
-- Después: `node scripts/capturar-miniaturas.mts <slug>` para las seis.
-- ============================================================================
