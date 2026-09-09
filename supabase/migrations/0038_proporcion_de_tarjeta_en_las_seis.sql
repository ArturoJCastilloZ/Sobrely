-- ============================================================================
-- 0038 — las 6 figuras que la MINIATURA recortaba pasan a 1/1
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- Cierra el hallazgo de la §19.8: había DOS recortes independientes y la suite
-- sólo modelaba uno.
--
--   1. `object-fit: cover` recorta la FUENTE dentro de la caja. Éste ya lo
--      cazaba el pre-vuelo (caja contra fuente, ≤ 15 %, los dos ejes).
--   2. El viewport de captura de la tarjeta recorta la CAJA. Éste no lo veía
--      nadie, y es el que dejaba la miniatura de `boda-marco-nuestro` mostrando
--      un trozo de pisos blancos que no se lee como pastel.
--
-- Medido: la figura del hero es 372 px de ancho (420 del viewport menos `px-6`
-- a cada lado) y arranca en `y=184`, así que del `ALTO_CAPTURA` de 560 sólo
-- quedan **376 px**. Una figura 2/3 mide 558 px de alto: se perdía el 33 %.
-- `boda-papel-y-lino`, a 9/16, perdía el **43 %** — y estaba APROBADA con 8.5.
--
--   figura cabe  <=>  372 / proporción <= 376  <=>  proporción >= 0.989
--
-- O sea que en esta tarjeta **sólo sobreviven las proporciones 1/1 y más
-- anchas**. Ninguna proporción vertical cabe, y por eso las 8 plantillas sanas
-- del piloto son exactamente las que tienen la figura a 248 px (3/2).
--
-- ----------------------------------------------------------------------------
-- Por qué 1/1 y no 4/3, y por qué se RECORTARON LAS FUENTES
-- ----------------------------------------------------------------------------
-- Subir la proporción sin tocar el archivo habría cambiado un recorte por otro:
-- una caja 1/1 sobre una fuente 2/3 recorta el 33 % de la fuente, y el
-- pre-vuelo lo habría rechazado con razón. Mover ESE umbral era la salida fácil
-- y ya está anotada como error en el §7 del roadmap.
--
-- Así que se recortaron las 6 fotografías a **1600x1600** y `imageRatio` va a
-- `1/1`, que es su proporción EXACTA: **0 % de recorte por `cover` y 0 % por el
-- viewport**, las dos cosas a la vez. Se eligió 1/1 y no 4/3 porque es la más
-- alta que cabe, o sea la que conserva más del sujeto.
--
-- El encuadre de cada una se eligió MIRÁNDOLA, no por regla:
--   · `boda-pastel-rosas`   recorte con offset y=700 — centrado dejaba fuera la
--     base dorada; con el offset entran los TRES pisos y la base.
--   · las otras cinco       centrado; comprobado una por una.
--
-- Las 6 fotografías son EXCLUSIVAS de su plantilla (medido: ninguna la comparte
-- otra plantilla, y ninguna se usa como `backgroundImage` en `templates` ni en
-- las invitaciones publicadas), así que recortarlas no arrastra a nadie más.
--
-- El VELO se volvió a medir con `verificar-contraste-arte.mts` y **no cambió en
-- ninguna de las 6**: el velo sale del peor píxel de la banda central, que el
-- recorte cuadrado conserva. Comprobado además que ese gate detecta un velo mal
-- declarado (control positivo, mutante muerto), así que el verde vale.
--
-- ----------------------------------------------------------------------------
-- Idempotencia
-- ----------------------------------------------------------------------------
-- Cada sentencia guarda por la proporción de la que SALE, no por la de destino.
-- Al segundo pase toca 0 filas en vez de reescribir encima. Es el mismo patrón
-- que la `0037` usó con `variant = 'plain'`.
-- ============================================================================

-- boda-marco-nuestro · split · 2/3 -> 1/1
update public.templates
   set modules_config = jsonb_set(modules_config, '{0,config,imageRatio}', '"1/1"'::jsonb, true)
 where slug = 'boda-marco-nuestro'
   and modules_config -> 0 ->> 'module_type' = 'hero'
   and modules_config #>> '{0,config,variant}' = 'split'
   and modules_config #>> '{0,config,imageRatio}' = '2/3';

