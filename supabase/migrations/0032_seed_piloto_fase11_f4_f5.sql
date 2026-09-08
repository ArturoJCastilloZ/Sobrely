-- ============================================================================
-- 0032 — Piloto de la Fase 11: las 8 plantillas F4 y F5
-- ============================================================================
--
-- ⛔ NO APLICADA. La aplica el dev a mano, como todas.
--
-- Qué son estas 8: la mitad BARATA del piloto de `docs/TEMPLATE_VISUAL_RESEARCH_V2.md`
-- (§16). Las familias F4 («papelería»: sin fotografía, la calidad la ponen la
-- tipografía, el marco y la composición) y F5 («marco para tu foto»). **Ninguna
-- consume una licencia nueva**: las texturas y la única fotografía ya viven en
-- `public/arte/`, con su procedencia en `public/arte/PROCEDENCIA.md`.
--
-- Las otras 7 del piloto (F1, F2, F3) NO entran aquí: necesitan descargar
-- fotografía nueva, y eso no se ha hecho ni se hará sin que el dev lo pida.
--
-- ----------------------------------------------------------------------------
-- Por qué nacen ACTIVAS pero SIN miniatura
-- ----------------------------------------------------------------------------
-- Lo natural sería sembrarlas apagadas y encenderlas al tener las miniaturas.
-- **No se puede, y está verificado en la fuente**: la política de RLS
-- `templates_select_active_public` (`0001_initial_schema.sql:213`) es
-- `using (is_active = true)`. Una plantilla apagada es INVISIBLE para la llave
-- publicable, así que `/plantilla/<slug>` —la superficie de captura— daría 404
-- y el script no podría fotografiarla. Cambiar esa política para acomodar un
-- flujo de trabajo sería tocar seguridad por conveniencia, y no se hace.
--
-- Así que entran activas y con `preview_image_url` en NULL. Medido en
-- `template-marketplace.tsx:285`: la tarjeta envuelve la imagen en
-- `{tpl.preview_image_url && (…)}`, de modo que sin miniatura **no pinta un
-- hueco roto**, simplemente no pinta imagen. El coste honesto es una ventana en
-- la que 8 tarjetas se ven sin foto; el orden de abajo la hace corta.
--
--   1. aplicar esta migración   → 8 filas activas, sin miniatura
--   2. `node scripts/capturar-miniaturas.mts <los 8 slugs>`
--   3. correr el UPDATE del PASO 3 → quedan con miniatura
--   4. commitear las 8 imágenes + el bump de `REVISION_MINIATURAS`
--
-- ⚠️ Ojo con el paso 4: el script sube `REVISION_MINIATURAS` **también en una
-- tanda parcial**, y esa revisión es lo que invalida la caché de `next/image`
-- (4 h). Tiene que entrar en el mismo commit que las imágenes.
--
-- ----------------------------------------------------------------------------
-- Lo que estas 8 ejercitan (y por eso son el piloto)
-- ----------------------------------------------------------------------------
--   P4 `typography`  · el par heading/body, que el esquema no tenía
--   P1 `align`       · Retícula corporativa alineada a la izquierda
--   P5 `frame`       · line · double · inset, con el color del propio tema
--   P3 `variant`     · `plain` en las F4 (ignora la foto), `split` en la F5
--   P2 `media`       · sin usar aquí a propósito: es de las F1/F2/F3
--
-- ----------------------------------------------------------------------------
-- Dos hechos que condicionan el diseño, medidos, no supuestos
-- ----------------------------------------------------------------------------
-- 1. Los módulos que cubre el plan FREE son exactamente `hero`, `welcome`,
--    `countdown` y `rsvp` (`src/lib/billing/plans.ts`). Las 8 usan sólo esos,
--    así que **nacen publicables en gratuito**. Es deliberado y es la tesis del
--    research: la calidad la pone la composición, no el número de módulos.
-- 2. El arte servido por la app (`/arte/…`) **no dispara** el gate de
--    `custom_art` desde `b48d823`, así que la textura de fondo no las encarece.
--
-- Los `overlay` NO son a ojo: son los velos MEDIDOS por
-- `scripts/verificar-contraste-arte.mts` y declarados en `src/lib/theme/arte.ts`
-- (0.05 en las cinco texturas, 0.1 en la fotografía).
--
-- `on conflict (slug) do nothing`: `templates.slug` es `unique`, así que la
-- migración se puede volver a correr sin duplicar ni pisar nada.
-- ============================================================================

