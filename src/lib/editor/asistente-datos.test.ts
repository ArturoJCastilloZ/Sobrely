import { describe, expect, it } from "vitest";

import {
  accionFecha,
  accionLugar,
  accionNombres,
  fechaParaInput,
  nombresActuales,
} from "@/lib/editor/asistente-datos";
import type { EditorModule } from "@/lib/invitations/editor-types";

const mod = (module_type: EditorModule["module_type"], config: Record<string, unknown>, id = module_type): EditorModule => ({
  id,
  module_type,
  sort_order: 0,
  is_visible: true,
  config,
});

const boda = { title: "Ana & Carlos", subtitle: "Nos casamos" };
const xv = { title: "Mis XV años", subtitle: "Sofía" };

describe("nombres en la portada", () => {
  it("en una boda escribe en el título, y sigue ahí aunque lo escrito aún no parezca «A y B»", () => {
    let modulos = [mod("hero", { ...boda })];
    for (const parcial of ["S", "Sofía", "Sofía y M"]) {
      const [a] = accionNombres(modulos, boda, parcial);
      expect(a).toMatchObject({ type: "updateConfig", patch: { title: parcial } });
      modulos = [mod("hero", { ...boda, title: parcial })];
    }
  });

  it("en XV años escribe en el subtítulo y deja el título", () => {
    const [a] = accionNombres([mod("hero", { ...xv })], xv, "Valentina");
    expect(a).toMatchObject({ patch: { subtitle: "Valentina" } });
  });

  it("también cambia el título de la invitación, salvo que se borre", () => {
    const m = [mod("hero", { ...xv })];
    expect(accionNombres(m, xv, "Valentina")[1]).toMatchObject({ type: "updateSettings", patch: { title: "Valentina" } });
    const vacio = accionNombres(m, xv, "   ");
    expect(vacio).toHaveLength(1);
    expect(vacio[0]).toMatchObject({ patch: { subtitle: "Sofía" } });
  });

  it("limpia el texto y el campo se muestra vacío mientras sea el de la plantilla", () => {
    expect(nombresActuales([mod("hero", { ...xv })], xv)).toBe("");
    expect(nombresActuales([mod("hero", { ...xv, subtitle: "Valentina" })], xv)).toBe("Valentina");
    const [a] = accionNombres([mod("hero", { ...xv })], xv, "  Val\u0007  entina ");
    expect(a).toMatchObject({ patch: { subtitle: "Val entina" } });
  });
});

describe("fecha y lugar", () => {
  it("la fecha se guarda como mediodía de México y una inválida la deja vacía", () => {
    expect(accionFecha("2027-03-20")).toEqual({ type: "updateSettings", patch: { event_date: "2027-03-20T12:00:00-06:00" } });
    expect(accionFecha("2027-02-31")).toEqual({ type: "updateSettings", patch: { event_date: "" } });
    expect(fechaParaInput("2027-03-20T12:00:00-06:00")).toBe("2027-03-20");
    expect(fechaParaInput("")).toBe("");
  });

  it("el lugar solo se escribe si la plantilla trae el módulo de ubicación", () => {
    expect(accionLugar([mod("hero", {})], "venueName", "Hacienda")).toEqual([]);
    expect(accionLugar([mod("map", {})], "venueName", "Hacienda")).toEqual([
      { type: "updateConfig", id: "map", patch: { venueName: "Hacienda" } },
    ]);
  });
});
