-- ============================================================================
-- 0036 — `xv-seda` cambia la seda por un OBJETO de XV años
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- La `0035` convirtió `xv-seda` a fotografía y **no funcionó**: en la
-- repuntuación (§19.6) bajó de 7.7 a **7.5**, la única del piloto que empeoró.
-- El motivo, escrito allí: su fotografía era una **TEXTURA** —seda rosa— y una
-- textura no dice «XV años». La conversión sólo funciona cuando la imagen
-- muestra un OBJETO del evento.
--
-- Ahora lo muestra: pastel de tres pisos con el **15** y flores rosas, el
-- objeto más reconocible de la categoría después de la tiara —que ya usa
-- `xv-corona`, así que no se repite—.
--
-- ----------------------------------------------------------------------------
-- Sobre el «15», y por qué NO viola el criterio E2
-- ----------------------------------------------------------------------------
-- El research veta imágenes con datos horneados —una vela con un «5», un
-- calendario de 2021— porque una plantilla es genérica y el dato la
-- contradiría. **El «15» no es ese caso**: no varía entre invitaciones de XV
-- años, es la categoría misma. Excluirlo sería aplicar la regla por su letra en
-- contra de su motivo.
--
-- ----------------------------------------------------------------------------
-- Proporción y nombre
-- ----------------------------------------------------------------------------
-- La foto es 1600x1067 (3/2) y el pastel ocupa la mitad izquierda: el fondo
-- cálido de la derecha es espacio negativo real. `imageRatio` va a `3/2`, o sea
-- **recorte cero** — comprobado por el pre-vuelo.
--
-- El NOMBRE visible pasa de «Seda» a «Quince»: una plantilla llamada Seda que
-- enseña un pastel es incoherente en la tarjeta del catálogo. El **slug se
-- queda** en `xv-seda`: cambiarlo dejaría huérfana su miniatura
-- (`/previews/plantillas/xv-seda.jpg`) y rompería la URL de su vista. Que el
-- slug no coincida con el nombre es normal; que la tarjeta mienta, no.
-- ============================================================================

update public.templates
   set name = 'Quince',
       description = 'El pastel de quince como protagonista, con la tipografía al otro lado.',
       modules_config = jsonb_set(
         jsonb_set(
           modules_config,
           '{0,config,imageUrl}',
           '"/arte/foto/xv-pastel-quince.jpg"'::jsonb,
           true),
         '{0,config,imageRatio}',
         '"3/2"'::jsonb,
         true)
 where slug = 'xv-seda'
   -- Guardas de forma: si el hero no está en el índice 0 o la variante ya no es
   -- `split`, no se toca nada en vez de escribir sobre el módulo equivocado.
   and modules_config -> 0 ->> 'module_type' = 'hero'
   and modules_config #>> '{0,config,variant}' = 'split';

-- ============================================================================
-- Verificación
-- ============================================================================
--   select name,
--          modules_config #>> '{0,config,imageUrl}'   as foto,
--          modules_config #>> '{0,config,imageRatio}' as proporcion
--     from public.templates where slug = 'xv-seda';
--     -- Quince | /arte/foto/xv-pastel-quince.jpg | 3/2
--
-- Después: `node scripts/capturar-miniaturas.mts xv-seda` y commitear la
-- imagen junto al bump de REVISION_MINIATURAS.
-- ============================================================================