insert into public.templates
  (name, slug, description, event_type, theme_config, modules_config, is_active)
values

-- ---------------------------------------------------------------- BODA · F4
(
  'Papel y Lino',
  'boda-papel-y-lino',
  'Papelería de boda: serif editorial, filete interior y textura de lino. Sin fotografía.',
  'Boda',
  '{
     "colors": {"primary":"#7c7f5e","secondary":"#b8a68a","background":"#fbf8f1","text":"#2f2c26"},
     "font": "elegant",
     "typography": {"heading":"elegant","body":"sans"},
     "spacing": "relaxed",
     "backgroundImage": {"url":"/arte/boda-lino-sello.svg","overlay":0.05}
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Ana & Carlos","subtitle":"Nos casamos","ctaLabel":"Acompáñanos","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Bienvenidos","message":"Nos hará muy felices celebrar este día contigo.","frame":"inset","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Te esperamos.","allowGuestCount":true,"frame":"line"}}
   ]'::jsonb,
  true
),

-- ---------------------------------------------------------------- BODA · F5
(
  'Marco Nuestro',
  'boda-marco-nuestro',
  'La composición es el marco: portada partida con tu fotografía a un lado y la tipografía al otro.',
  'Boda',
  '{
     "colors": {"primary":"#8a6d3b","secondary":"#c2b49a","background":"#ffffff","text":"#26221d"},
     "font": "serif",
     "typography": {"heading":"serif","body":"sans"},
     "spacing": "normal"
   }'::jsonb,
  -- La fotografía viene puesta a propósito: es un MARCADOR DE POSICIÓN que el
  -- anfitrión reemplaza por la suya. Sin ella la miniatura no comunicaría el
  -- concepto de la plantilla. Es un asset que el repo YA tiene licenciado.
  --
  -- `overlay` se queda en 0.45 aunque en `split` sea inerte —el velo sólo se
  -- pinta cuando la foto va a sangre—: si alguien cambia la variante a
  -- `centered`, el texto pasa a blanco SOBRE la foto y 0.45 es el valor que lo
  -- mantiene legible. Poner 0 aquí sería dejar una trampa.
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Ana & Carlos","subtitle":"7 de noviembre","ctaLabel":"Nuestra boda","imageUrl":"/arte/foto/boda-marco-floral.jpg","variant":"split","overlay":0.45}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Nuestra historia","message":"Gracias por acompañarnos en el día que llevamos tanto tiempo imaginando.","frame":"line","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Nos encantaría contar contigo.","allowGuestCount":true,"frame":"none"}}
   ]'::jsonb,
  true
),

-- ------------------------------------------------------------- XV AÑOS · F4
(
  'Seda',
  'xv-seda',
  'XV años en clave de papelería: manuscrita grande, filete doble y rosa empolvado.',
  'XV años',
  '{
     "colors": {"primary":"#7b2d3a","secondary":"#c9a227","background":"#fdf7f5","text":"#2b2124"},
     "font": "script",
     "typography": {"heading":"script","body":"sans"},
     "spacing": "relaxed",
     "backgroundImage": {"url":"/arte/xv-rosa-polvo.svg","overlay":0.05}
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Mis XV años","subtitle":"Valeria","ctaLabel":"Te espero","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Bienvenidos","message":"Celebremos juntos una noche que quiero recordar siempre.","frame":"double","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Avísame si vienes.","allowGuestCount":true,"frame":"none"}}
   ]'::jsonb,
  true
),

