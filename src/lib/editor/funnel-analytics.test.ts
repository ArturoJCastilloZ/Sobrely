import { describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock("@vercel/analytics/react", () => ({ track }));

import { EDITOR_FUNNEL_EVENTS, trackEditorFunnelEvent } from "./funnel-analytics";

describe("trackEditorFunnelEvent", () => {
  it("solo expone los eventos de editor acordados en C3", () => {
    expect(EDITOR_FUNNEL_EVENTS).toEqual(["editor_abierto", "publicar_tocado"]);
  });

  it("envía el nombre exacto al emisor de analítica", () => {
    trackEditorFunnelEvent("publicar_tocado");
    expect(track).toHaveBeenCalledWith("publicar_tocado");
  });
});
