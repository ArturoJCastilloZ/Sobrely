import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicInvitationView } from "@/components/public/public-invitation";
import type { PublicInvitation } from "@/lib/invitations/public-types";

/**
 * Lo que protege los datos de verdad: en `vistaPrevia` el RSVP y las firmas se
 * pintan ESTÁTICOS. Se renderiza la vista y se mira el HTML, en vez de leer el
 * código fuente: aquí importa el efecto, no que el texto «parezca» correcto.
 *
 * Por qué importa aunque el id sea sintético: si el anfitrión comparte la liga de
 * una invitación YA publicada, un formulario real recibiría confirmaciones de
 * verdad desde la vista previa.
 */
const invitacion = (tipos: string[]): PublicInvitation => ({
  id: "vista-previa",
  title: "Boda de prueba",
  slug: "boda",
  event_type: "Boda",
  event_date: "2027-01-01T12:00:00.000Z",
  theme_config: null,
  owner_name: "Ana",
  owner_username: "ana",
  plan_code: "free",
  modules: tipos.map((t, i) => ({
    id: `m${i}`,
    module_type: t as never,
    sort_order: i,
    is_visible: true,
    config: {},
  })),
});

const html = (inv: PublicInvitation, vistaPrevia?: boolean) =>
  renderToStaticMarkup(createElement(PublicInvitationView, { invitation: inv, vistaPrevia }));

describe("PublicInvitationView · vistaPrevia", () => {
  it("la página PÚBLICA (sin el prop) sigue pintando el formulario real de RSVP", () => {
    // Sin esta aserción, «la vista previa quita el formulario» pasaría también si
    // el formulario nunca se hubiera pintado en ningún caso.
    const publico = html(invitacion(["hero", "rsvp"]));
    const vista = html(invitacion(["hero", "rsvp"]), true);
    expect(publico).not.toBe(vista);
    expect(publico).toContain("<form");
  });

  it("en vista previa NO hay ningún <form> (el RSVP es estático)", () => {
    expect(html(invitacion(["hero", "rsvp"]), true)).not.toContain("<form");
  });

  it("en vista previa las FIRMAS tampoco son un formulario real", () => {
    const publico = html(invitacion(["hero", "signatures"]));
    const vista = html(invitacion(["hero", "signatures"]), true);
    expect(publico).not.toBe(vista);
    expect(vista).not.toContain("<form");
  });

  it("los demás módulos se pintan IGUAL con o sin el prop: la vista previa muestra lo que verían los invitados", () => {
    const inv = invitacion(["hero", "welcome", "countdown"]);
    // Única diferencia: en la vista previa el pie de marca no es enlace
    // (`pie-de-marca.tsx`). Se ve igual; se compara todo lo de antes del pie.
    const sinPie = (h: string) => h.slice(0, h.indexOf("<footer"));
    expect(sinPie(html(inv, true))).toBe(sinPie(html(inv, false)));
    expect(html(inv, true)).toContain("Hecho con ");
  });

  it("`vistaPrevia: false` explícito equivale a no pasarlo (la página pública no cambia)", () => {
    const inv = invitacion(["hero", "rsvp", "signatures"]);
    expect(html(inv, false)).toBe(html(inv));
  });
});
