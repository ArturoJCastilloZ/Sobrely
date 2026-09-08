-- ============================================================================
-- 0033 — Piloto de la Fase 11: las 7 plantillas con FOTOGRAFÍA (F1 y F3)
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano.
--
-- Completa el piloto de `docs/TEMPLATE_VISUAL_RESEARCH_V2.md` §16: la `0032`
-- trajo las 8 sin licencia (F4/F5) y ésta trae las 7 fotográficas.
--
-- Las siete imágenes se descargaron el 2026-09-08 **con autorización explícita
-- del dev**, se auto-hospedan en `public/arte/foto/` (cero phone-home: nunca se
-- enlaza a `images.pexels.com` ni a `images.unsplash.com`) y su procedencia,
-- autoría, licencia y fecha de consulta están en `public/arte/PROCEDENCIA.md`.
--
-- ----------------------------------------------------------------------------
-- La medición cambió el plan, y conviene saber por qué
-- ----------------------------------------------------------------------------
-- El research asignaba una plantilla a la familia **F2** («telón total»: foto a
-- sangre con texto encima). `scripts/verificar-contraste-arte.mts` midió el velo
-- mínimo de las siete y **todas piden entre 0.50 y 0.65**, por encima del umbral
-- de 0.35 que el propio research fija (criterio E5, el mismo con el que se
-- descartó `boda-flores-cinta`).
--
-- Así que **F2 se queda SIN representante en el piloto**, y es un resultado, no
-- un olvido: un telón necesita rango de luminancia estrecho y centro vacío, y
-- una foto de objeto no lo tiene. Las siete se usan como FIGURA CONTENIDA —F1
-- partida, F3 objeto y aire—, donde no hay texto encima y el velo no interviene.
--
-- ----------------------------------------------------------------------------
-- Qué primitiva ejercita cada una
-- ----------------------------------------------------------------------------
--   P3 `variant: "split"`      · Boda y Cumpleaños — la portada partida
--   P3 `variant: "editorial"`  · XV, Gender reveal y Bautizo — objeto y aire
--   P2 `media`                 · Baby y Graduación — la foto va en el MÓDULO,
--                                no en la portada, con `position` left/right.
--                                Son los dos primeros consumidores en
--                                producción del slot de media.
--   P4 `typography`            · las 7, con pares distintos
--
-- El `overlay` del hero se queda en **0.45**, el defecto del esquema, en las
-- cinco que traen foto. Es INERTE aquí —el velo sólo se pinta cuando la foto va
-- a sangre, y ninguna de estas lo hace— pero si alguien cambia la variante a
-- `centered`, el texto pasa a blanco SOBRE la foto y 0.45 es lo que lo mantiene
-- legible. Y NO se usan los velos medidos de `arte.ts`: ese número mide un velo
-- del color de FONDO con texto oscuro, y el del hero es un gradiente NEGRO con
-- texto blanco. Son mecanismos distintos y mezclarlos sería un número con
-- pinta de medido que no mide esto.
--   P5 `frame` · P1 `align`    · repartidos
--
-- Igual que la `0032`: sólo módulos que cubre el plan **Free** (`hero`,
-- `welcome`, `countdown`, `rsvp`), así que las 7 nacen publicables en gratuito.
-- Y sin `backgroundImage`: aquí la carga visual la lleva la fotografía, y
-- sumarle textura de fondo sería ruido.
--
-- ⚠️ Categorías NUEVAS que estrena: **Bautizo** y **Graduación**. Como en la
-- `0032`, no necesitan migración de esquema (`event_type` es `text` plano y el
-- filtro deriva sus facetas del dato).
--
-- ----------------------------------------------------------------------------
-- Orden de aplicación — IDÉNTICO al de la `0032`, y por la misma razón de RLS
-- ----------------------------------------------------------------------------
--   1. aplicar esta migración      → 7 filas activas, `preview_image_url` NULL
--   2. `node scripts/capturar-miniaturas.mts <los 7 slugs>`
--   3. el `update` del PASO 3, al final
--   4. commitear las 7 imágenes + el bump de `REVISION_MINIATURAS` JUNTOS
-- ============================================================================

insert into public.templates
  (name, slug, description, event_type, theme_config, modules_config, is_active)
values

