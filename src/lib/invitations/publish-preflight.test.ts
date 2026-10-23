import { describe, expect, it } from "vitest";
import { getPublishPreflight } from "./publish-preflight";
import type { EditorInvitation, EditorModule } from "./editor-types";

const invitation: EditorInvitation = {
  id: "inv-1", title: "Evento", slug: "evento", event_type: "boda", event_date: "", is_published: false, rsvp_mode: "open",
};

const makeModule = (module_type: EditorModule["module_type"], config: Record<string, unknown> = {}): EditorModule => ({
  id: module_type, module_type, sort_order: 0, is_visible: true, config,
});

describe("getPublishPreflight", () => {
  it("marca lo que falta sin bloquear módulos opcionales", () => {
    const items = getPublishPreflight(invitation, [makeModule("map"), makeModule("music")]);
    expect(items.filter((item) => item.complete)).toEqual([]);
  });

  it("reconoce los datos listos para compartir", () => {
    const items = getPublishPreflight(
      { ...invitation, event_date: "2026-12-20T18:00:00" },
      [
        makeModule("map", { venueName: "Salón Luna" }),
        makeModule("rsvp"),
        makeModule("music", { url: "https://open.spotify.com/track/example" }),
        makeModule("dresscode"),
      ],
    );
    expect(items.every((item) => item.complete)).toBe(true);
  });
});
