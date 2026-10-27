-- ============================================================================
-- 0070 — Familia de noche: tres plantillas oscuras NUEVAS
-- ============================================================================
--
-- Punto 7 del plan de validación de diseño (docs/auditoria-2026-10/18). El catálogo es casi todo
-- de día: solo `xv-noche-estelar` y `xv-produccion-completa` son oscuras, y los fondos oscuros son
-- lo que más aparece en la competencia mexicana de XV años. Se añaden tres, clonadas de otras
-- plantillas (mismos módulos y mismo texto de ejemplo) con tema oscuro y un fondo dibujado en
-- `public/arte/` (SVG, sin imágenes):
--   · XV años «Noche de gala»            (azul medianoche, plata y dorado)
--   · Boda «Bosque y champán»            (verde bosque con ramitas champán)
--   · Corporativo «Negro con acento»     (negro con un solo acento ámbar)
--
-- Nuevas y no reemplazos a propósito: si no convencen se desactivan (`is_active = false`).
-- Solo inserta filas en `templates`; no cambia el esquema. Idempotente (`on conflict do nothing`).
-- ============================================================================

insert into public.templates (name, slug, description, event_type, preview_image_url, theme_config, modules_config, is_active)
select v.nombre, v.slug, v.descripcion, o.event_type, '/previews/plantillas/' || v.slug || '.jpg', v.tema::jsonb, o.modules_config, true
from (values
  ('Noche de gala', 'xv-noche-azul', 'Azul medianoche con estrellas de plata y oro, para una fiesta que sigue de noche.', 'xv-noche-estelar',
   '{"font":"serif","spacing":"normal","mode":"dark","colors":{"text":"#f1ede4","primary":"#c9a96a","secondary":"#8fa3c7","background":"#0f1a33"},"backgroundImage":{"url":"/arte/xv-noche-azul-arte.svg","overlay":0}}'),
  ('Bosque y champán', 'boda-bosque-champan', 'Verde bosque con ramitas en champán y salvia, para una boda de tarde que termina de noche.', 'boda-jardin',
   '{"font":"serif","spacing":"normal","mode":"dark","colors":{"text":"#f0ead9","primary":"#d9c7a0","secondary":"#6f8f78","background":"#13241c"},"backgroundImage":{"url":"/arte/boda-bosque-champan-arte.svg","overlay":0}}'),
  ('Negro con acento', 'corporativo-negro-acento', 'Negro sobrio con un solo acento ámbar y reglas finas en los bordes.', 'corporativo-conferencia-agenda',
   '{"font":"clean","spacing":"normal","mode":"dark","colors":{"text":"#f3f4f6","primary":"#f2a900","secondary":"#6b7280","background":"#0e1014"},"backgroundImage":{"url":"/arte/corporativo-negro-arte.svg","overlay":0}}')
) as v(nombre, slug, descripcion, origen, tema)
join public.templates o on o.slug = v.origen
on conflict (slug) do nothing;
