-- ============================================================================
-- 0035 — Las F4 pasan a fotografía, y el hero deja de recortar a ciegas
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- Sale de la puntuación del piloto (§19 del research): **7 de 7 plantillas con
-- fotografía aprobaron el umbral de 8, y 0 de 8 sin ella**. El corte fue exacto,
-- así que las F4 se convierten.
--
-- ----------------------------------------------------------------------------
-- PARTE A — Seis conversiones (de ocho que fallaron)
-- ----------------------------------------------------------------------------
-- Cada convertida recibe la familia que su categoría NO tiene ya, para no
-- duplicar la que aprobó:
--
--   boda-papel-y-lino        F4 -> F3  (la categoría ya tiene F1)
--   xv-seda                  F4 -> F1  (ya tiene F3)
--   baby-nube-de-algodon     F4 -> F3  (ya tiene F1)
--   revelacion-dos-sobres    F4 -> F2  ← ver abajo
--   cumpleanos-papel-picado  F4 -> F3  (ya tiene F1)
--   corporativo-reticula     F4 -> F1  (no tenía ninguna)
--
-- ⭐ **F2 por fin tiene representante.** `revelacion-tinta` es la ÚNICA foto del
-- repo, de trece, cuyo velo mínimo medido baja del umbral de 0.35 del research:
-- **0.25**. Un telón exige rango de luminancia estrecho y centro vacío, y la
-- tinta sobre blanco lo cumple. Por eso esa conversión es a telón total y no a
-- figura contenida.
--
-- ⛔ **`comunion-cinta` NO se convierte, y es deliberado.** El stock de primera
-- comunión son menores identificables; el vocabulario de objeto —vela, rosario—
-- o duplica `bautizo-cera-blanca` o lee funerario; y una cinta de raso genérica
-- es exactamente el problema nº 7 del research, «podría pertenecer a cualquier
-- categoría». Forzarle una foto la empeoraría. Se queda en 5.8 y se dice.
--
-- Las seis convertidas **pierden su `backgroundImage`**: con la fotografía
-- delante, la textura de fondo es ruido. Es la misma decisión que ya tomó la
-- `0033` para las siete fotográficas.
--
-- ----------------------------------------------------------------------------
-- PARTE B — El hero recortaba a ciegas, en SEIS plantillas ya publicadas
-- ----------------------------------------------------------------------------
-- La figura del hero tenía la proporción HARDCODEADA (3/4 en `split`, 4/3 en
-- `editorial`), así que toda foto cuya forma no coincidiera se recortaba con
-- `object-fit: cover`. Medido por el pre-vuelo, ya en producción:
--
--   boda-jardin-partido    caja 0.75 vs fuente 1.50  -> 50 % LATERAL
--   cumpleanos-arco        caja 0.75 vs fuente 1.37  -> 45 % lateral
--   revelacion-coral       caja 1.33 vs fuente 0.67  -> 50 % VERTICAL
--   xv-corona              caja 1.33 vs fuente 0.75  -> 44 % vertical
--   bautizo-cera-blanca    caja 1.33 vs fuente 0.67  -> 50 % vertical
--   boda-marco-nuestro     caja 0.75 vs fuente 0.47  -> 38 % vertical
--
-- Es el MISMO defecto que la `0034` arregló en el slot de media, que seguía vivo
-- en el hero porque allí la proporción no se podía declarar. Ahora sí
-- (`imageRatio`, con `auto` de defecto para no mover nada), y aquí se pone la
-- que coincide con cada fuente. Todas quedan por debajo del 7 % de recorte.
--
-- Y explica de paso por qué `boda-marco-nuestro` se veía como una losa beige:
-- era un recorte vertical del 38 % de un marco floral, o sea su centro vacío.
--
-- El pre-vuelo (`seed-piloto.test.ts`) ahora mide los DOS ejes y cubre también
-- el hero — antes sólo miraba el slot de media y por eso no vio nada de esto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A · Conversiones
-- ----------------------------------------------------------------------------
update public.templates t
   set theme_config = t.theme_config - 'backgroundImage',
       modules_config = jsonb_set(
         jsonb_set(
           jsonb_set(t.modules_config, '{0,config,variant}',   to_jsonb(c.variante), true),
                                       '{0,config,imageUrl}',  to_jsonb(c.foto),     true),
                                       '{0,config,imageRatio}', to_jsonb(c.prop),    true)
  from (values
    ('boda-papel-y-lino',       'editorial', '/arte/foto/boda-anillos-papel.jpg',     '9/16'),
    ('xv-seda',                 'split',     '/arte/foto/xv-seda-rosa.jpg',           '1/2'),
    ('baby-nube-de-algodon',    'editorial', '/arte/foto/baby-juguetes-madera.jpg',   '3/2'),
    ('cumpleanos-papel-picado', 'editorial', '/arte/foto/cumple-velas-espiral.jpg',   '3/2'),
    ('corporativo-reticula',    'split',     '/arte/foto/corp-reticula-hormigon.jpg', '3/2')
  ) as c(slug, variante, foto, prop)
 where t.slug = c.slug
   -- Guarda de forma: el hero tiene que estar en el índice 0. Si no lo está,
   -- 0 filas tocadas en vez de un jsonb corrompido.
   and t.modules_config -> 0 ->> 'module_type' = 'hero';

