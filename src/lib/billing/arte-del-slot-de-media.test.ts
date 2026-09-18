import { describe, expect, it } from "vitest";

import { urlDelSlotDeMedia } from "@/lib/billing/arte-del-slot-de-media";
import { esArteDeLaApp } from "@/lib/theme/arte";
import { MODULE_TYPES } from "@/lib/modules/types";

/**
 * El gate cobra por lo que se RENDERIZA. Cada caso de aqui fija una condicion
 * que el renderer tambien exige (`conMedia` en `previews.tsx`: posicion
 * distinta de `none` Y url).
 */
const CON_FOTO = {
  media: { url: "https://cdn.ejemplo.com/mi-foto.jpg", position: "left" },
};

describe("urlDelSlotDeMedia", () => {
  it("devuelve la url cuando el slot esta puesto y colocado", () => {
    expect(urlDelSlotDeMedia("welcome", CON_FOTO)).toBe(
      "https://cdn.ejemplo.com/mi-foto.jpg",
    );
  });

  it("con `position: none` NO cuenta: el renderer no lo pinta", () => {
    expect(
      urlDelSlotDeMedia("welcome", {
        media: { url: "https://cdn.ejemplo.com/mi-foto.jpg", position: "none" },
      }),
    ).toBeNull();
  });

  it("sin posicion guardada tampoco: el defecto del esquema es `none`", () => {
    expect(
      urlDelSlotDeMedia("welcome", {
        media: { url: "https://cdn.ejemplo.com/mi-foto.jpg" },
      }),
    ).toBeNull();
  });

  it("con posicion pero sin url no cuenta", () => {
    expect(urlDelSlotDeMedia("welcome", { media: { position: "left" } })).toBeNull();
  });

  // Fija la NORMALIZACION de la que depende el extractor: `parseConfig`
  // convierte un `media` que no es objeto en el defecto del esquema. Si eso
  // cambiara, el extractor tendria que volver a defenderse solo.
  it("config vacia, nula o basura no revienta", () => {
    expect(urlDelSlotDeMedia("welcome", {})).toBeNull();
    expect(urlDelSlotDeMedia("welcome", null)).toBeNull();
    expect(urlDelSlotDeMedia("welcome", "no soy un objeto")).toBeNull();
    expect(urlDelSlotDeMedia("welcome", { media: "tampoco" })).toBeNull();
  });

  it("un `module_type` que el esquema no conoce devuelve null, no revienta", () => {
    // La base no tiene CHECK en `module_type` y la policy deja al dueno
    // insertar por PostgREST. Sin la guarda, `parseConfig` tiraba un TypeError
    // y el 500 salia por la accion de PUBLICAR.
    expect(() =>
      urlDelSlotDeMedia("inventado" as never, CON_FOTO),
    ).not.toThrow();
    expect(urlDelSlotDeMedia("inventado" as never, CON_FOTO)).toBeNull();
  });

  it("`hero` NO tiene slot de media, asi que nunca devuelve nada", () => {
    // Su «Imagen de fondo» es `imageUrl` y vive fuera de este gate a
    // proposito: es la fuga preexistente, y cerrarla es decision de precio.
    expect(urlDelSlotDeMedia("hero", CON_FOTO)).toBeNull();
  });

  it.each(MODULE_TYPES.filter((t) => t !== "hero").map((t) => [t] as const))(
    "%s: el slot se lee de verdad, no solo en welcome",
    (tipo) => {
      expect(urlDelSlotDeMedia(tipo, CON_FOTO)).toBe(
        "https://cdn.ejemplo.com/mi-foto.jpg",
      );
    },
  );

  it("el arte que sirve la app es una ruta relativa, y `esArteDeLaApp` la distingue", () => {
    // Esta funcion NO decide si se cobra: eso lo hace `esArteDeLaApp` en el
    // gate. Se fija aqui el contrato del que depende, porque si cambiara,
    // el arte de las 50 plantillas empezaria a exigir Celebracion — que es el
    // defecto que la `0030` ya pago una vez.
    const deLaApp = urlDelSlotDeMedia("welcome", {
      media: { url: "/arte/foto/boda-pastel-rosas.jpg", position: "left" },
    });
    expect(deLaApp).toBe("/arte/foto/boda-pastel-rosas.jpg");
    expect(esArteDeLaApp(deLaApp)).toBe(true);
    expect(esArteDeLaApp("https://cdn.ejemplo.com/mi-foto.jpg")).toBe(false);
  });
});
