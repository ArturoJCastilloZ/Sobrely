-- ============================================================================
-- 0017_guests_phone_invited_at.sql — las dos columnas que faltaban
--
--   * `phone`      — desbloquea invitar por WhatsApp con `wa.me` y el empujón
--                    del panel ("Recuérdale al invitado que falta").
--   * `invited_at` — desbloquea el KPI de COBERTURA ("33 enviadas · 75%"), el
--                    segundo escalón del embudo.
--
-- Ambas nullable a propósito. La normalización del teléfono a formato WhatsApp
-- vive en código probado, no congelada en un check constraint.
--
-- RLS: `invitation_guests` ya es solo-dueño (0011) y las columnas lo heredan.
-- La RPC pública por token NO expone estas columnas y no se toca.
-- ============================================================================

alter table public.invitation_guests
  add column if not exists phone      text,
  add column if not exists invited_at timestamptz;

alter table public.invitation_guests
  drop constraint if exists invitation_guests_phone_shape_chk;

alter table public.invitation_guests
  add constraint invitation_guests_phone_shape_chk
  check (
    phone is null
    or phone ~ '^\+?[0-9()\-\s]{7,25}$'
  );

create index if not exists invitation_guests_invited_at_idx
  on public.invitation_guests (invitation_id, invited_at);

comment on column public.invitation_guests.phone is
  'Teléfono tal como lo teclea el organizador. La normalización a formato WhatsApp vive en el código. Nunca se expone en las RPC públicas.';

comment on column public.invitation_guests.invited_at is
  'Cuándo se le envió la invitación. Alimenta el KPI de cobertura. null = todavía no se le envía.';