-- BODA · F1 · portada partida ------------------------------------------------
(
  'Jardín Partido',
  'boda-jardin-partido',
  'Portada partida: papelería de jardín a un lado y tipografía editorial al otro.',
  'Boda',
  '{
     "colors": {"primary":"#7c8f6a","secondary":"#c3b393","background":"#fbfaf6","text":"#2c2f2a"},
     "font": "serif",
     "typography": {"heading":"serif","body":"sans"},
     "spacing": "normal"
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Ana & Carlos","subtitle":"7 de noviembre","ctaLabel":"Nuestra boda","imageUrl":"/arte/foto/boda-papeleria-salvia.jpg","variant":"split","overlay":0.45}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Bienvenidos","message":"Nos hará muy felices celebrar este día contigo.","frame":"line","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Te esperamos.","allowGuestCount":true,"frame":"none"}}
   ]'::jsonb,
  true
),

-- XV AÑOS · F3 · objeto y aire -----------------------------------------------
(
  'Corona',
  'xv-corona',
  'Tipografía grande, mucho aire y un solo objeto: la corona. Editorial y sobria.',
  'XV años',
  '{
     "colors": {"primary":"#2b2430","secondary":"#b08d57","background":"#faf8f5","text":"#241f28"},
     "font": "elegant",
     "typography": {"heading":"elegant","body":"sans"},
     "spacing": "relaxed"
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Mis XV años","subtitle":"Valeria","ctaLabel":"Te espero","imageUrl":"/arte/foto/xv-tiara-noche.jpg","variant":"editorial","overlay":0.45}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Bienvenidos","message":"Celebremos juntos una noche que quiero recordar siempre.","frame":"none","align":"start"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none","align":"start"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Avísame si vienes.","allowGuestCount":true,"frame":"line","align":"start"}}
   ]'::jsonb,
  true
),

-- BABY SHOWER · F1 en el MÓDULO · primer consumidor del slot de media --------
(
  'Punto y Flor',
  'baby-punto-y-flor',
  'Bodegón de punto y flor seca junto al texto. La imagen vive en la sección, no en la portada.',
  'Baby shower',
  '{
     "colors": {"primary":"#8a9a7b","secondary":"#ddc9b4","background":"#fbf9f5","text":"#2d302b"},
     "font": "script",
     "typography": {"heading":"script","body":"sans"},
     "spacing": "relaxed"
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Baby shower","subtitle":"Ya viene en camino","ctaLabel":"Celebra con nosotros","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Bienvenidos","message":"Nos encantaría compartir esta etapa contigo.","frame":"none","align":"center",
                "media":{"url":"/arte/foto/baby-punto-y-flor.jpg","alt":"","position":"left","ratio":"3/4","focal":"center","overlay":0,"shape":"rect"}}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Nos vemos en","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Cuéntanos si nos acompañas.","allowGuestCount":true,"frame":"line"}}
   ]'::jsonb,
  true
),

-- GENDER REVEAL · F3 ---------------------------------------------------------
(
  'Coral',
  'revelacion-coral',
  'Globos coral y turquesa como objeto único. Evita el rosa-azul de manual.',
  'Gender reveal',
  '{
     "colors": {"primary":"#e2725b","secondary":"#4fb3a5","background":"#fbfbfa","text":"#2a2b2e"},
     "font": "sans",
     "typography": {"heading":"sans","body":"sans"},
     "spacing": "normal"
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"¿Niño o niña?","subtitle":"Ven a descubrirlo con nosotros","ctaLabel":"La gran revelación","imageUrl":"/arte/foto/revelacion-globos-coral.jpg","variant":"editorial","overlay":0.45}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"El gran momento","message":"Queremos que estés ahí cuando lo sepamos.","frame":"none","align":"start"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none","align":"start"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Avísanos si vienes.","allowGuestCount":true,"frame":"line","align":"start"}}
   ]'::jsonb,
  true
),