-- --------------------------------------------------------- BABY SHOWER · F4
(
  'Nube de Algodón',
  'baby-nube-de-algodon',
  'Baby shower sereno: serif editorial, marco interior y cielo en acuarela.',
  'Baby shower',
  '{
     "colors": {"primary":"#7c9070","secondary":"#e3c9b8","background":"#fbfaf6","text":"#2c2f2a"},
     "font": "elegant",
     "typography": {"heading":"elegant","body":"sans"},
     "spacing": "relaxed",
     "backgroundImage": {"url":"/arte/baby-cielo.svg","overlay":0.05}
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Baby shower","subtitle":"Ya viene en camino","ctaLabel":"Celebra con nosotros","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Bienvenidos","message":"Nos encantaría compartir esta etapa contigo.","frame":"inset","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Nos vemos en","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Cuéntanos si nos acompañas.","allowGuestCount":true,"frame":"line"}}
   ]'::jsonb,
  true
),

-- ------------------------------------------------------- GENDER REVEAL · F4
-- ⚠️ CATEGORÍA NUEVA. `event_type` es `text` plano sin CHECK ni enum
-- (`0001_initial_schema.sql:48,72`), y el filtro del marketplace DERIVA sus
-- facetas del dato (`marketplace.ts:99-100`), así que no hace falta ninguna
-- migración de esquema: al activar esta fila, la faceta aparece sola.
(
  'Dos Sobres',
  'revelacion-dos-sobres',
  'Gender reveal sin fotografía: dos acentos, filete y acuarela. La respuesta se guarda para el final.',
  'Gender reveal',
  '{
     "colors": {"primary":"#c98b9e","secondary":"#8fb3cf","background":"#fdfbfb","text":"#2c2830"},
     "font": "elegant",
     "typography": {"heading":"elegant","body":"sans"},
     "spacing": "normal",
     "backgroundImage": {"url":"/arte/revelacion-acuarela.svg","overlay":0.05}
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"¿Niño o niña?","subtitle":"Ven a descubrirlo con nosotros","ctaLabel":"La gran revelación","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"El gran momento","message":"Queremos que estés ahí cuando lo sepamos.","frame":"line","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Avísanos si vienes.","allowGuestCount":true,"frame":"none"}}
   ]'::jsonb,
  true
),

-- ---------------------------------------------------------- CUMPLEAÑOS · F4
(
  'Papel Picado',
  'cumpleanos-papel-picado',
  'Cumpleaños gráfico: guirnalda, filete doble y tipografía de cartel. Sin fotografía.',
  'Cumpleaños',
  '{
     "colors": {"primary":"#d05353","secondary":"#e8b04b","background":"#fffdf7","text":"#2a2422"},
     "font": "sans",
     "typography": {"heading":"sans","body":"sans"},
     "spacing": "normal",
     "backgroundImage": {"url":"/arte/cumple-guirnalda.svg","overlay":0.05}
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"¡Es mi cumpleaños!","subtitle":"Ven a celebrar conmigo","ctaLabel":"Te espero","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Cuenta regresiva","message":"Va a haber pastel, música y buena compañía.","frame":"double","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Dime si te apuntas.","allowGuestCount":true,"frame":"none"}}
   ]'::jsonb,
  true
),

-- --------------------------------------------------- PRIMERA COMUNIÓN · F4
-- ⚠️ CATEGORÍA NUEVA (ver la nota de Gender reveal).
--
-- SIN textura de fondo, y es una decisión, no un olvido: de las 13 piezas de
-- arte ninguna es de comunión, y colarle una de boda o una corporativa sería
-- exactamente el problema nº 7 del research —«podría pertenecer a cualquier
-- categoría»—. F4 no necesita arte: le basta la tipografía y el marco.
(
  'Cinta',
  'comunion-cinta',
  'Primera comunión: blanco y trigo, serif de cuerpo y marco interior. Sólo tipografía.',
  'Primera comunión',
  '{
     "colors": {"primary":"#a68a52","secondary":"#d8c9a3","background":"#fffdf8","text":"#2b2823"},
     "font": "elegant",
     "typography": {"heading":"elegant","body":"serif"},
     "spacing": "relaxed"
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Mi Primera Comunión","subtitle":"Sofía","ctaLabel":"Acompáñanos","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Un día especial","message":"Nos gustaría compartirlo con las personas que queremos.","frame":"inset","align":"center"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Faltan","useEventDate":true,"frame":"none"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Te esperamos.","allowGuestCount":true,"frame":"line"}}
   ]'::jsonb,
  true
),

