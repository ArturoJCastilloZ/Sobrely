import { describe, expect, it } from "vitest";

import { infoDeEvento } from "@/lib/invitations/info-evento";

const mapa = (venueName: unknown, is_visible = true) => ({ module_type: "map", is_visible, config: { venueName } });

describe("línea «fecha · lugar» de la portada", () => {
  it("une la fecha en español y el nombre del lugar", () => {
    expect(infoDeEvento("2027-06-12T18:00:00.000Z", [mapa("Jardín Las Flores")])).toBe("12 de junio de 2027 · Jardín Las Flores");
  });
  it("el día no se corre con la hora de mediodía de México central", () => {
    expect(infoDeEvento("2027-03-20T12:00:00-06:00", [])).toBe("20 de marzo de 2027");
  });
  it("solo la fecha, solo el lugar o nada", () => {
    expect(infoDeEvento("2027-06-12T18:00:00.000Z", [])).toBe("12 de junio de 2027");
    expect(infoDeEvento("", [mapa("Salón Aurora")])).toBe("Salón Aurora");
    expect(infoDeEvento("", [])).toBeUndefined();
    expect(infoDeEvento("no-es-fecha", [mapa("  ")])).toBeUndefined();
  });
  it("ignora un módulo de ubicación oculto", () => {
    expect(infoDeEvento("2027-06-12T18:00:00.000Z", [mapa("Oculto", false)])).toBe("12 de junio de 2027");
  });
});
