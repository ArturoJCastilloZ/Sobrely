-- ============================================================================
-- 0068 — Legibilidad de dos plantillas, cuerpo legible en dos plantillas con fuente
--        manuscrita y fondo crema para la plantilla piloto de eucalipto
-- ============================================================================
--
-- Solo datos de `templates`. No cambia el esquema. Idempotente: cada UPDATE deja el mismo
-- resultado si se repite.
--
-- 1. `revelacion-dos-sobres`: el texto blanco de la portada sobre la fotografía de tinta medía
--    entre 3.77 y 4.02 contra 4.5 (WCAG AA). Un velo en el fondo de la invitación no lo arreglaba
--    (el medidor lo declaró «ni al 95 %»), pero la fotografía es de la PORTADA, así que se
--    sube el velo de la portada. Medido en el navegador antes y después con
--    `scripts/verificar-contraste-en-vivo.mts`.
--
-- 2. `boda-carta-romantica` y `xv-manuscrita`: son las dos únicas plantillas (de 65) con el cuerpo
--    del texto en una fuente manuscrita (Dancing Script): un párrafo entero en script no se lee a
--    media luz. Se les pone un par tipográfico: los titulares siguen en manuscrita y el cuerpo
--    pasa a Lora. Las otras 12 plantillas con titular manuscrito ya traen el cuerpo en serif o sans.
--
-- 3. `boda-acuarela-eucalipto` (plantilla piloto de la 0067): se sustituye la ilustración por la
--    de la ronda 2 (adorno solo en bordes y esquinas, centro vacío de arriba abajo) y el tema
--    pasa a crema con acento dorado, el color de fondo de la nueva imagen.
-- ============================================================================

-- 1. Velo de la portada de revelacion-dos-sobres
update public.templates t
set modules_config = (
  select jsonb_agg(
           case when m->>'module_type' = 'hero'
                then jsonb_set(m, '{config,overlay}', '0.65'::jsonb)
                else m end
           order by ord)
  from jsonb_array_elements(t.modules_config) with ordinality as e(m, ord)
)
where t.slug = 'revelacion-dos-sobres';

-- 2. Cuerpo legible en las dos plantillas manuscritas
update public.templates
set theme_config = jsonb_set(theme_config, '{typography}', '{"heading":"script","body":"literary"}'::jsonb)
where slug in ('boda-carta-romantica', 'xv-manuscrita');

-- 3. Eucalipto: crema y dorado, con la ilustración de la ronda 2
update public.templates
set description = 'Ramas de eucalipto, flor blanca y toques dorados pintados a mano, sobre crema.',
    theme_config = jsonb_build_object(
      'font', 'serif',
      'spacing', 'normal',
      'colors', jsonb_build_object('text', '#2f3a2e', 'primary', '#4b7f52', 'secondary', '#b08d57', 'background', '#fbf6ec'),
      'backgroundImage', jsonb_build_object('url', '/arte/ia/boda-acuarela-eucalipto.webp', 'overlay', 0)
    )
where slug = 'boda-acuarela-eucalipto';
