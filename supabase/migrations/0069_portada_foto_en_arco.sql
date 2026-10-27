-- ============================================================================
-- 0069 — Foto en arco en las portadas con foto cuadrada
-- ============================================================================
--
-- El arco (máscara de las dos esquinas de arriba de la foto contenida) es la forma que más
-- aparece en las tendencias de papelería 2026. Se activa solo en las plantillas cuya foto ya
-- es CUADRADA (`imageRatio` = 1/1): ahí la máscara no recorta el encuadre, solo las esquinas, y
-- la cúpula sale circular. Con una foto apaisada (3/2, 4/3) la cúpula saldría ovalada, así que
-- esas no se tocan.
--
-- Solo datos de `templates`. Idempotente.
-- ============================================================================

update public.templates t
set modules_config = (
  select jsonb_agg(
           case when m->>'module_type' = 'hero'
                then jsonb_set(m, '{config,imageShape}', '"arch"'::jsonb)
                else m end
           order by ord)
  from jsonb_array_elements(t.modules_config) with ordinality as e(m, ord)
)
where t.slug in (
  'bautizo-cera-blanca',
  'boda-marco-nuestro',
  'boda-papel-y-lino',
  'comunion-cinta',
  'revelacion-coral',
  'xv-corona'
);
