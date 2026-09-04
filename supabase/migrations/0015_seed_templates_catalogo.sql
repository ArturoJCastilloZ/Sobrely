-- ============================================================================
-- 0015_seed_templates_catalogo.sql — el catálogo de plantillas sube a 10 por tipo
--
-- `0003` sembró 5 plantillas, una por tipo de evento, y las CINCO usaban
-- exactamente los mismos 4 módulos: hero, countdown, map y rsvp. Dos problemas
-- en uno:
--
--   1. Catálogo. El competidor directo ofrece 10-11 diseños por tipo de evento;
--      Sobrely ofrecía 1.
--   2. Monetización. `map` es de Esencial y todo lo demás de esos templates es
--      de Free, así que NINGUNA plantilla de arranque mostraba un módulo de
--      Celebración (`gallery`, `itinerary`, `dresscode`, `music`) ni de Premium
--      (`video`). El usuario nunca veía por qué pagaría el plan de arriba, y el
--      CTA de upgrade que `minimalPlanForModules` ya sabe disparar no se
--      activaba nunca.
--
-- Esta migración agrega 45 plantillas con una ESCALERA deliberada por tipo de
-- evento: 2 que caben en Free, 2 en Esencial, 4 en Celebración y 2 en Premium.
-- Así el catálogo mismo es el camino de upgrade, sin código nuevo.
--
-- Nota sobre `theme_config`: las plantillas de Free y Esencial NO declaran
-- `themePack` — un pack premium exige la feature `advanced_personalization`
-- (Celebración+), así que ponerlo ahí volvería impublicable la plantilla para
-- quien la eligió. Esas llevan colores, tipografía y espaciado explícitos.
--
-- Los `config` traen contenido real (itinerarios con horas, códigos de
-- vestimenta redactados, textos de mesa de regalos) porque una plantilla con
-- módulos vacíos no le muestra al usuario para qué sirven. Las listas de
-- imágenes y las URLs van vacías: las llena el usuario.
--
-- Idempotente: `on conflict (slug) do nothing`, igual que 0003. Las 5
-- plantillas originales se conservan intactas.
-- ============================================================================

