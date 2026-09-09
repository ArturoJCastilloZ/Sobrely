-- ============================================================================
-- 0037 — las DOS que el piloto dejó fuera del umbral pasan a OBJETO del evento
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- Cierra el único cabo abierto de la Fase 11: `boda-marco-nuestro` (7.3) y
-- `comunion-cinta` (5.8), las dos que la §19.7 dejó fuera del umbral de 8/10.
-- La §19 las declaró «no se arreglan iterando, necesitan decisión de
-- producto». La decisión se tomó el 2026-09-08 y es la MISMA para las dos, que
-- es también la lección central de la fase:
--
--   la variable no es «fotografía sí/no», es «hay un OBJETO del evento».
--
-- `xv-seda` lo demostró: con una TEXTURA bajó a 7.5, con el pastel del 15 subió
-- a 8.2, y el salto fue **sólo** en Event Relevance. Estas dos fallaban por lo
-- mismo, cada una a su manera:
--
--   · `boda-marco-nuestro` tenía un MARCADOR — `boda-marco-floral.jpg`, un
--     crisantemo sobre beige. Bonito, en paleta, y no dice «boda». Además
--     estaba puesto para que el anfitrión lo sustituyera, así que el catálogo
--     vendía una miniatura que no era lo que la plantilla entrega.
--   · `comunion-cinta` no tenía NINGUNA. Y no por olvido: la `0032` lo dejó
--     escrito —«de las 14 fotos de arte ninguna es de comunión, y colarle una
--     de boda o una corporativa sería exactamente el problema nº 7 del
--     research»—. El motivo era real; lo que faltaba era el asset.
--
-- ----------------------------------------------------------------------------
-- Las dos fotografías son NUEVAS (4.ª tanda) y están en `PROCEDENCIA.md`
-- ----------------------------------------------------------------------------
--   · `boda-pastel-rosas.jpg`   1600x2400 (2/3) · Pexels 28259731 ·
--     Ruxanda Photography · Free to use · velo MEDIDO oscuro 0.6 / claro 0.6
--   · `comunion-caliz-lino.jpg` 1600x2406 (2/3) · Pexels 8086724 ·
--     Anuja Tilj · Free to use · velo MEDIDO oscuro 0.6 / claro 0.55
--
-- El velo NO se estimó: sale de `scripts/verificar-contraste-arte.mts`, y las
-- dos están declaradas en `src/lib/theme/arte.ts`. El gate se vio ROJO antes de
-- declararlas y verde después.
--
-- ----------------------------------------------------------------------------
-- Por qué `2/3` en las dos: recorte CERO
-- ----------------------------------------------------------------------------
-- Las dos fuentes son 2/3 exacto (0.667 y 0.665), así que `imageRatio` a `2/3`
-- deja el recorte en 0 %. Es la lección de la `0034`/`0035`: la caja tiene que
-- coincidir con la FUENTE, porque `object-fit: cover` recorta en silencio y no
-- da error. El pre-vuelo de la suite lo comprueba en los DOS ejes.
--
-- ----------------------------------------------------------------------------
-- `overlay`: se mueve aunque hoy sea INERTE
-- ----------------------------------------------------------------------------
-- Medido en `previews.tsx`: el velo sólo se pinta cuando la foto va a sangre
-- (`centered`/`offset`). En `split` y `editorial` la foto es una figura
-- contenida y el texto va al lado, así que `overlay` no se lee. Se actualiza
-- igual, al valor de la columna CLARA de cada foto —que es la que aplica,
-- porque `centered` pinta texto blanco encima—, para no dejar la trampa que la
-- `0032` ya advirtió: si alguien cambia la variante, el valor que hereda tiene
-- que ser legible.
--
-- ----------------------------------------------------------------------------
-- Lo que NO se cambia, y por qué
-- ----------------------------------------------------------------------------
-- Los SLUGS se quedan. Cambiarlos dejaría huérfanas sus miniaturas
-- (`/previews/plantillas/<slug>.jpg`) y rompería la URL de su vista — la misma
-- razón que la `0036` escribió para `xv-seda`.
--
-- Los NOMBRES también. «Marco Nuestro» sigue siendo cierto: la composición ES
-- el marco partido, y ahora la mitad de la foto muestra un pastel en vez de un
-- marcador. «Cinta» sigue siendo cierto: el motivo es el marco interior, y el
-- cáliz viene envuelto en lino. No es el caso de `xv-seda`, donde el nombre
-- nombraba justo el material que se quitaba.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 · `boda-marco-nuestro` — el marcador pasa a pastel de boda
-- ----------------------------------------------------------------------------
update public.templates
   set description = 'La composición es el marco: portada partida con el pastel a un lado y la tipografía al otro.',
       modules_config = jsonb_set(
         jsonb_set(
           jsonb_set(
             modules_config,
             '{0,config,imageUrl}',
             '"/arte/foto/boda-pastel-rosas.jpg"'::jsonb,
             true),
           '{0,config,imageRatio}',
           '"2/3"'::jsonb,
           true),
         '{0,config,overlay}',
         '0.6'::jsonb,
         true)
 where slug = 'boda-marco-nuestro'
   -- Guardas de forma: si el hero no está en el índice 0 o la variante ya no es
   -- `split`, no se toca nada en vez de escribir sobre el módulo equivocado.
   and modules_config -> 0 ->> 'module_type' = 'hero'
   and modules_config #>> '{0,config,variant}' = 'split';

