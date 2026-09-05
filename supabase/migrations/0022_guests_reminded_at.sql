-- ============================================================================
-- 0022_guests_reminded_at.sql — llevar la cuenta de los recordatorios
--
-- El Nivel 3 punto 4 pedía "avisos y recordatorios". Se resuelve por el canal
-- que YA existe —enlaces `wa.me` desde el teléfono del anfitrión— y no por
-- correo. Dos razones, ambas medidas antes de decidir:
--
--   * `invitation_guests` NO tiene columna de correo (tiene `phone`), así que
--     recordar por correo exigía capturar 300 direcciones que hoy nadie pide.
--     De las respuestas anónimas reales, 0 traían correo aunque el campo exista.
--   * Un servicio de correo transaccional es un tercero al que le pasarían los
--     nombres de los invitados de cada cliente. `wa.me` no manda nada a nadie.
--
-- Lo único que faltaba en la base era saber A QUIÉN YA SE LE RECORDÓ. Sin eso,
-- el anfitrión no puede retomar la tanda al día siguiente sin volver a
-- escribirle a los mismos.
--
-- Por qué DOS columnas y no una: `reminded_at` responde "¿le escribo ahora o lo
-- dejo respirar?" (la ventana de cortesía de 24 h), y `reminder_count` responde
-- "¿cuántas veces ya?", que es lo que distingue a quien se le pasó de quien
-- está ignorando. Con solo la fecha, el segundo dato se pierde en cada envío.
--
-- Igual que `invited_at`, sellan INTENCIÓN de envío, no entrega confirmada:
-- `wa.me` abre el chat y el anfitrión decide si le da enviar. Por eso se puede
-- revertir a mano desde el panel.
-- ============================================================================

alter table public.invitation_guests
  add column if not exists reminded_at    timestamptz,
  add column if not exists reminder_count integer not null default 0;

alter table public.invitation_guests
  drop constraint if exists invitation_guests_reminder_count_chk;

alter table public.invitation_guests
  add constraint invitation_guests_reminder_count_chk
  check (reminder_count >= 0);

-- El panel pide "los pendientes de esta invitación, ordenados por si ya se les
-- recordó". Este índice cubre esa consulta sin escanear la tabla.
create index if not exists invitation_guests_reminded_at_idx
  on public.invitation_guests (invitation_id, reminded_at);

comment on column public.invitation_guests.reminded_at is
  'Último recordatorio ENVIADO por el anfitrión (intención, no entrega — wa.me abre el chat y él decide). null = nunca se le recordó. Alimenta la ventana de cortesía de 24 h.';

comment on column public.invitation_guests.reminder_count is
  'Cuántas veces se le ha recordado. Distingue a quien se le pasó de quien está ignorando; con solo reminded_at ese dato se pierde en cada envío.';

-- RLS: `invitation_guests` ya es solo-dueño (0011) y las columnas lo heredan.
-- Las RPC públicas por token no exponen ninguna de las dos y no se tocan.