insert into public.templates (name, slug, description, event_type, theme_config, modules_config, is_active)
values
  (
    'Boda minimalista',
    'boda-minimalista',
    'Blanco, negro y un acento. Sin adornos, todo tipografía.',
    'Boda',
    '{"colors":{"primary":"#111111","secondary":"#6b7280","background":"#ffffff","text":"#111111"},"font":"sans","spacing":"relaxed"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Ana & Carlos","subtitle":"Nos casamos","imageUrl":"","ctaLabel":"Ver invitación"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Nos da mucha alegría","message":"Después de tantos años juntos, queremos celebrar este día con las personas que más queremos. Gracias por acompañarnos."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Nos vemos en","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"¿Nos acompañas?","description":"Confírmanos antes del 1 de agosto para apartar tu lugar.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Boda carta romántica',
    'boda-carta-romantica',
    'Tipografía manuscrita y tono cálido, como una carta escrita a mano.',
    'Boda',
    '{"colors":{"primary":"#9c6b5f","secondary":"#d9b8a7","background":"#fdf8f4","text":"#3b2f2a"},"font":"script","spacing":"relaxed"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mariana & Diego","subtitle":"¡Nos casamos!","imageUrl":"","ctaLabel":"Acompáñanos"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Con todo el corazón","message":"Queremos compartir contigo el día en que unimos nuestras vidas. Tu presencia hará este momento inolvidable."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"Nos encantaría contar contigo.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Boda jardín',
    'boda-jardin',
    'Verdes suaves y ubicación al frente, para bodas al aire libre.',
    'Boda',
    '{"colors":{"primary":"#4b7f52","secondary":"#a8c4a2","background":"#f7faf5","text":"#243027"},"font":"serif","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nuestra boda","subtitle":"Te esperamos en el jardín","imageUrl":"","ctaLabel":"Ver detalles"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bajo el cielo abierto","message":"Escogimos un lugar rodeado de árboles para celebrar. Te recomendamos calzado cómodo."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ceremonia y recepción","venueName":"Jardín Las Flores","address":""}},
      {"module_type":"gifts","sort_order":4,"is_visible":true,"config":{"title":"Lluvia de sobres","description":"Si gustas apoyarnos, habrá un buzón para sobres en la entrada.","links":[]}},
      {"module_type":"rsvp","sort_order":5,"is_visible":true,"config":{"title":"Confírmanos","description":"El jardín tiene cupo limitado, ayúdanos confirmando a tiempo.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Boda de lujo',
    'boda-de-lujo',
    'Dorados y negro con itinerario, galería y código de etiqueta.',
    'Boda',
    '{"themePack":"boda-lujo"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Valeria & Alejandro","subtitle":"Nos casamos","imageUrl":"","ctaLabel":"Ver invitación"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Una noche para recordar","message":"Nos encantaría que fueras parte de esta celebración."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ceremonia y recepción","venueName":"Hacienda San Gabriel","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Nuestra historia","images":[],"layout":"carousel","lightbox":true,"kenBurns":true}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Itinerario del día","items":[{"time":"17:00","label":"Ceremonia religiosa"},{"time":"18:30","label":"Sesión de fotos"},{"time":"19:30","label":"Recepción y cóctel"},{"time":"21:00","label":"Cena"},{"time":"22:30","label":"Primer baile"},{"time":"23:00","label":"¡Fiesta!"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"etiqueta","description":"Etiqueta rigurosa. Ellas vestido largo, ellos smoking.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Nuestra playlist","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Tu presencia es nuestro mejor regalo. Si quieres consentirnos, aquí te dejamos algunas opciones.","links":[{"label":"Liverpool","url":""},{"label":"Amazon","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"Por favor confirma antes del 1 de agosto.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Boda botánica',
    'boda-botanica',
    'Follaje y eucalipto, con itinerario y galería en mosaico.',
    'Boda',
    '{"themePack":"botanico-greenery"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nuestra boda","subtitle":"Entre hojas y flores","imageUrl":"","ctaLabel":"Acompáñanos"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Gracias por venir","message":"Queremos celebrar rodeados de naturaleza y de la gente que queremos."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"Vivero Los Encinos","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Momentos","images":[],"layout":"masonry","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Programa","items":[{"time":"17:00","label":"Ceremonia religiosa"},{"time":"18:30","label":"Sesión de fotos"},{"time":"19:30","label":"Recepción y cóctel"},{"time":"21:00","label":"Cena"},{"time":"22:30","label":"Primer baile"},{"time":"23:00","label":"¡Fiesta!"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"Formal en tonos tierra y verdes. Evita el blanco.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"La música del día","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Tu presencia es nuestro mejor regalo. Si quieres consentirnos, aquí te dejamos algunas opciones.","links":[{"label":"Liverpool","url":""},{"label":"Amazon","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"¿Nos acompañas?","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Boda en la playa',
    'boda-en-la-playa',
    'Turquesa y arena, con itinerario de fin de semana y galería.',
    'Boda',
    '{"themePack":"tropical"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nos casamos en la playa","subtitle":"Ven a celebrar con los pies en la arena","imageUrl":"","ctaLabel":"Ver detalles"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Nos vamos al mar","message":"Prepara bloqueador y muchas ganas de bailar. Te esperamos frente al mar."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ceremonia","venueName":"Playa Los Cocos","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"El lugar","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Fin de semana","items":[{"time":"Viernes 19:00","label":"Cóctel de bienvenida"},{"time":"Sábado 17:30","label":"Ceremonia en la playa"},{"time":"Sábado 19:00","label":"Cena y fiesta"},{"time":"Domingo 11:00","label":"Desayuno de despedida"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"semi-formal","description":"Formal playero: lino, colores claros y sin tacón de aguja.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Playlist","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Lluvia de sobres","description":"Si gustas apoyarnos, habrá un buzón para sobres en la entrada.","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"Confírmanos con tiempo para reservar hospedaje.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Boda terracota',
    'boda-terracota',
    'Otoñal en terracota y ocre, con itinerario y mesa de regalos.',
    'Boda',
    '{"themePack":"terracota-otono"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nuestra boda","subtitle":"Otoño de 2026","imageUrl":"","ctaLabel":"Ver invitación"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos","message":"Celebramos en la temporada que más nos gusta, con los colores del otoño."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"Ex Hacienda del Carmen","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"collage","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Itinerario","items":[{"time":"17:00","label":"Ceremonia religiosa"},{"time":"18:30","label":"Sesión de fotos"},{"time":"19:30","label":"Recepción y cóctel"},{"time":"21:00","label":"Cena"},{"time":"22:30","label":"Primer baile"},{"time":"23:00","label":"¡Fiesta!"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"Formal en tonos cálidos: terracota, mostaza, café.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Tu presencia es nuestro mejor regalo. Si quieres consentirnos, aquí te dejamos algunas opciones.","links":[{"label":"Liverpool","url":""},{"label":"Amazon","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Boda cinematográfica',
    'boda-cinematografica',
    'Con video de la pareja, galería y todo el itinerario.',
    'Boda',
    '{"themePack":"boda-lujo"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nuestra boda","subtitle":"Una historia que empieza","imageUrl":"","ctaLabel":"Ver el video"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Nuestra historia","message":"Grabamos un video para contarte cómo llegamos hasta aquí. Ponle volumen."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ceremonia y recepción","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Sesión de fotos","images":[],"layout":"carousel","lightbox":true,"kenBurns":true}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Nuestro video","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Itinerario","items":[{"time":"17:00","label":"Ceremonia religiosa"},{"time":"18:30","label":"Sesión de fotos"},{"time":"19:30","label":"Recepción y cóctel"},{"time":"21:00","label":"Cena"},{"time":"22:30","label":"Primer baile"},{"time":"23:00","label":"¡Fiesta!"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"etiqueta","description":"Etiqueta. Ellas vestido largo, ellos smoking.","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Nuestra canción","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Tu presencia es nuestro mejor regalo. Si quieres consentirnos, aquí te dejamos algunas opciones.","links":[{"label":"Liverpool","url":""},{"label":"Amazon","url":""}]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Boda destino',
    'boda-destino',
    'Para boda fuera de la ciudad: video, hospedaje e itinerario largo.',
    'Boda',
    '{"themePack":"tropical"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nos casamos","subtitle":"Te esperamos en la costa","imageUrl":"","ctaLabel":"Ver todo"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Un viaje juntos","message":"Sabemos que venir implica un viaje, y por eso agradecemos el doble que nos acompañes. Aquí están todos los detalles."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Sede","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"El destino","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Cómo llegar","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Programa de tres días","items":[{"time":"Día 1 · 18:00","label":"Bienvenida"},{"time":"Día 2 · 12:00","label":"Actividades"},{"time":"Día 2 · 17:00","label":"Ceremonia"},{"time":"Día 2 · 20:00","label":"Cena y fiesta"},{"time":"Día 3 · 11:00","label":"Brunch de despedida"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"semi-formal","description":"Cada evento tiene su código, lo detallamos en el itinerario.","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Playlist del viaje","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Lluvia de sobres","description":"Si gustas apoyarnos, habrá un buzón para sobres en la entrada.","links":[]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"Necesitamos tu confirmación con al menos dos meses de anticipación.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV sencillos',
    'xv-sencillos',
    'Limpio y juvenil, solo lo esencial.',
    'XV años',
    '{"colors":{"primary":"#be185d","secondary":"#f9a8d4","background":"#fff7fa","text":"#3f1d2b"},"font":"sans","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV años","subtitle":"Sofía","imageUrl":"","ctaLabel":"Te espero"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"¡Hola!","message":"Cumplo quince y quiero celebrarlo contigo. Me haría muy feliz que me acompañaras."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"¿Vienes?","description":"Confírmame para apartar tu lugar.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV manuscrita',
    'xv-manuscrita',
    'Letra manuscrita y rosa empolvado.',
    'XV años',
    '{"colors":{"primary":"#a21caf","secondary":"#e9d5ff","background":"#fdf9ff","text":"#3b0764"},"font":"script","spacing":"relaxed"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV","subtitle":"Regina","imageUrl":"","ctaLabel":"Acompáñame"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Te invito","message":"Este día es muy importante para mí y quiero compartirlo con las personas que quiero."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV con salón',
    'xv-con-salon',
    'Con ubicación del salón y lluvia de sobres.',
    'XV años',
    '{"colors":{"primary":"#7c3aed","secondary":"#c4b5fd","background":"#faf8ff","text":"#2e1065"},"font":"elegant","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV años","subtitle":"Te espero para celebrar","imageUrl":"","ctaLabel":"Ver detalles"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos","message":"Gracias por ser parte de este día tan especial."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Salón de eventos","venueName":"","address":""}},
      {"module_type":"gifts","sort_order":4,"is_visible":true,"config":{"title":"Lluvia de sobres","description":"Si gustas apoyarnos, habrá un buzón para sobres en la entrada.","links":[]}},
      {"module_type":"rsvp","sort_order":5,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV clásicos',
    'xv-clasicos-elegantes',
    'Elegancia tradicional con misa, vals e itinerario completo.',
    'XV años',
    '{"themePack":"xv-clasico"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV años","subtitle":"Valentina","imageUrl":"","ctaLabel":"Ver invitación"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Con mucho cariño","message":"Acompáñame a dar gracias y a celebrar mis quince años."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Misa y recepción","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Mi sesión de fotos","images":[],"layout":"carousel","lightbox":true,"kenBurns":true}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Programa","items":[{"time":"18:00","label":"Misa de acción de gracias"},{"time":"19:30","label":"Recepción"},{"time":"20:30","label":"Vals"},{"time":"21:00","label":"Cena"},{"time":"22:00","label":"Baile sorpresa"},{"time":"22:30","label":"Fiesta"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"Formal. Te pido evitar el color del vestido de la quinceañera.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Mi playlist","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Lo más importante es que me acompañes. Si deseas obsequiarme algo, aquí te dejo mis mesas.","links":[{"label":"Liverpool","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV glam',
    'xv-glam-moderno',
    'Neones y brillos, con galería y baile sorpresa en el itinerario.',
    'XV años',
    '{"themePack":"xv-glam"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"XV","subtitle":"Prepárate para bailar","imageUrl":"","ctaLabel":"Entra"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Va a estar increíble","message":"Ven con toda la actitud: habrá baile sorpresa y fiesta hasta tarde."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"¿Dónde?","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"La noche","items":[{"time":"18:00","label":"Misa de acción de gracias"},{"time":"19:30","label":"Recepción"},{"time":"20:30","label":"Vals"},{"time":"21:00","label":"Cena"},{"time":"22:00","label":"Baile sorpresa"},{"time":"22:30","label":"Fiesta"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"semi-formal","description":"Semi-formal con brillos. Trae zapatos para bailar.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"La playlist","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Lluvia de sobres","description":"Si gustas apoyarnos, habrá un buzón para sobres en la entrada.","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"¿Vienes?","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV noche estelar',
    'xv-noche-estelar',
    'Fondo oscuro con estrellas, para fiesta de noche.',
    'XV años',
    '{"themePack":"noche-estelar"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV años","subtitle":"Una noche entre estrellas","imageUrl":"","ctaLabel":"Ver más"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bajo las estrellas","message":"Quiero celebrar mis quince en una noche que no se olvide."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Mis fotos","images":[],"layout":"masonry","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Itinerario","items":[{"time":"18:00","label":"Misa de acción de gracias"},{"time":"19:30","label":"Recepción"},{"time":"20:30","label":"Vals"},{"time":"21:00","label":"Cena"},{"time":"22:00","label":"Baile sorpresa"},{"time":"22:30","label":"Fiesta"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"Formal en tonos oscuros: azul noche, negro, vino.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Lo más importante es que me acompañes. Si deseas obsequiarme algo, aquí te dejo mis mesas.","links":[{"label":"Liverpool","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV con quinceañera',
    'xv-con-sesion',
    'Pensada alrededor de la sesión de fotos y la galería.',
    'XV años',
    '{"themePack":"xv-clasico"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV años","subtitle":"","imageUrl":"","ctaLabel":"Ver mi sesión"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Mi sesión de fotos","message":"Quise compartirte algunas fotos antes del gran día."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Recepción","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Sesión de fotos","images":[],"layout":"collage","lightbox":true,"kenBurns":true}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Programa","items":[{"time":"18:00","label":"Misa de acción de gracias"},{"time":"19:30","label":"Recepción"},{"time":"20:30","label":"Vals"},{"time":"21:00","label":"Cena"},{"time":"22:00","label":"Baile sorpresa"},{"time":"22:30","label":"Fiesta"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Mi canción del vals","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Lo más importante es que me acompañes. Si deseas obsequiarme algo, aquí te dejo mis mesas.","links":[{"label":"Liverpool","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV con video',
    'xv-con-video',
    'Incluye video de invitación y sesión completa.',
    'XV años',
    '{"themePack":"xv-glam"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV años","subtitle":"Te invito con un video","imageUrl":"","ctaLabel":"Ver el video"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Mi invitación","message":"Grabé un video para invitarte. ¡Espero verte ahí!"}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Mi sesión","images":[],"layout":"carousel","lightbox":true,"kenBurns":true}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Mi invitación en video","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Programa","items":[{"time":"18:00","label":"Misa de acción de gracias"},{"time":"19:30","label":"Recepción"},{"time":"20:30","label":"Vals"},{"time":"21:00","label":"Cena"},{"time":"22:00","label":"Baile sorpresa"},{"time":"22:30","label":"Fiesta"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Mi playlist","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Lo más importante es que me acompañes. Si deseas obsequiarme algo, aquí te dejo mis mesas.","links":[{"label":"Liverpool","url":""}]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV producción completa',
    'xv-produccion-completa',
    'Todo activado: video, galería, itinerario, vestimenta y música.',
    'XV años',
    '{"themePack":"noche-estelar"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV años","subtitle":"La celebración completa","imageUrl":"","ctaLabel":"Ver todo"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos","message":"Aquí encontrarás todos los detalles: horarios, ubicación, código de vestimenta y más."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Misa y recepción","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"masonry","lightbox":true,"kenBurns":false}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Video de invitación","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Itinerario completo","items":[{"time":"18:00","label":"Misa de acción de gracias"},{"time":"19:30","label":"Recepción"},{"time":"20:30","label":"Vals"},{"time":"21:00","label":"Cena"},{"time":"22:00","label":"Baile sorpresa"},{"time":"22:30","label":"Fiesta"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"etiqueta","description":"Etiqueta. Vestido largo y traje oscuro.","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Playlist de la fiesta","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Lo más importante es que me acompañes. Si deseas obsequiarme algo, aquí te dejo mis mesas.","links":[{"label":"Liverpool","url":""}]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños sencillo',
    'cumpleanos-sencillo',
    'Directo al punto: qué, cuándo y confirma.',
    'Cumpleaños',
    '{"colors":{"primary":"#e11d48","secondary":"#fda4af","background":"#ffffff","text":"#111111"},"font":"sans","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¡Es mi cumpleaños!","subtitle":"Ven a celebrar conmigo","imageUrl":"","ctaLabel":"¡Vamos!"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Te invito","message":"Voy a festejar y quiero que estés ahí. Nada formal, solo buena compañía."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"¿Te veo ahí?","description":"Confírmame para saber cuánta comida pedir.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños adulto',
    'cumpleanos-adulto',
    'Sobrio y elegante, para cumpleaños de adultos.',
    'Cumpleaños',
    '{"colors":{"primary":"#1f2937","secondary":"#9ca3af","background":"#f9fafb","text":"#111827"},"font":"serif","spacing":"relaxed"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Cumplo años","subtitle":"Y quiero celebrarlo contigo","imageUrl":"","ctaLabel":"Ver detalles"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Una cena entre amigos","message":"Sin fiesta grande: solo buena mesa y la gente que aprecio."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"Necesito el número exacto para reservar.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños infantil',
    'cumpleanos-infantil',
    'Colorido y tierno, con ubicación y mesa de regalos.',
    'Cumpleaños',
    '{"colors":{"primary":"#f59e0b","secondary":"#fcd34d","background":"#fffbeb","text":"#422006"},"font":"sans","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¡Cumplo años!","subtitle":"Ven a mi fiesta","imageUrl":"","ctaLabel":"¡Sí voy!"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"¡Va a haber pastel!","message":"Habrá juegos, piñata y mucho por hacer. Trae ropa cómoda."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"¿Dónde es?","venueName":"","address":""}},
      {"module_type":"gifts","sort_order":4,"is_visible":true,"config":{"title":"Regalos","description":"Si quieres traerme algo, aquí van algunas ideas.","links":[]}},
      {"module_type":"rsvp","sort_order":5,"is_visible":true,"config":{"title":"¿Vienes?","description":"Confírmanos cuántos niños vienen.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños superhéroes',
    'cumpleanos-superheroes',
    'Temática de superhéroes con itinerario y galería.',
    'Cumpleaños',
    '{"themePack":"superheroe"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¡Misión cumpleaños!","subtitle":"Te necesitamos en el equipo","imageUrl":"","ctaLabel":"Acepto la misión"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Reúne al escuadrón","message":"Habrá juegos, retos y pastel. Ven con tu disfraz favorito."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Base de operaciones","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Plan de la fiesta","items":[{"time":"14:00","label":"Bienvenida"},{"time":"15:00","label":"Comida"},{"time":"16:30","label":"Juegos y actividades"},{"time":"17:30","label":"Pastel y mañanitas"},{"time":"18:30","label":"Piñata"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"custom","description":"¡Ven disfrazado de tu superhéroe favorito!","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Regalos","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"¿Aceptas la misión?","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños galaxia',
    'cumpleanos-galaxia',
    'Espacio y planetas, con itinerario y galería.',
    'Cumpleaños',
    '{"themePack":"galaxia"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¡Despegamos!","subtitle":"Mi fiesta espacial","imageUrl":"","ctaLabel":"Súbete a la nave"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Rumbo al espacio","message":"Prepárate para una fiesta fuera de este mundo."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Punto de despegue","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"masonry","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Plan de vuelo","items":[{"time":"14:00","label":"Bienvenida"},{"time":"15:00","label":"Comida"},{"time":"16:30","label":"Juegos y actividades"},{"time":"17:30","label":"Pastel y mañanitas"},{"time":"18:30","label":"Piñata"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"Cómodo, con algo plateado o brillante si se te antoja.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Regalos","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"¿Vienes?","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños kawaii',
    'cumpleanos-kawaii',
    'Pasteles y animalitos, para los más pequeños.',
    'Cumpleaños',
    '{"themePack":"kawaii"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¡Es mi fiesta!","subtitle":"Ven a jugar conmigo","imageUrl":"","ctaLabel":"¡Sí voy!"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"¡Hola!","message":"Habrá juegos, pastel y muchos animalitos."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"¿Dónde?","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Fotos","images":[],"layout":"collage","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"La fiesta","items":[{"time":"14:00","label":"Bienvenida"},{"time":"15:00","label":"Comida"},{"time":"16:30","label":"Juegos y actividades"},{"time":"17:30","label":"Pastel y mañanitas"},{"time":"18:30","label":"Piñata"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"Ropa cómoda para jugar.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Regalos","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"¿Vienes?","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños dinosaurios',
    'cumpleanos-dinosaurios',
    'Prehistórico y verde, con plan de la fiesta.',
    'Cumpleaños',
    '{"themePack":"dinos"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¡Fiesta jurásica!","subtitle":"Ven a rugir conmigo","imageUrl":"","ctaLabel":"¡Rawr!"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos al valle","message":"Habrá excavación de fósiles, juegos y pastel."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"El valle","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Plan del día","items":[{"time":"14:00","label":"Bienvenida"},{"time":"15:00","label":"Comida"},{"time":"16:30","label":"Juegos y actividades"},{"time":"17:30","label":"Pastel y mañanitas"},{"time":"18:30","label":"Piñata"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"Ropa que se pueda ensuciar.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Regalos","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"¿Vienes?","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños fútbol',
    'cumpleanos-futbol',
    'Para fanáticos del fútbol, con video y galería.',
    'Cumpleaños',
    '{"themePack":"futbol"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¡Vamos al partido!","subtitle":"Mi cumpleaños","imageUrl":"","ctaLabel":"Entra a la cancha"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Arma tu equipo","message":"Habrá cascarita, pastel y premios. Trae tenis."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"La cancha","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Video de invitación","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Programa","items":[{"time":"14:00","label":"Bienvenida"},{"time":"15:00","label":"Comida"},{"time":"16:30","label":"Juegos y actividades"},{"time":"17:30","label":"Pastel y mañanitas"},{"time":"18:30","label":"Piñata"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"custom","description":"Ven con la camiseta de tu equipo.","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Regalos","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"¿Juegas?","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños con video',
    'cumpleanos-con-video',
    'Cumpleaños de adulto con video, galería y música.',
    'Cumpleaños',
    '{"themePack":"minimalista-moderno"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Cumplo años","subtitle":"Y lo vamos a celebrar bien","imageUrl":"","ctaLabel":"Ver el video"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Te invito","message":"Grabé un video para invitarte. Ahí te cuento el plan."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Años anteriores","images":[],"layout":"carousel","lightbox":true,"kenBurns":false}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Mi invitación","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"El plan","items":[{"time":"14:00","label":"Bienvenida"},{"time":"15:00","label":"Comida"},{"time":"16:30","label":"Juegos y actividades"},{"time":"17:30","label":"Pastel y mañanitas"},{"time":"18:30","label":"Piñata"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"semi-formal","description":"","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"La playlist","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Lluvia de sobres","description":"Si gustas apoyarnos, habrá un buzón para sobres en la entrada.","links":[]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower sencillo',
    'baby-shower-sencillo',
    'Suave y directo, solo lo necesario.',
    'Baby shower',
    '{"colors":{"primary":"#0ea5e9","secondary":"#bae6fd","background":"#f0f9ff","text":"#1f2937"},"font":"sans","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"¡Ya viene en camino!","imageUrl":"","ctaLabel":"Acompáñanos"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Estamos muy emocionados","message":"Queremos celebrar la llegada del bebé contigo."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower neutro',
    'baby-shower-neutro',
    'Tonos crema y salvia, sin color de género.',
    'Baby shower',
    '{"colors":{"primary":"#7c9070","secondary":"#cfd9c6","background":"#fbfaf6","text":"#33382f"},"font":"serif","spacing":"relaxed"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"Celebremos juntos","imageUrl":"","ctaLabel":"Ver detalles"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos","message":"Nos encantaría compartir esta etapa contigo."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower con mesa de regalos',
    'baby-shower-mesa-regalos',
    'Con ubicación y mesa de regalos al frente.',
    'Baby shower',
    '{"colors":{"primary":"#f472b6","secondary":"#fbcfe8","background":"#fff5f9","text":"#3f1d2b"},"font":"sans","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"¡Ya casi llega!","imageUrl":"","ctaLabel":"Acompáñanos"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Gracias por venir","message":"Tu compañía en este día significa mucho para nosotros."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gifts","sort_order":4,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Registramos lo que necesita el bebé para que elijas con calma.","links":[{"label":"Mesa de regalos","url":""}]}},
      {"module_type":"rsvp","sort_order":5,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower animalitos',
    'baby-shower-animalitos',
    'Tierno con animalitos, itinerario de juegos y galería.',
    'Baby shower',
    '{"themePack":"baby-animalitos"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"Con mucho cariño","imageUrl":"","ctaLabel":"Ver invitación"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos","message":"Vamos a jugar, comer rico y consentir al bebé."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Programa","items":[{"time":"12:00","label":"Recepción de invitadas"},{"time":"13:00","label":"Comida"},{"time":"14:30","label":"Juegos"},{"time":"15:30","label":"Apertura de regalos"},{"time":"16:30","label":"Postres y despedida"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"Cómodo y en tonos claros.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Registramos lo que necesita el bebé para que elijas con calma.","links":[{"label":"Mesa de regalos","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower nubes',
    'baby-shower-nubes',
    'Celeste y nubes flotando, con juegos y galería en mosaico.',
    'Baby shower',
    '{"themePack":"baby-nubes"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"¡Ya viene!","imageUrl":"","ctaLabel":"Acompáñanos"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Qué emoción","message":"Habrá juegos, postres y muchas fotos."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"¿Dónde?","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"masonry","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"La tarde","items":[{"time":"12:00","label":"Recepción de invitadas"},{"time":"13:00","label":"Comida"},{"time":"14:30","label":"Juegos"},{"time":"15:30","label":"Apertura de regalos"},{"time":"16:30","label":"Postres y despedida"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"Colores pastel si se te antoja.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Registramos lo que necesita el bebé para que elijas con calma.","links":[{"label":"Mesa de regalos","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower revelación',
    'baby-shower-revelacion',
    'Para revelación de género, con galería e itinerario.',
    'Baby shower',
    '{"themePack":"baby-revelacion"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¿Niño o niña?","subtitle":"Ven a descubrirlo con nosotros","imageUrl":"","ctaLabel":"Quiero saber"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"El gran momento","message":"Ni nosotros sabemos todavía. Lo descubriremos todos juntos."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"collage","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Programa","items":[{"time":"12:00","label":"Recepción de invitadas"},{"time":"13:00","label":"Comida"},{"time":"14:30","label":"Juegos"},{"time":"15:30","label":"Apertura de regalos"},{"time":"16:30","label":"Postres y despedida"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"custom","description":"Ven de azul o rosa según lo que creas que será.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Registramos lo que necesita el bebé para que elijas con calma.","links":[{"label":"Mesa de regalos","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower salvia',
    'baby-shower-salvia',
    'Salvia y crema, sin color de género, con itinerario y regalos.',
    'Baby shower',
    '{"themePack":"baby-neutro"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"Con calma y cariño","imageUrl":"","ctaLabel":"Ver más"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos","message":"Queremos celebrar en corto, con la gente más cercana."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Programa","items":[{"time":"12:00","label":"Recepción de invitadas"},{"time":"13:00","label":"Comida"},{"time":"14:30","label":"Juegos"},{"time":"15:30","label":"Apertura de regalos"},{"time":"16:30","label":"Postres y despedida"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"Cómodo, en tonos neutros.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Registramos lo que necesita el bebé para que elijas con calma.","links":[{"label":"Mesa de regalos","url":""}]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower con video',
    'baby-shower-con-video',
    'Incluye video del ultrasonido o mensaje de los papás.',
    'Baby shower',
    '{"themePack":"baby-animalitos"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"Te invitamos con un video","imageUrl":"","ctaLabel":"Ver el video"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Nuestro mensaje","message":"Grabamos un video para contarte cómo va todo."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"carousel","lightbox":true,"kenBurns":true}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Nuestro video","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Programa","items":[{"time":"12:00","label":"Recepción de invitadas"},{"time":"13:00","label":"Comida"},{"time":"14:30","label":"Juegos"},{"time":"15:30","label":"Apertura de regalos"},{"time":"16:30","label":"Postres y despedida"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Registramos lo que necesita el bebé para que elijas con calma.","links":[{"label":"Mesa de regalos","url":""}]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower completo',
    'baby-shower-completo',
    'Todo activado: video, galería, juegos, vestimenta y regalos.',
    'Baby shower',
    '{"themePack":"baby-nubes"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"Todos los detalles aquí","imageUrl":"","ctaLabel":"Ver todo"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos","message":"Aquí están el horario, la ubicación y la mesa de regalos."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"masonry","lightbox":true,"kenBurns":false}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Video","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Programa completo","items":[{"time":"12:00","label":"Recepción de invitadas"},{"time":"13:00","label":"Comida"},{"time":"14:30","label":"Juegos"},{"time":"15:30","label":"Apertura de regalos"},{"time":"16:30","label":"Postres y despedida"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Mesa de regalos","description":"Registramos lo que necesita el bebé para que elijas con calma.","links":[{"label":"Mesa de regalos","url":""}]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Evento corporativo sencillo',
    'corporativo-sencillo',
    'Limpio y sobrio, con registro de asistencia.',
    'Corporativo',
    '{"colors":{"primary":"#1d4ed8","secondary":"#93c5fd","background":"#f8fafc","text":"#0f172a"},"font":"sans","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nombre del evento","subtitle":"Te invitamos a participar","imageUrl":"","ctaLabel":"Regístrate"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Acerca del evento","message":"Una sesión de trabajo para alinear objetivos y compartir resultados."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Regístrate","description":"El registro es obligatorio para el control de acceso.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Junta de resultados',
    'corporativo-junta-resultados',
    'Formato de reporte, sin adornos.',
    'Corporativo',
    '{"colors":{"primary":"#0f172a","secondary":"#64748b","background":"#ffffff","text":"#0f172a"},"font":"serif","spacing":"compact"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Junta anual de resultados","subtitle":"","imageUrl":"","ctaLabel":"Confirmar"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Objetivo de la sesión","message":"Presentar los resultados del año y las prioridades del siguiente."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Evento con sede',
    'corporativo-con-sede',
    'Con ubicación de la sede y datos de acceso.',
    'Corporativo',
    '{"colors":{"primary":"#0369a1","secondary":"#7dd3fc","background":"#f0f9ff","text":"#0c2233"},"font":"sans","spacing":"normal"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nombre del evento","subtitle":"Te esperamos","imageUrl":"","ctaLabel":"Regístrate"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Información general","message":"Habrá estacionamiento disponible. Presenta tu pase en la entrada."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Sede","venueName":"","address":""}},
      {"module_type":"gifts","sort_order":4,"is_visible":true,"config":{"title":"Material del evento","description":"Al finalizar te entregamos la documentación.","links":[]}},
      {"module_type":"rsvp","sort_order":5,"is_visible":true,"config":{"title":"Regístrate","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Conferencia con agenda',
    'corporativo-conferencia-agenda',
    'Agenda por horas, galería y código de vestimenta.',
    'Corporativo',
    '{"themePack":"corporativo-limpio"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Conferencia Anual","subtitle":"Un día de contenido y networking","imageUrl":"","ctaLabel":"Ver agenda"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Sobre el evento","message":"Ponencias, mesas de trabajo y espacio para conectar con colegas."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Sede","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Ediciones anteriores","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Agenda del día","items":[{"time":"09:00","label":"Registro y café de bienvenida"},{"time":"09:30","label":"Palabras de apertura"},{"time":"10:00","label":"Conferencia principal"},{"time":"11:30","label":"Mesas de trabajo"},{"time":"13:30","label":"Comida y networking"},{"time":"15:00","label":"Cierre"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"Business casual.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Ambiente","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Material","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Regístrate","description":"Cupo limitado.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cena de fin de año',
    'corporativo-cena-fin-de-ano',
    'Para la cena de la empresa, con itinerario y vestimenta.',
    'Corporativo',
    '{"themePack":"boda-lujo"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Cena de fin de año","subtitle":"Celebremos el cierre","imageUrl":"","ctaLabel":"Confirmar"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Gracias por este año","message":"Queremos cerrar el año celebrando con todo el equipo."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Lugar","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"El año en fotos","images":[],"layout":"carousel","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Programa","items":[{"time":"20:00","label":"Recepción"},{"time":"20:45","label":"Palabras de la dirección"},{"time":"21:15","label":"Cena"},{"time":"22:30","label":"Premiaciones"},{"time":"23:00","label":"Baile"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"Formal. Es una cena de gala.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Música","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Intercambio","description":"Habrá intercambio de regalos con tope de $500.","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Taller o capacitación',
    'corporativo-taller',
    'Para talleres con cupo, agenda y material.',
    'Corporativo',
    '{"themePack":"corporativo-limpio"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Taller de capacitación","subtitle":"Cupo limitado","imageUrl":"","ctaLabel":"Inscríbete"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Qué vas a aprender","message":"Sesión práctica. Trae tu computadora."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Salón","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Talleres pasados","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Agenda","items":[{"time":"09:00","label":"Registro y café de bienvenida"},{"time":"09:30","label":"Palabras de apertura"},{"time":"10:00","label":"Conferencia principal"},{"time":"11:30","label":"Mesas de trabajo"},{"time":"13:30","label":"Comida y networking"},{"time":"15:00","label":"Cierre"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"casual","description":"Casual de oficina.","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Ambiente","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Material incluido","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Inscríbete","description":"Cupo limitado a 30 personas.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Lanzamiento de producto',
    'corporativo-lanzamiento',
    'Con galería del producto, agenda y prensa.',
    'Corporativo',
    '{"themePack":"minimalista-moderno"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Lanzamiento","subtitle":"Presentamos lo nuevo","imageUrl":"","ctaLabel":"Acompáñanos"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"El evento","message":"Presentación, demostración en vivo y espacio para preguntas."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Sede","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"El producto","images":[],"layout":"carousel","lightbox":true,"kenBurns":false}},
      {"module_type":"itinerary","sort_order":5,"is_visible":true,"config":{"title":"Programa","items":[{"time":"09:00","label":"Registro y café de bienvenida"},{"time":"09:30","label":"Palabras de apertura"},{"time":"10:00","label":"Conferencia principal"},{"time":"11:30","label":"Mesas de trabajo"},{"time":"13:30","label":"Comida y networking"},{"time":"15:00","label":"Cierre"}]}},
      {"module_type":"dresscode","sort_order":6,"is_visible":true,"config":{"title":"Código de vestimenta","level":"semi-formal","description":"","imageUrl":""}},
      {"module_type":"music","sort_order":7,"is_visible":true,"config":{"title":"Ambiente","url":""}},
      {"module_type":"gifts","sort_order":8,"is_visible":true,"config":{"title":"Kit de prensa","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":9,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Congreso con video',
    'corporativo-congreso-video',
    'Congreso con video institucional, agenda y galería.',
    'Corporativo',
    '{"themePack":"corporativo-limpio"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Congreso","subtitle":"Dos días de contenido","imageUrl":"","ctaLabel":"Ver programa"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Sobre el congreso","message":"Ponentes nacionales e internacionales, con transmisión en vivo."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Centro de convenciones","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Ediciones anteriores","images":[],"layout":"masonry","lightbox":true,"kenBurns":false}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Video institucional","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Programa","items":[{"time":"09:00","label":"Registro y café de bienvenida"},{"time":"09:30","label":"Palabras de apertura"},{"time":"10:00","label":"Conferencia principal"},{"time":"11:30","label":"Mesas de trabajo"},{"time":"13:30","label":"Comida y networking"},{"time":"15:00","label":"Cierre"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"Business formal.","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Ambiente","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Material del congreso","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Regístrate","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Evento corporativo completo',
    'corporativo-completo',
    'Todos los módulos activos, para eventos de varios días.',
    'Corporativo',
    '{"themePack":"corporativo-limpio"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nombre del evento","subtitle":"Toda la información aquí","imageUrl":"","ctaLabel":"Ver todo"}},
      {"module_type":"welcome","sort_order":1,"is_visible":true,"config":{"title":"Bienvenidos","message":"Agenda, sede, transporte y contactos en un solo lugar."}},
      {"module_type":"countdown","sort_order":2,"is_visible":true,"config":{"title":"Faltan","targetDate":"","useEventDate":true}},
      {"module_type":"map","sort_order":3,"is_visible":true,"config":{"title":"Sede","venueName":"","address":""}},
      {"module_type":"gallery","sort_order":4,"is_visible":true,"config":{"title":"Galería","images":[],"layout":"grid","lightbox":true,"kenBurns":false}},
      {"module_type":"video","sort_order":5,"is_visible":true,"config":{"title":"Video","url":""}},
      {"module_type":"itinerary","sort_order":6,"is_visible":true,"config":{"title":"Agenda completa","items":[{"time":"09:00","label":"Registro y café de bienvenida"},{"time":"09:30","label":"Palabras de apertura"},{"time":"10:00","label":"Conferencia principal"},{"time":"11:30","label":"Mesas de trabajo"},{"time":"13:30","label":"Comida y networking"},{"time":"15:00","label":"Cierre"}]}},
      {"module_type":"dresscode","sort_order":7,"is_visible":true,"config":{"title":"Código de vestimenta","level":"formal","description":"","imageUrl":""}},
      {"module_type":"music","sort_order":8,"is_visible":true,"config":{"title":"Ambiente","url":""}},
      {"module_type":"gifts","sort_order":9,"is_visible":true,"config":{"title":"Material","description":"","links":[]}},
      {"module_type":"rsvp","sort_order":10,"is_visible":true,"config":{"title":"Regístrate","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  )
on conflict (slug) do nothing;
