-- ============================================================================
-- Seed de templates prearmados (Fase 3).
-- Idempotente: on conflict (slug) do nothing. Re-ejecutable sin duplicar.
-- Cada template define theme_config y modules_config (arreglo de módulos con
-- module_type, sort_order, is_visible y config — compatible con los schemas
-- de módulos de la app).
-- ============================================================================

insert into public.templates (name, slug, description, event_type, theme_config, modules_config, is_active)
values
  (
    'Boda elegante',
    'boda-elegante',
    'Diseño sobrio y romántico para bodas.',
    'Boda',
    '{"primary":"#8a6d3b","background":"#faf7f2","text":"#2b2b2b"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Ana & Carlos","subtitle":"¡Nos casamos!","imageUrl":"","ctaLabel":"Acompáñanos"}},
      {"module_type":"countdown","sort_order":1,"is_visible":true,"config":{"title":"Faltan","targetDate":""}},
      {"module_type":"map","sort_order":2,"is_visible":true,"config":{"title":"Ceremonia y recepción","venueName":"Jardín Las Flores","address":""}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"Nos encantaría contar contigo.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Cumpleaños moderno',
    'cumpleanos-moderno',
    'Colores vivos y estilo fresco para cumpleaños.',
    'Cumpleaños',
    '{"primary":"#e11d48","background":"#ffffff","text":"#111111"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"¡Es mi cumpleaños!","subtitle":"Ven a celebrar conmigo","imageUrl":"","ctaLabel":"¡Vamos!"}},
      {"module_type":"countdown","sort_order":1,"is_visible":true,"config":{"title":"Cuenta regresiva","targetDate":""}},
      {"module_type":"map","sort_order":2,"is_visible":true,"config":{"title":"¿Dónde?","venueName":"","address":""}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"¿Vienes?","description":"Confírmame para apartar tu lugar.","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'XV años',
    'xv-anos',
    'Elegante y festivo para quinceañeras.',
    'XV años',
    '{"primary":"#c026d3","background":"#fdf4ff","text":"#2b2b2b"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Mis XV años","subtitle":"Sofía","imageUrl":"","ctaLabel":"Te espero"}},
      {"module_type":"countdown","sort_order":1,"is_visible":true,"config":{"title":"Faltan","targetDate":""}},
      {"module_type":"map","sort_order":2,"is_visible":true,"config":{"title":"Salón de eventos","venueName":"","address":""}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Baby shower',
    'baby-shower',
    'Tierno y suave para dar la bienvenida al bebé.',
    'Baby shower',
    '{"primary":"#0ea5e9","background":"#f0f9ff","text":"#1f2937"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Baby shower","subtitle":"¡Ya viene en camino!","imageUrl":"","ctaLabel":""}},
      {"module_type":"countdown","sort_order":1,"is_visible":true,"config":{"title":"Nos vemos en","targetDate":""}},
      {"module_type":"map","sort_order":2,"is_visible":true,"config":{"title":"Ubicación","venueName":"","address":""}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  ),
  (
    'Evento corporativo',
    'evento-corporativo',
    'Profesional y limpio para eventos de empresa.',
    'Corporativo',
    '{"primary":"#1d4ed8","background":"#f8fafc","text":"#0f172a"}'::jsonb,
    '[
      {"module_type":"hero","sort_order":0,"is_visible":true,"config":{"title":"Nombre del evento","subtitle":"Te invitamos a participar","imageUrl":"","ctaLabel":"Regístrate"}},
      {"module_type":"countdown","sort_order":1,"is_visible":true,"config":{"title":"Comienza en","targetDate":""}},
      {"module_type":"map","sort_order":2,"is_visible":true,"config":{"title":"Sede","venueName":"","address":""}},
      {"module_type":"rsvp","sort_order":3,"is_visible":true,"config":{"title":"Confirma tu asistencia","description":"","deadline":"","allowGuestCount":true}}
    ]'::jsonb,
    true
  )
on conflict (slug) do nothing;
