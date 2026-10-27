-- ============================================================================
-- 0067 — Piloto de arte ilustrado (ChatGPT/Gemini): cinco plantillas NUEVAS
-- ============================================================================
--
-- Cinco plantillas nuevas, clonadas de otras ya publicadas (mismos módulos y mismo texto de
-- ejemplo) con otro tema y una ilustración de fondo en `public/arte/ia/`. Son NUEVAS y no
-- reemplazos a propósito: el catálogo actual no se toca y, si el piloto no convence, se
-- desactivan (`is_active = false`) sin perder nada. Las invitaciones ya creadas copian la
-- plantilla al crearse, así que tampoco les afecta.
--
-- Idempotente: `on conflict (slug) do nothing`.
--
-- No cambia el esquema. Solo inserta filas en `templates`.
-- ============================================================================

insert into public.templates (name, slug, description, event_type, preview_image_url, theme_config, modules_config, is_active)
select v.nombre, v.slug, v.descripcion, o.event_type, '/previews/plantillas/' || v.slug || '.jpg', v.tema::jsonb, o.modules_config, true
from (values
  ('Acuarela de eucalipto', 'boda-acuarela-eucalipto', 'Ramas de eucalipto y flor blanca pintadas a mano sobre un verde salvia muy claro.', 'boda-jardin',
   '{"font":"serif","spacing":"normal","colors":{"text":"#243027","primary":"#4b7f52","secondary":"#8fa68e","background":"#ecf2e7"},"backgroundImage":{"url":"/arte/ia/boda-acuarela-eucalipto.webp","overlay":0}}'),
  ('Peonías en acuarela', 'xv-acuarela-peonias', 'Peonías rosa y lila con polvo dorado sutil, sobre un fondo empolvado.', 'xv-clasicos-elegantes',
   '{"font":"elegant","spacing":"normal","colors":{"text":"#3a2229","primary":"#a24d66","secondary":"#d9a5b8","background":"#faefef"},"backgroundImage":{"url":"/arte/ia/xv-acuarela-peonias.webp","overlay":0}}'),
  ('Nubes y luna', 'baby-nubes-acuarela', 'Nubes, luna y estrellas en crema, arena y salvia para una bienvenida tranquila.', 'baby-shower-neutro',
   '{"font":"serif","spacing":"relaxed","colors":{"text":"#33382f","primary":"#7c9070","secondary":"#d9c7a8","background":"#f6efe4"},"backgroundImage":{"url":"/arte/ia/baby-nubes-acuarela.webp","overlay":0}}'),
  ('Noche de gala', 'xv-noche-estrellada', 'Azul noche con estrellas y ramas doradas finas, para una fiesta que sigue de noche.', 'xv-noche-estelar',
   '{"font":"serif","spacing":"normal","mode":"dark","colors":{"text":"#f1ede4","primary":"#c9a96a","secondary":"#8fa3c7","background":"#14203a"},"backgroundImage":{"url":"/arte/ia/xv-noche-estrellada.webp","overlay":0}}'),
  ('Fiesta mexicana', 'cumpleanos-fiesta-mexicana', 'Papel picado y cempasúchil en tonos cálidos sobre fondo crema.', 'cumpleanos-sencillo',
   '{"font":"sans","spacing":"normal","colors":{"text":"#2a2422","primary":"#d81e5b","secondary":"#f2a900","background":"#fff8ec"},"backgroundImage":{"url":"/arte/ia/fiesta-papel-picado.webp","overlay":0}}')
) as v(nombre, slug, descripcion, origen, tema)
join public.templates o on o.slug = v.origen
on conflict (slug) do nothing;