-- --------------------------------------------------------- CORPORATIVO · F4
-- La única alineada a la IZQUIERDA (`align: start`), y por eso está en el
-- piloto: es la que ejercita P1. El research midió que corporativo es la
-- categoría más vacía del catálogo, y también la que menos espera una foto.
(
  'Retícula',
  'corporativo-reticula',
  'Evento corporativo tipográfico: retícula, filete y lectura alineada a la izquierda.',
  'Corporativo',
  '{
     "colors": {"primary":"#1e3a5f","secondary":"#8b98a6","background":"#f8fafc","text":"#1b2028"},
     "font": "sans",
     "typography": {"heading":"sans","body":"sans"},
     "spacing": "normal",
     "backgroundImage": {"url":"/arte/corp-lineas.svg","overlay":0.05}
   }'::jsonb,
  '[
     {"module_type":"hero","sort_order":0,"is_visible":true,
      "config":{"title":"Nombre del evento","subtitle":"Te esperamos","ctaLabel":"Regístrate","imageUrl":"","variant":"plain"}},
     {"module_type":"welcome","sort_order":1,"is_visible":true,
      "config":{"title":"Sobre el evento","message":"Una jornada de contenido y networking.","frame":"line","align":"start"}},
     {"module_type":"countdown","sort_order":2,"is_visible":true,
      "config":{"title":"Comienza en","useEventDate":true,"frame":"none","align":"start"}},
     {"module_type":"rsvp","sort_order":3,"is_visible":true,
      "config":{"title":"Confirma tu asistencia","description":"Regístrate para reservar tu lugar.","allowGuestCount":false,"frame":"none","align":"start"}}
   ]'::jsonb,
  true
)

on conflict (slug) do nothing;

-- ============================================================================
-- PASO 2 — Verificación tras aplicar
-- ============================================================================
--
--   -- deben ser 8, activas y sin miniatura todavía
--   select count(*) from public.templates
--    where slug in ('boda-papel-y-lino','boda-marco-nuestro','xv-seda',
--                   'baby-nube-de-algodon','revelacion-dos-sobres',
--                   'cumpleanos-papel-picado','comunion-cinta',
--                   'corporativo-reticula')
--      and is_active and preview_image_url is null;                  -- 8
--
--   select count(*) from public.templates where is_active;           -- 58
--
--   -- las dos categorías nuevas ya aparecen solas en el filtro
--   select distinct event_type from public.templates where is_active;
--     -- + Gender reveal · Primera comunión
--
-- ============================================================================
-- PASO 3 — La miniatura. Capturar PRIMERO, y sólo entonces el UPDATE.
-- ============================================================================
--
--   node scripts/capturar-miniaturas.mts \
--     boda-papel-y-lino boda-marco-nuestro xv-seda baby-nube-de-algodon \
--     revelacion-dos-sobres cumpleanos-papel-picado comunion-cinta \
--     corporativo-reticula
--
-- La URL se DERIVA del slug, igual que en la `0029`: no se escribe a mano en 8
-- sitios, que es como se cuelan las que no coinciden con su archivo.
--
--   update public.templates
--      set preview_image_url = '/previews/plantillas/' || slug || '.jpg'
--    where slug in ('boda-papel-y-lino','boda-marco-nuestro','xv-seda',
--                   'baby-nube-de-algodon','revelacion-dos-sobres',
--                   'cumpleanos-papel-picado','comunion-cinta',
--                   'corporativo-reticula');
--
-- Verificación final:
--
--   select count(*) from public.templates
--    where is_active and preview_image_url is null;                  -- 0
--   select count(*) from public.templates where is_active;           -- 58
-- ============================================================================
