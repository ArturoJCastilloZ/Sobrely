import { describe, expect, it } from "vitest";
import {
  faltantesSinNombres,
  leerPortadaDePlantilla,
  nombresPersonalizados,
  progresoEsencial,
} from "./borrador-completo";

const SUBIDA = "https://x.supabase.co/storage/v1/object/public/invitation-images/u/i/foto.jpg";
const mod = (module_type: string, config: Record<string, unknown>, is_visible = true) => ({
  module_type, is_visible, config,
});

const completo = [
  mod("hero", { title: "Ana y Luis", imageUrl: SUBIDA }),
  mod("map", { venueName: "Hacienda Los Pinos" }),
];

describe("faltantesSinNombres", () => {
  it("un borrador con fecha, lugar y foto subida no tiene faltantes", () => {
    expect(faltantesSinNombres({ fechaDelEvento: "2026-12-12T20:00:00Z", modulos: completo })).toEqual([]);
  });

  it("la foto de ejemplo de la plantilla (/arte) NO cuenta", () => {
    const m = [mod("hero", { title: "x", imageUrl: "/arte/boda-jardin.jpg" }), mod("map", { address: "Calle 1" })];
    expect(faltantesSinNombres({ fechaDelEvento: "2026-12-12", modulos: m })).toEqual(["foto"]);
  });

  it("una foto subida en la galería también cuenta", () => {
    const m = [mod("hero", { imageUrl: "" }), mod("gallery", { images: ["/arte/a.jpg", SUBIDA] }), mod("map", { address: "Calle 1" })];
    expect(faltantesSinNombres({ fechaDelEvento: "2026-12-12", modulos: m })).toEqual([]);
  });

  it("fecha vacía o nula falta; un lugar en blanco o un mapa oculto falta", () => {
    expect(faltantesSinNombres({ fechaDelEvento: "", modulos: completo })).toContain("fecha");
    expect(faltantesSinNombres({ fechaDelEvento: null, modulos: completo })).toContain("fecha");
    const sinLugar = [completo[0], mod("map", { venueName: "  ", address: "" })];
    expect(faltantesSinNombres({ fechaDelEvento: "2026-12-12", modulos: sinLugar })).toEqual(["lugar"]);
    const oculto = [completo[0], mod("map", { venueName: "Salón" }, false)];
    expect(faltantesSinNombres({ fechaDelEvento: "2026-12-12", modulos: oculto })).toEqual(["lugar"]);
  });

  it("una portada oculta no cuenta como foto", () => {
    const m = [mod("hero", { imageUrl: SUBIDA }, false), completo[1]];
    expect(faltantesSinNombres({ fechaDelEvento: "2026-12-12", modulos: m })).toEqual(["foto"]);
  });

  it("sin módulos faltan lugar y foto", () => {
    expect(faltantesSinNombres({ fechaDelEvento: "2026-12-12", modulos: [] })).toEqual(["lugar", "foto"]);
  });
});

describe("nombresPersonalizados", () => {
  const base = { title: "Ana & Carlos", subtitle: "Nos casamos" };
  const portada = (title: string, subtitle: string, visible = true) => [mod("hero", { title, subtitle }, visible)];

  it("es verdadero solo si el título o el subtítulo cambiaron respecto de la plantilla", () => {
    expect(nombresPersonalizados(portada("Ana y Luis", "Nos casamos"), base)).toBe(true);
    expect(nombresPersonalizados(portada("Ana & Carlos", "Nos casamos"), base)).toBe(false);
  });

  it("en XV años el nombre va en el subtítulo y también cuenta", () => {
    const xv = { title: "Mis XV años", subtitle: "Sofía" };
    expect(nombresPersonalizados(portada("Mis XV años", "Valentina"), xv)).toBe(true);
    expect(nombresPersonalizados(portada("Mis XV años", "Sofía"), xv)).toBe(false);
  });

  it("sin plantilla (invitación en blanco) compara con el título por defecto y un subtítulo vacío", () => {
    expect(nombresPersonalizados(portada("Nuestra celebración", ""), null)).toBe(false);
    expect(nombresPersonalizados(portada("Boda de Ana", ""), undefined)).toBe(true);
    expect(nombresPersonalizados(portada("Nuestra celebración", "Sofía"), null)).toBe(true);
  });

  it("vacíos, portada ausente u oculta: no", () => {
    expect(nombresPersonalizados(portada("  ", ""), base)).toBe(false);
    expect(nombresPersonalizados([], base)).toBe(false);
    expect(nombresPersonalizados(portada("Ana", "x", false), base)).toBe(false);
  });
});

describe("leerPortadaDePlantilla", () => {
  it("lee título y subtítulo de la portada y tolera datos raros", () => {
    expect(leerPortadaDePlantilla([{ module_type: "map" }, { module_type: "hero", config: { title: "A", subtitle: "B" } }])).toEqual({ title: "A", subtitle: "B" });
    expect(leerPortadaDePlantilla([{ module_type: "hero", config: { title: 5 } }])).toEqual({ title: "", subtitle: "" });
    for (const v of [null, undefined, "x", {}, [], [{ module_type: "hero" }]]) expect(leerPortadaDePlantilla(v)).toBeNull();
  });
});

describe("progresoEsencial (lista del editor)", () => {
  const SUBIDA2 = "https://x.supabase.co/storage/v1/object/public/invitation-images/u/i/f.jpg";
  const m = (module_type: string, config: Record<string, unknown>, is_visible = true) => ({
    module_type, is_visible, config,
  });

  it("devuelve los cuatro puntos en orden y todos pendientes en una plantilla recién elegida", () => {
    const p = progresoEsencial({
      fechaDelEvento: "",
      modulos: [m("hero", { title: "Ana & Carlos", imageUrl: "/arte/x.jpg" }), m("map", {})],
      portadaDeLaPlantilla: { title: "Ana & Carlos", subtitle: "" },
    });
    expect(p.map((x) => x.clave)).toEqual(["nombres", "fecha", "lugar", "foto"]);
    expect(p.every((x) => !x.hecho)).toBe(true);
    expect(p.every((x) => x.ayuda.length > 0)).toBe(true);
  });

  it("coincide con el criterio de complete_draft: completo si y solo si los cuatro están hechos", () => {
    const modulos = [m("hero", { title: "Ana y Luis", imageUrl: SUBIDA2 }), m("map", { venueName: "Salón" })];
    const completo = progresoEsencial({ fechaDelEvento: "2026-12-12", modulos, portadaDeLaPlantilla: { title: "Ana & Carlos", subtitle: "" } });
    expect(completo.every((x) => x.hecho)).toBe(true);
    expect(faltantesSinNombres({ fechaDelEvento: "2026-12-12", modulos })).toEqual([]);
    const sinFecha = progresoEsencial({ fechaDelEvento: "", modulos, portadaDeLaPlantilla: { title: "Ana & Carlos", subtitle: "" } });
    expect(sinFecha.filter((x) => !x.hecho).map((x) => x.clave)).toEqual(["fecha"]);
  });
});