-- comunion-cinta · editorial · 2/3 -> 1/1
update public.templates
   set modules_config = jsonb_set(modules_config, '{0,config,imageRatio}', '"1/1"'::jsonb, true)
 where slug = 'comunion-cinta'
   and modules_config -> 0 ->> 'module_type' = 'hero'
   and modules_config #>> '{0,config,variant}' = 'editorial'
   and modules_config #>> '{0,config,imageRatio}' = '2/3';

-- bautizo-cera-blanca · editorial · 2/3 -> 1/1
update public.templates
   set modules_config = jsonb_set(modules_config, '{0,config,imageRatio}', '"1/1"'::jsonb, true)
 where slug = 'bautizo-cera-blanca'
   and modules_config -> 0 ->> 'module_type' = 'hero'
   and modules_config #>> '{0,config,variant}' = 'editorial'
   and modules_config #>> '{0,config,imageRatio}' = '2/3';

-- revelacion-coral · editorial · 2/3 -> 1/1
update public.templates
   set modules_config = jsonb_set(modules_config, '{0,config,imageRatio}', '"1/1"'::jsonb, true)
 where slug = 'revelacion-coral'
   and modules_config -> 0 ->> 'module_type' = 'hero'
   and modules_config #>> '{0,config,variant}' = 'editorial'
   and modules_config #>> '{0,config,imageRatio}' = '2/3';

-- boda-papel-y-lino · editorial · 9/16 -> 1/1  (la que mas perdia: 43 %)
update public.templates
   set modules_config = jsonb_set(modules_config, '{0,config,imageRatio}', '"1/1"'::jsonb, true)
 where slug = 'boda-papel-y-lino'
   and modules_config -> 0 ->> 'module_type' = 'hero'
   and modules_config #>> '{0,config,variant}' = 'editorial'
   and modules_config #>> '{0,config,imageRatio}' = '9/16';

-- xv-corona · editorial · 3/4 -> 1/1
update public.templates
   set modules_config = jsonb_set(modules_config, '{0,config,imageRatio}', '"1/1"'::jsonb, true)
 where slug = 'xv-corona'
   and modules_config -> 0 ->> 'module_type' = 'hero'
   and modules_config #>> '{0,config,variant}' = 'editorial'
   and modules_config #>> '{0,config,imageRatio}' = '3/4';

-- ============================================================================
-- Verificación
-- ============================================================================
--   select slug,
--          modules_config #>> '{0,config,variant}'    as variante,
--          modules_config #>> '{0,config,imageRatio}' as proporcion
--     from public.templates
--    where slug in ('boda-marco-nuestro','comunion-cinta','bautizo-cera-blanca',
--                   'revelacion-coral','boda-papel-y-lino','xv-corona')
--    order by slug;
--     -- las 6 con proporcion = 1/1
--
-- Las SEIS filas, o algo salió mal:
--   select count(*) from public.templates
--    where slug in ('boda-marco-nuestro','comunion-cinta','bautizo-cera-blanca',
--                   'revelacion-coral','boda-papel-y-lino','xv-corona')
--      and modules_config #>> '{0,config,imageRatio}' = '1/1';   -- 6
--
-- Y que NO quede ninguna figura vertical en el hero de una plantilla activa:
--   select count(*) from public.templates
--    where is_active
--      and modules_config #>> '{0,config,variant}' in ('split','editorial')
--      and modules_config #>> '{0,config,imageRatio}' in ('2/3','3/4','9/16','1/2');
--     -- 0
--
-- Después, y sólo después:
--   node scripts/capturar-miniaturas.mts boda-marco-nuestro comunion-cinta \
--     bautizo-cera-blanca revelacion-coral boda-papel-y-lino xv-corona
-- y commitear las seis imágenes con el bump de REVISION_MINIATURAS.
-- ============================================================================
