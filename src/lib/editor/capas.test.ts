import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModulePreview } from "@/components/modules/registry";
import { ModoEditorProvider } from "@/lib/editor/contexto-modo";

import { capasDeAnclas } from "./capas";

function anclasDeGifts(config: Record<string, unknown>) {
  const preview = createElement(ModulePreview, {
    moduleType: "gifts",
    config,
  } as never);
  const html = renderToStaticMarkup(
    createElement(ModoEditorProvider, null, preview),
  );
  return [...html.matchAll(/data-bloque="([^"]+)"/g)].map((m) => m[1]);
}

describe("capas del riel", () => {
  it("muestran sólo los bloques que el módulo condicional rindió", () => {
    const anclas = anclasDeGifts({
      title: "Regalos",
      description: "Gracias",
      links: [],
    });

    expect(capasDeAnclas("gifts", anclas)).toEqual([
      { id: "0", etiqueta: "Título" },
      { id: "1", etiqueta: "Descripción" },
    ]);
  });

  it("recuperan una capa de enlaces cuando el lienzo la emite", () => {
    const anclas = anclasDeGifts({
      title: "Regalos",
      description: "Gracias",
      links: [{ label: "Mesa", url: "https://example.com" }],
      freeMove: true,
    });

    expect(capasDeAnclas("gifts", anclas)).toEqual([
      { id: "0", etiqueta: "Título" },
      { id: "1", etiqueta: "Descripción" },
      { id: "2", etiqueta: "Enlaces" },
    ]);
  });

  it("descarta anclas que no pertenecen al contrato del módulo", () => {
    expect(capasDeAnclas("welcome", ["0", "inventado", "1"])).toEqual([
      { id: "0", etiqueta: "Título" },
      { id: "1", etiqueta: "Mensaje" },
    ]);
  });
});
