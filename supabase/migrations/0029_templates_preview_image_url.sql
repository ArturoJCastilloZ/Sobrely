-- ============================================================================
-- 0029 — Poblar `templates.preview_image_url` con las miniaturas capturadas
-- ============================================================================
--
-- La columna existe desde la `0001` y llevaba desde entonces en NULL: el
-- catálogo ni la pedía en su `SELECT`, así que la galería de un producto de
-- diseño no mostraba ni un diseño.
--
-- Las miniaturas son **archivos estáticos** en `public/previews/plantillas/`,
-- no objetos de Storage. Decisión del dev, y las razones:
--
--   · El bucket que existe (`invitation-images`) es de lectura pública pero
--     solo deja ESCRIBIR al dueño en su carpeta `<user_id>/…`, y una miniatura
--     de plantilla no es de ningún usuario. Habría hecho falta un bucket nuevo
--     con sus políticas.
--   · Así el generador nunca necesita la llave de servicio — puede correr en CI
--     sin un secreto de escritura, porque las plantillas activas son de lectura
--     pública por RLS.
--   · Desaparece el único riesgo que el plan declaraba: el coste de almacenar
--     70 imágenes. Medido, las 50 pesan **1.9 MB** en total.
--   · Y quedan versionadas junto al seed que las genera, así que un cambio de
--     plantilla y su miniatura entran en el mismo commit.
--
-- La ruta se DERIVA del slug en vez de escribirse a mano cincuenta veces: el
-- script guarda `<slug>.jpg`, así que una plantilla nueva solo necesita
-- correr el script y volver a aplicar esta sentencia.
--
-- Se genera con `node scripts/capturar-miniaturas.mts`, que congela el reloj
-- para que la cuenta atrás salga siempre igual y oculta el indicador de dev de
-- Next (que en la primera tanda quedó quemado en la imagen).
-- ============================================================================

update public.templates
   set preview_image_url = '/previews/plantillas/' || slug || '.jpg'
 where is_active
   and (
     preview_image_url is null
     or preview_image_url <> '/previews/plantillas/' || slug || '.jpg'
   );

-- ============================================================================
-- Verificación (criterio de aceptación de la Fase 4):
--
--   select count(*) as sin_miniatura
--     from public.templates
--    where is_active and preview_image_url is null;   -- debe ser 0
--
--   select count(*) as con_miniatura
--     from public.templates
--    where is_active and preview_image_url is not null;  -- debe ser 50
-- ============================================================================
