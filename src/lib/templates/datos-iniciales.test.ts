import { describe, expect, it } from "vitest";
import {
  aplicarNombresAModulos,
  datosIniciales,
  fechaAEventDate,
  limpiarFecha,
  limpiarNombres,
  ranuraDeNombres,
} from "./datos-iniciales";

describe("limpiarNombres", () => {
  it("recorta, junta espacios, quita caracteres de control y limita el largo", () => {
    expect(limpiarNombres("  Sofía \n  y\tMateo ")).toBe("Sofía y Mateo");
    expect(limpiarNombres("a".repeat(200))).toHaveLength(60);
    expect(limpiarNombres("x\u0000y")).toBe("x y");
  });
  it("lo que no es texto da vacío", () => {
    for (const v of [null, undefined, 5, {}, []]) expect(limpiarNombres(v)).toBe("");
  });
  it("conserva acentos, eñes y el símbolo & tal cual (el render escapa)", () => {
    expect(limpiarNombres("Ñandú & Ángela")).toBe("Ñandú & Ángela");
  });
});

describe("limpiarFecha", () => {
  it("acepta una fecha real", () => {
    expect(limpiarFecha("2026-12-12")).toBe("2026-12-12");
    expect(limpiarFecha(" 2028-02-29 ")).toBe("2028-02-29");
  });
  it("rechaza lo imposible, lo mal formado y lo fuera de rango", () => {
    for (const v of ["2026-02-30", "2027-02-29", "2026-13-01", "26-12-12", "2026/12/12", "", "mañana", null, 3, "1999-01-01", "2101-01-01"]) {
      expect(limpiarFecha(v), String(v)).toBe("");
    }
  });
});

describe("datosIniciales", () => {
  it("devuelve lo limpio y null si no queda nada", () => {
    expect(datosIniciales({ nombres: " Ana ", fecha: "2026-12-12" })).toEqual({ nombres: "Ana", fecha: "2026-12-12" });
    expect(datosIniciales({ nombres: "", fecha: "basura" })).toBeNull();
    expect(datosIniciales({ nombres: "Ana", fecha: "basura" })).toEqual({ nombres: "Ana", fecha: "" });
    for (const v of [null, undefined, "x", 3]) expect(datosIniciales(v)).toBeNull();
  });
});

describe("fechaAEventDate", () => {
  it("es mediodía de UTC−6 y conserva el día en cualquier zona razonable", () => {
    expect(fechaAEventDate("2026-12-12")).toBe("2026-12-12T12:00:00-06:00");
    expect(fechaAEventDate("")).toBe("");
    const d = new Date(fechaAEventDate("2026-12-12"));
    expect(d.toISOString()).toBe("2026-12-12T18:00:00.000Z");
  });
});

describe("ranuraDeNombres (patrones medidos en las 65 plantillas)", () => {
  it.each([
    [{ title: "Ana & Carlos", subtitle: "Nos casamos" }, "title"],
    [{ title: "Mariana y Diego", subtitle: "¡Nos casamos!" }, "title"],
    [{ title: "Nombre del evento", subtitle: "Te esperamos" }, "title"],
    [{ title: "Mis XV años", subtitle: "Sofía" }, "subtitle"],
    [{ title: "Mi Bautizo", subtitle: "Mateo" }, "subtitle"],
    [{ title: "¡Es mi cumpleaños!", subtitle: "Ven a celebrar conmigo" }, "subtitle"],
    [{ title: "Nuestra boda", subtitle: "Otoño de 2026" }, "subtitle"],
    [{ title: "Baby shower", subtitle: "¡Ya viene en camino!" }, "subtitle"],
    [{ title: "Nos casamos en la playa", subtitle: "" }, "subtitle"],
    [{ title: "Conferencia Anual", subtitle: "Un día de contenido y networking" }, "subtitle"],
  ] as const)("%j → %s", (portada, esperado) => {
    expect(ranuraDeNombres(portada)).toBe(esperado);
  });
});

describe("aplicarNombresAModulos", () => {
  const hero = (title: string, subtitle: string, is_visible = true) => ({
    module_type: "hero", is_visible, config: { title, subtitle, imageUrl: "/arte/x.jpg" },
  });
  const otro = { module_type: "map", is_visible: true, config: { venueName: "Salón" } };

  it("en una boda cambia el título y no toca lo demás", () => {
    const entrada = [hero("Ana & Carlos", "Nos casamos"), otro];
    const r = aplicarNombresAModulos(entrada, "Sofía y Mateo");
    expect(r[0].config).toEqual({ title: "Sofía y Mateo", subtitle: "Nos casamos", imageUrl: "/arte/x.jpg" });
    expect(r[1]).toBe(otro);
  });

  it("en XV años cambia el subtítulo y conserva la frase del título", () => {
    const r = aplicarNombresAModulos([hero("Mis XV años", "Sofía")], "Valentina");
    expect(r[0].config).toMatchObject({ title: "Mis XV años", subtitle: "Valentina" });
  });

  it("no muta la entrada", () => {
    const entrada = [hero("Mis XV años", "Sofía")];
    aplicarNombresAModulos(entrada, "Valentina");
    expect(entrada[0].config.subtitle).toBe("Sofía");
  });

  it("sin nombres, sin portada visible o con portada oculta no cambia nada", () => {
    const entrada = [hero("Mis XV años", "Sofía"), otro];
    expect(aplicarNombresAModulos(entrada, "   ")).toEqual(entrada);
    expect(aplicarNombresAModulos([otro], "Ana")).toEqual([otro]);
    expect(aplicarNombresAModulos([hero("Mis XV años", "Sofía", false)], "Ana")[0].config.subtitle).toBe("Sofía");
  });

  it("limpia los nombres antes de escribirlos", () => {
    const r = aplicarNombresAModulos([hero("Mis XV años", "Sofía")], "  Val\u0000entina  ");
    expect(r[0].config.subtitle).toBe("Val entina");
  });
});

describe("paleta en los datos iniciales", () => {
  it("solo se conserva una clave de paleta que exista", () => {
    expect(datosIniciales({ nombres: "", fecha: "", paleta: "salvia" })).toEqual({
      nombres: "",
      fecha: "",
      paleta: "salvia",
    });
    expect(datosIniciales({ nombres: "", fecha: "", paleta: "#ff0000" })).toBeNull();
    expect(datosIniciales({ nombres: "Ana", paleta: "x" })).toEqual({ nombres: "Ana", fecha: "" });
  });
});