-- CUMPLEAÑOS · F1 · portada partida ------------------------------------------
(
  'Arco',
  'cumpleanos-arco',
  'Portada partida con un arco de globos. Festiva sin caer en el desorden.',
  'Cumpleaños',
  '{
     "colors": {"primary":"#f2a03d","secondary":"#4aa8b0","background":"#ffffff","text":"#26272b"},
     "font": "sans",
     "typography": {"heading":"sans","body":"sans"},
     "spacing": "normal"
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"¡Es mi cumpleaños!","subtitle":"Ven a celebrar conmigo","ctaLabel":"Te espero","imageUrl":"/arte/foto/cumple-arco-globos.jpg","variant":"split","overlay":0.45}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Cuenta regresiva","message":"Va a haber pastel, música y buena compañía.","frame":"line","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Dime si te apuntas.","allowGuestCount":true,"frame":"none"}}
   ]'::jsonb,
  true
),

-- BAUTIZO · F3 · CATEGORÍA NUEVA ---------------------------------------------
-- La foto es un bodegón blanco con vela, no una ceremonia. Es deliberado: el
-- research veta las fotografías de bautizo del stock porque devuelven MENORES
-- identificables, y ninguna licencia garantiza model release. La contrapartida
-- honesta es que su relevancia de evento es la más baja de las siete, y así hay
-- que puntuarla.
(
  'Cera Blanca',
  'bautizo-cera-blanca',
  'Bodegón sereno de vela y flor blanca, con tipografía tranquila y mucho aire.',
  'Bautizo',
  '{
     "colors": {"primary":"#8a8f7d","secondary":"#cfc3a8","background":"#fdfcf9","text":"#2b2c28"},
     "font": "elegant",
     "typography": {"heading":"elegant","body":"serif"},
     "spacing": "relaxed"
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Mi Bautizo","subtitle":"Mateo","ctaLabel":"Acompáñanos","imageUrl":"/arte/foto/bautizo-cera-blanca.jpg","variant":"editorial","overlay":0.45}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Un día especial","message":"Nos gustaría compartirlo con las personas que queremos.","frame":"none","align":"start"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none","align":"start"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Te esperamos.","allowGuestCount":true,"frame":"inset","align":"start"}}
   ]'::jsonb,
  true
),

-- GRADUACIÓN · CATEGORÍA NUEVA · segundo consumidor del slot de media --------
(
  'Diploma',
  'graduacion-diploma',
  'El diploma junto al texto, en composición partida dentro de la sección.',
  'Graduación',
  '{
     "colors": {"primary":"#c2565b","secondary":"#d4af37","background":"#fdf8f7","text":"#2a2426"},
     "font": "sans",
     "typography": {"heading":"sans","body":"serif"},
     "spacing": "normal"
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Me gradúo","subtitle":"Sofía","ctaLabel":"Celébralo conmigo","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Lo logré","message":"Gracias por acompañarme en el camino hasta aquí.","frame":"none","align":"center",
                "media":{"url":"/arte/foto/graduacion-diploma.jpg","alt":"","position":"right","ratio":"4/3","focal":"center","overlay":0,"shape":"rect"}}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Dime si vienes.","allowGuestCount":true,"frame":"line"}}
   ]'::jsonb,
  true
)

on conflict (slug) do nothing;

-- ============================================================================
-- PASO 2 — Verificación tras aplicar
-- ============================================================================
--   select count(*) from public.templates
--    where slug in ('boda-jardin-partido','xv-corona','baby-punto-y-flor',
--                   'revelacion-coral','cumpleanos-arco','bautizo-cera-blanca',
--                   'graduacion-diploma')
--      and is_active and preview_image_url is null;                  -- 7
--   select count(*) from public.templates where is_active;           -- 65
--   select distinct event_type from public.templates where is_active;
--     -- + Bautizo · Graduación
--
-- ============================================================================
-- PASO 3 — Capturar PRIMERO, y sólo entonces el UPDATE
-- ============================================================================
--   node scripts/capturar-miniaturas.mts \
--     boda-jardin-partido xv-corona baby-punto-y-flor revelacion-coral \
--     cumpleanos-arco bautizo-cera-blanca graduacion-diploma
--
--   update public.templates
--      set preview_image_url = '/previews/plantillas/' || slug || '.jpg'
--    where slug in ('boda-jardin-partido','xv-corona','baby-punto-y-flor',
--                   'revelacion-coral','cumpleanos-arco','bautizo-cera-blanca',
--                   'graduacion-diploma');
--
--   select count(*) from public.templates
--    where is_active and preview_image_url is null;                  -- 0
-- ============================================================================
