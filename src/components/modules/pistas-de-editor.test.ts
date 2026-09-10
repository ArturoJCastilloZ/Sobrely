import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ModulePreview } from "@/components/modules/registry";
import { MODULE_TYPES } from "@/lib/modules/types";

/**
 * Fuga de copy de EDITOR a la invitación publicada.
 *
 * Medido en vivo: el HTML servido al invitado contenía «Agrega fotos a tu
 * galería.». `MapPreview` y `CountdownPreview` ya callaban sus avisos con el
 * guard `editorHint`; galería, video, itinerario, vestimenta y música NO.
 *
 * La prueba barre TODOS los tipos del registro con config vacía —el estado en
 * que cada módulo enseña su aviso— y exige que el render público no contenga
 * ninguna instrucción dirigida al anfitrión. No enumera módulos a mano: si
 * mañana alguien agrega uno nuevo con un aviso sin guard, este barrido lo caza.
 */
/**
 * Config que pone a cada módulo en su estado VACÍO —el único en que enseña el
 * aviso—. `{}` basta para casi todos; `dresscode` sólo lo enseña en el nivel
 * `custom` sin descripción, así que con `{}` la prueba pasaría en falso.
 */
const CONFIG_VACIA: Record<string, Record<string, unknown>> = {
  dresscode: { level: "custom" },
};

const pinta = (tipo: string, editorHint: boolean) =>
  renderToStaticMarkup(
    createElement(ModulePreview, {
      moduleType: tipo as never,
      config: CONFIG_VACIA[tipo] ?? {},
      editorHint,
    } as never),
  );

/** Instrucciones al ANFITRIÓN. Ninguna es asunto del invitado. */
const INSTRUCCIONES = [
  "Agrega fotos a tu galería.",
  "Pega un enlace de YouTube o Vimeo.",
  "Agrega los horarios del evento.",
  "Indica el código de vestimenta.",
  "Pega un enlace de Spotify o YouTube.",
  "Agrega la dirección del lugar.",
  "Define la fecha del evento para activar la cuenta regresiva.",
];

describe("la página pública no filtra copy del editor", () => {
  it.each(MODULE_TYPES.map((t) => [t] as const))(
    "%s: sin editorHint no emite ninguna instrucción",
    (tipo) => {
      const html = pinta(tipo, false);
      for (const frase of INSTRUCCIONES) {
        expect(html, `${tipo} filtró «${frase}»`).not.toContain(frase);
      }
    },
  );

  it("ningún módulo emite un verbo de instrucción en público", () => {
    // Red más ancha que la lista literal: caza redacciones nuevas.
    for (const tipo of MODULE_TYPES) {
      const html = pinta(tipo, false);
      for (const verbo of [
        "Agrega ",
        "Pega un enlace",
        "Indica el",
        "Define la fecha",
      ]) {
        expect(html, `${tipo} filtró «${verbo}»`).not.toContain(verbo);
      }
    }
  });
});

describe("el editor SÍ conserva sus avisos", () => {
  // Si el arreglo hubiera sido «borrar el texto», el anfitrión se quedaría sin
  // saber qué le falta. Cada aviso debe seguir apareciendo con editorHint.
  const ESPERADOS: Array<[string, string]> = [
    ["gallery", "Agrega fotos a tu galería."],
    ["video", "Pega un enlace de YouTube o Vimeo."],
    ["itinerary", "Agrega los horarios del evento."],
    ["dresscode", "Indica el código de vestimenta."],
    ["music", "Pega un enlace de Spotify o YouTube."],
    ["map", "Agrega la dirección del lugar."],
    [
      "countdown",
      "Define la fecha del evento para activar la cuenta regresiva.",
    ],
  ];

  it.each(ESPERADOS)("%s conserva su aviso", (tipo, frase) => {
    expect(pinta(tipo, true)).toContain(frase);
  });
});

describe("estados en que el módulo NO se omite y el aviso sí es alcanzable", () => {
  // `MapPreview` se omite entero cuando no hay ni dirección ni nombre del
  // lugar, así que el barrido con config vacía nunca llega a su aviso interno.
  // Con nombre del lugar el módulo SÍ se pinta: ahí es donde el aviso podría
  // filtrarse, y es el único caso que mata esa mutación.
  it("map con nombre del lugar pinta el nombre y calla la instrucción", () => {
    const html = renderToStaticMarkup(
      createElement(ModulePreview, {
        moduleType: "map" as never,
        config: { venueName: "Hacienda El Roble" },
        editorHint: false,
      } as never),
    );
    expect(html).toContain("Hacienda El Roble");
    expect(html).not.toContain("Agrega la dirección del lugar.");
  });

  it("map con nombre del lugar SÍ enseña la instrucción en el editor", () => {
    const html = renderToStaticMarkup(
      createElement(ModulePreview, {
        moduleType: "map" as never,
        config: { venueName: "Hacienda El Roble" },
        editorHint: true,
      } as never),
    );
    expect(html).toContain("Agrega la dirección del lugar.");
  });

  // Mismo hueco para vestimenta: el aviso sólo existe en el nivel `custom`.
  it("dresscode custom sin descripción calla la instrucción en público", () => {
    const html = renderToStaticMarkup(
      createElement(ModulePreview, {
        moduleType: "dresscode" as never,
        config: { level: "custom" },
        editorHint: false,
      } as never),
    );
    expect(html).not.toContain("Indica el código de vestimenta.");
  });
});

describe("el guard no se come el contenido del invitado", () => {
  it("la galería con fotos pinta las fotos en público", () => {
    const html = renderToStaticMarkup(
      createElement(ModulePreview, {
        moduleType: "gallery" as never,
        config: { images: ["/arte/foto/uno.jpg"] },
        editorHint: false,
      } as never),
    );
    expect(html).toContain("/arte/foto/uno.jpg");
  });

  it("el video con enlace pinta el iframe en público", () => {
    const html = renderToStaticMarkup(
      createElement(ModulePreview, {
        moduleType: "video" as never,
        config: { url: "https://youtu.be/abc123" },
        editorHint: false,
      } as never),
    );
    expect(html).toContain("https://www.youtube.com/embed/abc123");
  });
});
