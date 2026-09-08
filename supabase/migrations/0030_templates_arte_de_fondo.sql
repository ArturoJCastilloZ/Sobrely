-- ============================================================================
-- 0030 — Asignar una direccion de ARTE de fondo a cada plantilla
-- ============================================================================
--
-- Cierra la parte visual de la Fase 4: las plantillas dejan de ser color plano
-- mas texto y pasan a tener una capa de arte a sangre debajo, que es lo que
-- hace que un catalogo de un producto de diseno se vea disenado.
--
-- El arte entra por `theme_config.backgroundImage`, que YA EXISTIA en el
-- esquema, asi que no hace falta ninguna columna nueva y hereda el telon
-- sticky de la migracion del fondo relativo.
--
-- Comprobado leyendo la linea ejecutable antes de escribir esto:
-- `applyThemePack` y `applyStylePreset` hacen `...theme` y solo pisan colores,
-- fuente, espaciado, modo, decoracion y animacion. NINGUNO toca
-- `backgroundImage`, asi que el arte sobrevive a la expansion del pack.
--
-- ---------------------------------------------------------------------------
-- COMO SE ELIGIO CADA UNA, porque no es gusto
-- ---------------------------------------------------------------------------
--
-- El arte se empareja por TIPO DE EVENTO y por POLARIDAD DEL TEXTO. La
-- polaridad es la restriccion dura: la Fase 0 derivo el contraste del texto
-- contra el color de fondo PLANO, y con una imagen detras el fondo pasa a ser
-- un rango de luminancias, asi que esa garantia deja de valer.
-- `scripts/verificar-contraste-arte.mts` mide cada arte contra el peor pixel
-- de su banda central y dice que polaridad admite; `src/lib/theme/arte.ts` la
-- declara y el script falla si no coinciden.
--
-- Dato que reordeno el trabajo, medido sobre los 20 packs: SOLO UNO
-- (`noche-estelar`) tiene texto claro; los otros 19 son texto oscuro sobre
-- fondo claro, y 20 de las 50 plantillas no traen pack, asi que usan el tema
-- por defecto, tambien claro. O sea que el catalogo es 96% de tema claro y
-- solo DOS plantillas pueden llevar arte de fondo oscuro: `xv-noche-estelar` y
-- `xv-produccion-completa`. Se les asignan las dos unicas artes claras.
--
-- El `overlay` de las fotos no es estetico: es el velo MINIMO medido para que
-- el peor pixel llegue a WCAG AA. Desnudas daban 4.15, 3.44 y 2.37 — ninguna
-- admitia texto legible. Las tres fotos son de Pexels, DESCARGADAS y
-- auto-hospedadas (nunca se enlaza a su CDN: seria phone-home en runtime), sin
-- ninguna cara identificable, y con su procedencia en
-- `public/arte/PROCEDENCIA.md`.
--
-- Se escriben las 50 sentencias explicitas y no una regla derivada del slug
-- porque la asignacion es una DECISION de diseno por plantilla, no algo
-- calculable. La de las miniaturas (`0029`) si se derivaba, y por eso alli va
-- derivada.
--
-- Quedan dos artes sin usar (`cumple-neon` y `corp-noche`, las dos de fondo
-- oscuro): ninguna plantilla de cumpleanos ni de corporativo usa un pack
-- oscuro. Se conservan para cuando el Theme System de la Fase 7 los anada.
-- ============================================================================

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/revelacion-acuarela.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/baby-cielo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-animalitos' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/revelacion-acuarela.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-completo' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/baby-cielo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-con-video' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/revelacion-acuarela.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-mesa-regalos' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/baby-cielo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-neutro' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/revelacion-acuarela.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-nubes' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/baby-cielo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-revelacion' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/revelacion-acuarela.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-salvia' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/baby-cielo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'baby-shower-sencillo' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/boda-botanica.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'boda-botanica' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/boda-lino-sello.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'boda-carta-romantica' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/foto/boda-marco-floral.jpg", "overlay": 0.1}'::jsonb, true)
 where slug = 'boda-cinematografica' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/boda-botanica.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'boda-de-lujo' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/boda-lino-sello.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'boda-destino' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/foto/boda-marco-floral.jpg", "overlay": 0.1}'::jsonb, true)
 where slug = 'boda-elegante' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/boda-botanica.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'boda-en-la-playa' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/boda-lino-sello.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'boda-jardin' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/foto/boda-marco-floral.jpg", "overlay": 0.1}'::jsonb, true)
 where slug = 'boda-minimalista' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/boda-botanica.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'boda-terracota' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-lineas.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-cena-fin-de-ano' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-papel.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-completo' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-lineas.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-con-sede' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-papel.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-conferencia-agenda' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-lineas.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-congreso-video' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-papel.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-junta-resultados' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-lineas.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-lanzamiento' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-papel.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-sencillo' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-lineas.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'corporativo-taller' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-confeti.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-adulto' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-guirnalda.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-con-video' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-confeti.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-dinosaurios' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-guirnalda.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-futbol' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-confeti.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-galaxia' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-guirnalda.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-infantil' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-confeti.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-kawaii' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-guirnalda.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-moderno' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-confeti.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-sencillo' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/cumple-guirnalda.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'cumpleanos-superheroes' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/corp-papel.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'evento-corporativo' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/xv-rosa-polvo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'xv-anos' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/foto/xv-brillo-rosa.jpg", "overlay": 0.35}'::jsonb, true)
 where slug = 'xv-clasicos-elegantes' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/xv-rosa-polvo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'xv-con-salon' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/foto/xv-brillo-rosa.jpg", "overlay": 0.35}'::jsonb, true)
 where slug = 'xv-con-sesion' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/xv-rosa-polvo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'xv-con-video' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/foto/xv-brillo-rosa.jpg", "overlay": 0.35}'::jsonb, true)
 where slug = 'xv-glam-moderno' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/xv-rosa-polvo.svg", "overlay": 0.05}'::jsonb, true)
 where slug = 'xv-manuscrita' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/xv-noche-oro.svg", "overlay": 0}'::jsonb, true)
 where slug = 'xv-noche-estelar' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/foto/xv-seda-rosa.jpg", "overlay": 0.2}'::jsonb, true)
 where slug = 'xv-produccion-completa' and is_active;

update public.templates set theme_config = jsonb_set(
         coalesce(theme_config, '{}'::jsonb), '{backgroundImage}',
         '{"url": "/arte/foto/xv-brillo-rosa.jpg", "overlay": 0.35}'::jsonb, true)
 where slug = 'xv-sencillos' and is_active;

-- ============================================================================
-- Verificacion:
--
--   select count(*) as con_arte from public.templates
--    where is_active and theme_config->'backgroundImage'->>'url' <> '';
--   -- debe ser 50
--
--   select theme_config->'backgroundImage'->>'url' as arte, count(*)
--     from public.templates where is_active
--    group by 1 order by 2 desc;
--   -- 13 artes distintas, ninguna con mas de 5 plantillas
--
-- Despues hay que REGENERAR las miniaturas:
--   node scripts/capturar-miniaturas.mts
-- ============================================================================
