import type { EditorInvitation, EditorModule } from "@/lib/invitations/editor-types";

export type PublishPreflightItem = {
  key: "date" | "location" | "rsvp" | "music" | "dresscode";
  label: string;
  complete: boolean;
  detail: string;
};

function visibleModule(modules: EditorModule[], type: EditorModule["module_type"]) {
  return modules.find((module) => module.module_type === type && module.is_visible);
}

function text(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Lista breve previa a publicar. No bloquea: una invitación puede prescindir de
 * música o RSVP, pero el anfitrión debe poder detectarlo antes de compartirla.
 */
export function getPublishPreflight(
  invitation: EditorInvitation,
  modules: EditorModule[],
): PublishPreflightItem[] {
  const map = visibleModule(modules, "map");
  const music = visibleModule(modules, "music");

  return [
    {
      key: "date",
      label: "Fecha del evento",
      complete: invitation.event_date.trim().length > 0,
      detail: "Permite que la cuenta regresiva y el calendario estén listos.",
    },
    {
      key: "location",
      label: "Ubicación",
      complete: Boolean(map && (text(map.config, "venueName") || text(map.config, "address"))),
      detail: "Agrega al menos el lugar o la dirección.",
    },
    {
      key: "rsvp",
      label: "Confirmación (RSVP)",
      complete: Boolean(visibleModule(modules, "rsvp")),
      detail: "Facilita saber quién asistirá.",
    },
    {
      key: "music",
      label: "Música",
      complete: Boolean(music && text(music.config, "url")),
      detail: "Añade una canción o déjala fuera si no la necesitas.",
    },
    {
      key: "dresscode",
      label: "Código de vestimenta",
      complete: Boolean(visibleModule(modules, "dresscode")),
      detail: "Orienta a tus invitados sobre el atuendo esperado.",
    },
  ];
}
