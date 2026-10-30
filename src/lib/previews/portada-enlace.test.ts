import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PublicInvitationView } from "@/components/public/public-invitation";
import type { PublicInvitation } from "@/lib/invitations/public-types";

/**
 * La etiqueta de la portada («ACOMPÁÑANOS», «VER DETALLES») era un `<span>` sin acción, en las 65
 * plantillas (medido a 375 px). Estas pruebas miran el HTML que recibe el invitado, y la vista
 * previa privada, donde sigue siendo un rótulo.
 */
const invitacion = (etiqueta: string, tipos: string[] = ["hero", "welcome", "rsvp"]): PublicInvitation => ({
  id: "inv-1",
  title: "Boda de prueba",
  slug: "boda",
  event_type: "Boda",
  event_date: "2027-06-12T18:00:00.000Z",
  theme_config: null,
  owner_name: "Ana",
  owner_username: "ana",
  plan_code: "free",
  modules: tipos.map((t, i) => ({
    id: `m${i}`,
    module_type: t as never,
    sort_order: i,
    is_visible: true,
    config:
      t === "hero"
        ? { title: "Ana y Carlos", ctaLabel: etiqueta }
        : t === "map"
          ? { venueName: "Hacienda Los Laureles" }
          : {},
  })),
});

const html = (inv: PublicInvitation, vistaPrevia?: boolean) =>
  renderToStaticMarkup(createElement(PublicInvitationView, { invitation: inv, vistaPrevia }));

describe("etiqueta de la portada", () => {
  it("una etiqueta que invita a confirmar es un enlace al formulario de confirmación", () => {
    const h = html(invitacion("Acompáñanos"));
    expect(h).toMatch(/<a href="#inv-confirmar"[^>]*>Acompáñanos<\/a>/);
    expect(h).toContain('id="inv-confirmar"');
  });

  it("«Ver …» lleva a la sección que sigue a la portada", () => {
    const h = html(invitacion("Ver detalles"));
    expect(h).toMatch(/<a href="#inv-siguiente"[^>]*>Ver detalles<\/a>/);
    expect(h).toContain('id="inv-siguiente"');
  });

  it("sin módulo de confirmación, «Acompáñanos» baja a la sección siguiente, no a un ancla que no existe", () => {
    const h = html(invitacion("Acompáñanos", ["hero", "welcome"]));
    expect(h).toContain('href="#inv-siguiente"');
    expect(h).not.toContain('href="#inv-confirmar"');
  });

  it("si la portada es lo único, sigue siendo un rótulo (no hay a dónde ir)", () => {
    const h = html(invitacion("Acompáñanos", ["hero"]));
    // Solo la portada: el pie de marca (plan `free`) sí es un enlace, aparte.
    const portada = h.slice(0, h.indexOf("<footer"));
    expect(portada).not.toContain("<a ");
    expect(h).toContain("Acompáñanos");
  });

  it("en la vista previa privada es un rótulo: no navega", () => {
    expect(html(invitacion("Acompáñanos"), true)).not.toContain('href="#inv-');
  });

  it("la portada dice cuándo y dónde", () => {
    const h = html(invitacion("Acompáñanos", ["hero", "map", "rsvp"]));
    expect(h).toContain("12 de junio de 2027");
    expect(h).toContain('data-bloque="info"');
  });
});

describe("formulario de confirmación en teléfono", () => {
  const fuente = readFileSync("src/components/public/public-rsvp-form.tsx", "utf8");
  const preguntas = readFileSync("src/components/public/rsvp-question-fields.tsx", "utf8");

  it("los campos miden 44 px desde el teléfono, no solo en escritorio", () => {
    expect(fuente).toMatch(/const inputCls = `h-11 /);
    expect(preguntas).toContain("h-11 w-full rounded-md border");
    expect(preguntas).toContain("min-h-11 flex-1");
  });

  it("declara autocompletado y teclado adecuados y marca el campo con error", () => {
    expect(fuente).toContain('autoComplete="name"');
    expect(fuente).toContain('autoComplete="email"');
    expect(fuente).toContain('inputMode="numeric"');
    expect(fuente).toContain("aria-invalid");
    expect(fuente).toContain('role="status"');
  });

  it("el formulario público trae los atributos en el HTML", () => {
    const h = html(invitacion("Acompáñanos"));
    expect(h).toContain('autoComplete="name"');
    expect(h).toContain('autoComplete="email"');
  });
});
