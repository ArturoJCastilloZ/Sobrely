-- ============================================================================
-- 0018_rsvp_answers.sql — dónde viven las respuestas a las preguntas del RSVP
--
-- El módulo RSVP puede declarar preguntas personalizadas (alergias, menú,
-- acompañante). Esa DEFINICIÓN vive en el `config` jsonb del módulo y no
-- necesita migración. Las RESPUESTAS sí: no había ninguna columna donde
-- guardarlas, ni en `rsvp_responses` ni en `invitation_guests`.
--
-- Forma del jsonb: objeto plano { "<question_id>": <valor> }, donde el valor
-- es texto, booleano o una de las opciones declaradas. Se indexa por id de
-- pregunta —no por su etiqueta— para que renombrar la pregunta no huerfane
-- las respuestas ya recibidas.
--
-- Se guarda `{}` y no null cuando no hay preguntas: "no respondió nada" y "no
-- había nada que responder" se leen igual desde el panel, y evita el clásico
-- null-check en cada lectura.
--
-- RLS: ambas tablas ya tienen sus políticas (0001 y 0011) y las columnas las
-- heredan. La validación de qué respuestas son aceptables vive en el código,
-- que es donde está el esquema de las preguntas.
-- ============================================================================

alter table public.rsvp_responses
  add column if not exists answers jsonb not null default '{}'::jsonb;

alter table public.invitation_guests
  add column if not exists answers jsonb not null default '{}'::jsonb;

comment on column public.rsvp_responses.answers is
  'Respuestas a las preguntas personalizadas del módulo RSVP, indexadas por id de pregunta. {} = sin respuestas.';

comment on column public.invitation_guests.answers is
  'Respuestas a las preguntas personalizadas del módulo RSVP, indexadas por id de pregunta. {} = sin respuestas. No se expone en las RPC públicas salvo al propio invitado por su token.';

-- ----------------------------------------------------------------------------
-- `respond_guest` gana un cuarto parámetro.
--
-- Se DROPEA la firma de 3 argumentos en vez de dejar las dos conviviendo: con
-- ambas presentes, una llamada de 3 args resolvería de forma ambigua y
-- fallaría. Con una sola firma cuyo 4º parámetro tiene default, el código
-- viejo (3 args) sigue funcionando durante el despliegue.
-- ----------------------------------------------------------------------------
drop function if exists public.respond_guest(text, integer, text);

create or replace function public.respond_guest(
  p_token text,
  p_confirmed_count integer,
  p_message text default null,
  p_answers jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g_id   uuid;
  g_max  integer;
  new_status text;
  new_count  integer;
begin
  select g.id, g.max_guests
    into g_id, g_max
  from public.invitation_guests g
  join public.invitations i on i.id = g.invitation_id
  where g.access_token = p_token
    and i.is_published = true
    and i.rsvp_mode = 'guest_list'
  limit 1;

  if g_id is null then
    return null;
  end if;

  if p_confirmed_count is null or p_confirmed_count <= 0 then
    new_status := 'declined';
    new_count := 0;
  else
    new_status := 'confirmed';
    -- clamp 1..max_guests
    new_count := least(greatest(p_confirmed_count, 1), g_max);
  end if;

  update public.invitation_guests
    set status = new_status,
        confirmed_count = new_count,
        message = coalesce(p_message, message),
        -- Solo se sobrescribe si vienen respuestas: así una confirmación sin
        -- preguntas no borra lo que el invitado ya había contestado.
        answers = case
          when p_answers is null then answers
          when jsonb_typeof(p_answers) <> 'object' then answers
          else p_answers
        end
  where id = g_id;

  return jsonb_build_object(
    'id', g_id,
    'status', new_status,
    'confirmed_count', new_count,
    'max_guests', g_max
  );
end;
$$;

grant execute on function public.respond_guest(text, integer, text, jsonb) to anon, authenticated;