-- `revelacion-dos-sobres` aparte: es la única que va a TELÓN TOTAL (F2), así que
-- su variante es `centered` y no lleva `imageRatio` —la foto va a sangre, no en
-- una figura—. El `overlay` se queda en el defecto 0.45, que es el velo negro
-- con texto blanco del hero; el 0.25 medido es del otro mecanismo (velo del
-- color de fondo) y mezclarlos daría un número con pinta de medido que no mide
-- esto.
update public.templates
   set theme_config = theme_config - 'backgroundImage',
       modules_config = jsonb_set(
         jsonb_set(modules_config, '{0,config,variant}',  '"centered"'::jsonb, true),
                                   '{0,config,imageUrl}',
                                   '"/arte/foto/revelacion-tinta.jpg"'::jsonb, true)
 where slug = 'revelacion-dos-sobres'
   and modules_config -> 0 ->> 'module_type' = 'hero';

-- ----------------------------------------------------------------------------
-- B · La proporción de las seis que ya tenían foto en el hero
-- ----------------------------------------------------------------------------
update public.templates t
   set modules_config = jsonb_set(
         t.modules_config, '{0,config,imageRatio}', to_jsonb(c.prop), true)
  from (values
    ('boda-jardin-partido',  '3/2'),
    ('boda-marco-nuestro',   '1/2'),
    ('xv-corona',            '3/4'),
    ('revelacion-coral',     '2/3'),
    ('cumpleanos-arco',      '4/3'),
    ('bautizo-cera-blanca',  '2/3')
  ) as c(slug, prop)
 where t.slug = c.slug
   and t.modules_config -> 0 ->> 'module_type' = 'hero'
   and t.modules_config #>> '{0,config,imageUrl}' <> '';

-- ============================================================================
-- Verificación
-- ============================================================================
--
--   -- las 12 tocadas, con su foto y su proporción
--   select slug,
--          modules_config #>> '{0,config,variant}'    as variante,
--          modules_config #>> '{0,config,imageUrl}'   as foto,
--          modules_config #>> '{0,config,imageRatio}' as proporcion,
--          theme_config ? 'backgroundImage'           as tiene_textura
--     from public.templates
--    where slug in ('boda-papel-y-lino','xv-seda','baby-nube-de-algodon',
--                   'revelacion-dos-sobres','cumpleanos-papel-picado',
--                   'corporativo-reticula','boda-jardin-partido',
--                   'boda-marco-nuestro','xv-corona','revelacion-coral',
--                   'cumpleanos-arco','bautizo-cera-blanca')
--    order by slug;
--
--   -- ninguna convertida debe conservar textura de fondo
--   select count(*) from public.templates
--    where slug in ('boda-papel-y-lino','xv-seda','baby-nube-de-algodon',
--                   'revelacion-dos-sobres','cumpleanos-papel-picado',
--                   'corporativo-reticula')
--      and theme_config ? 'backgroundImage';                          -- 0
--
--   -- `comunion-cinta` NO se toca
--   select modules_config #>> '{0,config,imageUrl}' from public.templates
--    where slug = 'comunion-cinta';                                   -- (vacío)
--
-- ============================================================================
-- Después: recapturar las 12 y commitear con el bump de REVISION_MINIATURAS.
-- ============================================================================
