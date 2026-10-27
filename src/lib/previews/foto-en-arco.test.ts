import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicInvitationView } from "@/components/public/public-invitation";
import { parseConfig } from "@/lib/modules/types";
import type { PublicInvitation } from "@/lib/invitations/public-types";

const invitacion = (hero: Record<string, unknown>): PublicInvitation => ({
  id: "inv-1",
  title: "Boda",
  slug: "boda",
  event_type: "Boda",
  event_date: "2027-06-12T18:00:00.000Z",
  theme_config: null,
  owner_name: "Ana",
  owner_username: "ana",
  plan_code: "free",
  modules: [{ id: "h", module_type: "hero", sort_order: 0, is_visible: true, config: hero }],
});

const html = (hero: Record<string, unknown>) =>
  renderToStaticMarkup(createElement(PublicInvitationView, { invitation: invitacion(hero) }));

describe("foto en arco de la portada", () => {
  it("el defecto es rectangular: ninguna invitación guardada se mueve", () => {
    expect((parseConfig("hero", {}) as { imageShape: string }).imageShape).toBe("rect");
    expect(html({ variant: "editorial", imageUrl: "/x.jpg" })).not.toContain("rounded-t-full");
  });

  it("con imageShape = arch, la foto contenida lleva la máscara de arco en editorial y en split", () => {
    for (const variant of ["editorial", "split"]) {
      const h = html({ variant, imageUrl: "/x.jpg", imageShape: "arch" });
      expect(h, variant).toContain("rounded-t-full");
      expect(h, variant).not.toContain("overflow-hidden rounded-lg");
    }
  });

  it("un valor desconocido cae en el defecto en vez de romper la portada", () => {
    expect(html({ variant: "editorial", imageUrl: "/x.jpg", imageShape: "estrella" })).not.toContain("rounded-t-full");
  });

  it("sin foto no se pinta ninguna figura", () => {
    expect(html({ variant: "editorial", imageShape: "arch" })).not.toContain("rounded-t-full");
  });
});
