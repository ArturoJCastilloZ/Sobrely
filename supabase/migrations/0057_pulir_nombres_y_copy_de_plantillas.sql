-- ============================================================================
-- 0057 — Nombres editoriales para identificar el diseño antes de abrirlo
-- ============================================================================
--
-- La galería ya separa cada plantilla por arte y composición. Sin embargo,
-- nombres funcionales como «completo» o «sencillo» no ayudan a elegir una
-- estética cuando se ven 65 tarjetas a la vez. Este ajuste sólo cambia el
-- copy de catálogo: conserva slugs, módulos, temas y URLs de preview.
--
-- Una sola actualización, idempotente y acotada a las tres familias que más
-- variantes comparten. `returning` deja la aplicación verificable.
-- ============================================================================

update public.templates as t
   set name = v.name,
       description = v.description
  from (values
    -- Baby shower: el nombre describe el motivo que se ve en la portada.
    ('baby-nube-de-algodon',   'Nube de algodón',      'Fotográfica y cálida, con objetos suaves para una bienvenida íntima.'),
    ('baby-punto-y-flor',      'Flor y punto',         'Minimalismo delicado con un acento floral y espacio para los detalles.'),
    ('baby-shower',            'Cielo sereno',         'Azul suave y formas ligeras para una celebración luminosa.'),
    ('baby-shower-animalitos', 'Patitas dulces',        'Tierna y juguetona, con animalitos, juegos y galería.'),
    ('baby-shower-completo',   'Banderines celestes',   'Una celebración azul clara con todos los datos del evento a la vista.'),
    ('baby-shower-con-video',  'Móvil de cuna',         'Un diseño cálido pensado para presentar el video de la bienvenida.'),
    ('baby-shower-mesa-regalos','Regalos en rosa',      'Rosa tenue y ordenado, ideal para mesa de regalos y confirmaciones.'),
    ('baby-shower-neutro',     'Eucalipto sereno',      'Salvia y crema para una bienvenida sobria, natural y contemporánea.'),
    ('baby-shower-nubes',      'Nubes azules',          'Capas de cielo y azul pastel para un baby shower suave y moderno.'),
    ('baby-shower-revelacion', 'Rosa o azul',           'Una revelación de género clara, festiva y fácil de recorrer.'),
    ('baby-shower-salvia',     'Rama de olivo',         'Verde salvia y ramas sutiles para una celebración orgánica.'),
    ('baby-shower-sencillo',   'Punto celeste',         'La opción más limpia: puntos discretos, datos claros y buena lectura.'),

    -- Corporativo: comunica propósito y tono, no sólo cantidad de módulos.
    ('corporativo-cena-fin-de-ano',    'Cena de cierre',        'Dorado sobrio para celebrar al equipo al final del año.'),
    ('corporativo-completo',           'Foro integral',         'Agenda, sede y recursos para eventos de varios momentos.'),
    ('corporativo-con-sede',           'Jornada con sede',      'Información de acceso y ubicación con una estructura muy clara.'),
    ('corporativo-conferencia-agenda', 'Conferencia ejecutiva',  'Una agenda de alto contraste para ponencias y networking.'),
    ('corporativo-congreso-video',     'Congreso en pantalla',  'Pensado para programa, video institucional y contenido de varios días.'),
    ('corporativo-junta-resultados',   'Reporte anual',          'Editorial y directo para resultados, metas y decisiones.'),
    ('corporativo-lanzamiento',        'Estreno de producto',   'Minimalista y enfocado en la novedad, la demostración y la prensa.'),
    ('corporativo-reticula',           'Arquitectura urbana',   'Fotografía y retícula para una convocatoria contemporánea.'),
    ('corporativo-sencillo',           'Sesión ejecutiva',      'La ruta más directa para una reunión breve y profesional.'),
    ('corporativo-taller',             'Laboratorio práctico',  'Cuadrícula técnica para talleres, cupos y material de trabajo.'),
    ('evento-corporativo',             'Encuentro corporativo', 'Un punto de partida versátil para una convocatoria institucional.'),

    -- XV años: cada nombre anticipa el acento visual que verá la anfitriona.
    ('xv-anos',                'Diamantes lila',     'Rombos brillantes y lila para una fiesta clásica con energía.'),
    ('xv-clasicos-elegantes',  'Laurel clásico',     'Marcos elegantes y tono empolvado para una celebración atemporal.'),
    ('xv-con-salon',           'Arcos de salón',     'Arquitectura suave para presentar una celebración formal.'),
    ('xv-con-sesion',          'Álbum de quince',    'Rosa empolvado y marcos de foto para una sesión protagonista.'),
    ('xv-con-video',           'Lente magenta',      'Un guiño audiovisual vibrante para compartir el video de la fiesta.'),
    ('xv-corona',              'Corona editorial',   'Una portada de impacto con fotografía y joyería como protagonistas.'),
    ('xv-glam-moderno',        'Neón violeta',       'Líneas luminosas para una noche moderna y llena de energía.'),
    ('xv-manuscrita',          'Carta rosa',         'Tipografía manuscrita y espacio para un mensaje íntimo.'),
    ('xv-noche-estelar',       'Noche estelar',      'Oscura, elegante y pensada para una fiesta que continúa de noche.'),
    ('xv-produccion-completa', 'Seda carmesí',       'Textura intensa para una producción teatral y glamorosa.'),
    ('xv-seda',                'Pastel de quince',   'Fotografía cálida y un acento dulce para una invitación memorable.'),
    ('xv-sencillos',           'Rosa editorial',    'La opción limpia y sofisticada para dejar respirar cada detalle.')
  ) as v(slug, name, description)
 where t.slug = v.slug
returning t.slug, t.name, t.description;