-- ----------------------------------------------------------------------------
-- 2 · `comunion-cinta` — de `plain` (cero fotografía) a `editorial` con cáliz
-- ----------------------------------------------------------------------------
-- `editorial` y no `split`: la plantilla es tipográfica —serif de cuerpo,
-- `elegant` de titular, espaciado `relaxed`, marco interior— y `editorial` es
-- exactamente «tipografía grande y foto contenida», así que conserva su carácter
-- en vez de partirlo en dos mitades.
--
-- Comprobado por PRECEDENTE MEDIDO, no por suposición: `boda-papel-y-lino` ya
-- es `editorial` con una foto 9/16 —MÁS alta que esta— y su miniatura ya
-- capturada muestra el texto arriba y la fotografía llenando el resto. A 2/3
-- entra MÁS foto que ahí, así que el recorte de 420x560 no se la come.
update public.templates
   set description = 'Primera comunión: blanco y trigo, serif de cuerpo y marco interior, con el cáliz contenido bajo la tipografía.',
       modules_config = jsonb_set(
         jsonb_set(
           jsonb_set(
             jsonb_set(
               modules_config,
               '{0,config,variant}',
               '"editorial"'::jsonb,
               true),
             '{0,config,imageUrl}',
             '"/arte/foto/comunion-caliz-lino.jpg"'::jsonb,
             true),
           '{0,config,imageRatio}',
           '"2/3"'::jsonb,
           true),
         '{0,config,overlay}',
         '0.55'::jsonb,
         true)
 where slug = 'comunion-cinta'
   and modules_config -> 0 ->> 'module_type' = 'hero'
   -- Ojo: aquí la guarda es `plain`, que es de donde SALE. Así la migración es
   -- idempotente por construcción — al segundo pase la variante ya es
   -- `editorial` y toca 0 filas en vez de reescribir encima.
   and modules_config #>> '{0,config,variant}' = 'plain';

-- ============================================================================
-- Verificación
-- ============================================================================
--   select slug,
--          modules_config #>> '{0,config,variant}'    as variante,
--          modules_config #>> '{0,config,imageUrl}'   as foto,
--          modules_config #>> '{0,config,imageRatio}' as proporcion,
--          modules_config #>> '{0,config,overlay}'    as velo
--     from public.templates
--    where slug in ('boda-marco-nuestro','comunion-cinta')
--    order by slug;
--
--     boda-marco-nuestro | split     | /arte/foto/boda-pastel-rosas.jpg   | 2/3 | 0.6
--     comunion-cinta     | editorial | /arte/foto/comunion-caliz-lino.jpg | 2/3 | 0.55
--
-- Las dos filas, o algo salió mal:
--   select count(*) from public.templates
--    where slug in ('boda-marco-nuestro','comunion-cinta')
--      and modules_config #>> '{0,config,imageRatio}' = '2/3';   -- 2
--
-- Después, y sólo después:
--   node scripts/capturar-miniaturas.mts boda-marco-nuestro comunion-cinta
-- y commitear las dos imágenes junto al bump de REVISION_MINIATURAS.
-- ============================================================================
