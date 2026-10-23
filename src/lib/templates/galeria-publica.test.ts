import { describe, expect, it } from "vitest";
import { getEffectivePrice, getPlan } from "@/lib/billing/plans";
import {
  aPlantillaPublica,
  modulosVisibles,
  type FilaPlantillaPublica,
} from "@/lib/templates/galeria-publica";

const AHORA = new Date("2026-10-22T12:00:00");
const fila = (over: Partial<FilaPlantillaPublica> = {}): FilaPlantillaPublica => ({
  id: "t1",
  slug: "boda-x",
  name: "Boda X",
  description: "desc",
  event_type: "Boda",
  preview_image_url: "/previews/x.jpg",
  modules_config: [
    { module_type: "hero", is_visible: true },
    { module_type: "rsvp", is_visible: true },
  ],
  theme_config: {},
  ...over,
});

describe("modulosVisibles", () => {
  it("deja fuera los módulos ocultos: no se cobra por lo que no se ve", () => {
    expect(
      modulosVisibles([
        { module_type: "hero", is_visible: true },
        { module_type: "gallery", is_visible: false },
        { module_type: "rsvp" },
      ]),
    ).toEqual(["hero", "rsvp"]);
  });

  it("datos raros dan lista vacía, no una excepción", () => {
    expect(modulosVisibles(null)).toEqual([]);
    expect(modulosVisibles("x")).toEqual([]);
    expect(modulosVisibles([null, 3, {}, { module_type: 5 }])).toEqual([]);
  });
});

describe("aPlantillaPublica", () => {
  it("devuelve solo lo que la galería pinta: nada de configuración pesada", () => {
    const r = aPlantillaPublica(fila(), AHORA) as Record<string, unknown>;
    expect(r).not.toHaveProperty("modules_config");
    expect(r).not.toHaveProperty("theme_config");
  });

  it("un módulo oculto de plan alto NO sube el precio", () => {
    const r = aPlantillaPublica(
      fila({
        modules_config: [
          { module_type: "hero", is_visible: true },
          { module_type: "video", is_visible: false },
        ],
      }),
      AHORA,
    );
    expect(r.precio?.precio).toBe(getEffectivePrice(getPlan("esencial")!, AHORA));
  });

  it("un módulo visible de plan alto SÍ lo sube", () => {
    const r = aPlantillaPublica(
      fila({
        modules_config: [
          { module_type: "hero", is_visible: true },
          { module_type: "gallery", is_visible: true },
        ],
      }),
      AHORA,
    );
    expect(r.precio?.precio).toBe(getEffectivePrice(getPlan("celebracion")!, AHORA));
  });

  it("un theme pack premium sube el precio aunque los módulos sean básicos", () => {
    const base = aPlantillaPublica(fila(), AHORA);
    const conPack = aPlantillaPublica(
      fila({ theme_config: { themePack: "boda-lujo" } }),
      AHORA,
    );
    expect(conPack.precio!.precio).toBeGreaterThan(base.precio!.precio);
  });

  it("sin nombre cae a un rótulo en vez de pintar «null»", () => {
    expect(aPlantillaPublica(fila({ name: null }), AHORA).name).toBe("Plantilla");
  });
});
