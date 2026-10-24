import { describe, expect, it } from "vitest";
import { faltantesSinNombres, nombresPersonalizados } from "./borrador-completo";

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
  it("es verdadero solo si el título cambió respecto de la plantilla", () => {
    expect(nombresPersonalizados([mod("hero", { title: "Ana y Luis" })], "Ana & Carlos")).toBe(true);
    expect(nombresPersonalizados([mod("hero", { title: "Ana & Carlos" })], "Ana & Carlos")).toBe(false);
  });

  it("sin plantilla (invitación en blanco) compara con el título por defecto", () => {
    expect(nombresPersonalizados([mod("hero", { title: "Nuestra celebración" })], null)).toBe(false);
    expect(nombresPersonalizados([mod("hero", { title: "Boda de Ana" })], undefined)).toBe(true);
  });

  it("título vacío o portada ausente u oculta: no", () => {
    expect(nombresPersonalizados([mod("hero", { title: "  " })], "x")).toBe(false);
    expect(nombresPersonalizados([], "x")).toBe(false);
    expect(nombresPersonalizados([mod("hero", { title: "Ana" }, false)], "x")).toBe(false);
  });
});
