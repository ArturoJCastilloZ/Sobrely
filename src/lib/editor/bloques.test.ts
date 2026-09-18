import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModulePreview } from "@/components/modules/registry";
import { ModoEditorProvider } from "@/lib/editor/contexto-modo";
import { bloquesDe, bloquePorId } from "@/lib/editor/bloques";
import { MODULE_TYPES, type ModuleType } from "@/lib/modules/types";

/**
 * El contrato de bloques, cruzado contra el HTML QUE SE RENDERIZA DE VERDAD.
 *
 * Una tabla escrita a mano que nadie contrasta se queda vieja al primer retoque
 * de un renderer, y el modo de fallo es silencioso y caro: los `textOffsets`
 * guardados se aplicarian al bloque equivocado, en invitaciones de clientes.
 * Aqui la tabla se compara con el render real de los doce modulos.
 */

/** Contenido de ejemplo: sin el, `countdown` y `map` tienen early return y se
 *  mediria el estado VACIO en vez del contrato. Ya paso una vez. */
const CONTENIDO: Record<string, Record<string, unknown>> = {
  hero: { title: "Ana & Carlos", subtitle: "7 de noviembre", ctaLabel: "Ver más" },
  welcome: { title: "Hola", message: "Mensaje" },
  countdown: { title: "Faltan", targetDate: "2027-05-13T18:00:00.000Z" },
  map: { title: "Dónde", venueName: "Jardín", address: "Calle 1" },
  gallery: { title: "Fotos", images: ["/arte/foto/boda-pastel-rosas.jpg"] },
  video: { title: "Video", url: "https://www.youtube.com/watch?v=x" },
  itinerary: { title: "Programa", items: [{ time: "18:00", label: "Misa" }] },
  dresscode: { title: "Código", level: "formal", notes: "Nota" },
  gifts: {
    title: "Regalos",
    description: "Gracias",
    links: [{ label: "Liverpool", url: "https://x.com" }],
  },
  music: { title: "Música", url: "https://open.spotify.com/x" },
  rsvp: { title: "Confirma", description: "Ven" },
  signatures: { title: "Firmas" },
};

const pinta = (tipo: string, cfg: Record<string, unknown>, editor: boolean) => {
  const preview = createElement(ModulePreview, {
    moduleType: tipo as never,
    config: cfg,
  } as never);
  return renderToStaticMarkup(
    editor ? createElement(ModoEditorProvider, null, preview) : preview,
  );
};

const anclas = (html: string) =>
  [...html.matchAll(/data-bloque="([^"]+)"/g)].map((m) => m[1]);

describe("la tabla cubre los doce tipos", () => {
  it("no falta ninguno, y ninguno esta vacio", () => {
    for (const t of MODULE_TYPES) {
      expect(bloquesDe(t).length, t).toBeGreaterThan(0);
    }
    expect(Object.keys(CONTENIDO).sort()).toEqual([...MODULE_TYPES].sort());
  });

  it("los ids de un tipo son unicos", () => {
    for (const t of MODULE_TYPES) {
      const ids = bloquesDe(t).map((b) => b.id);
      expect(new Set(ids).size, t).toBe(ids.length);
    }
  });
});

describe("EL EDITOR marca los doce modulos", () => {
  it.each(MODULE_TYPES.map((t) => [t] as const))("%s emite anclas", (tipo) => {
    const html = pinta(tipo, CONTENIDO[tipo], true);
    expect(anclas(html).length, `${tipo} no emitio ninguna ancla`).toBeGreaterThan(0);
  });

  it.each(MODULE_TYPES.map((t) => [t] as const))(
    "%s: lo renderizado es un PREFIJO de la tabla",
    (tipo) => {
      // Prefijo y no igualdad: los hijos CONDICIONALES DE COLA desaparecen
      // cuando no hay contenido (`gifts` sin enlaces da 2 bloques, no 3). Lo
      // que NUNCA puede pasar es que se reordenen o se salte una posicion,
      // porque ahi los desplazamientos guardados cambiarian de bloque.
      const vistos = anclas(pinta(tipo, CONTENIDO[tipo], true));
      const esperados = bloquesDe(tipo).map((b) => b.id);
      expect(vistos.length).toBeLessThanOrEqual(esperados.length);
      expect(vistos).toEqual(esperados.slice(0, vistos.length));
    },
  );

  it("cada ancla renderizada tiene su etiqueta en la tabla", () => {
    for (const tipo of MODULE_TYPES) {
      for (const id of anclas(pinta(tipo, CONTENIDO[tipo], true))) {
        const b = bloquePorId(tipo as ModuleType, id);
        expect(b, `${tipo}: el bloque "${id}" no esta en la tabla`).not.toBeNull();
        expect(b!.etiqueta.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("LA PAGINA PUBLICA no se entera", () => {
  // Las once que no son la portada no deben traer NI UN ancla fuera del editor
  // mientras `freeMove` este apagado, que es como estan las 18 invitaciones
  // vivas. La portada SI las trae, y ya las traia antes de todo esto.
  const SIN_HERO = MODULE_TYPES.filter((t) => t !== "hero");

  it.each(SIN_HERO.map((t) => [t] as const))("%s no emite anclas", (tipo) => {
    expect(anclas(pinta(tipo, CONTENIDO[tipo], false))).toEqual([]);
  });

  it.each(MODULE_TYPES.map((t) => [t] as const))(
    "%s: el editor anade ATRIBUTOS, no NODOS",
    (tipo) => {
      // La comprobacion mas fuerte de esta fase, y la que justifica haber usado
      // `cloneElement` en vez de envolver en un `div`: si al HTML del editor le
      // quitas los atributos `data-bloque`, tiene que quedar EXACTAMENTE el
      // HTML publico. Byte a byte.
      //
      // Si alguien cambia el clon por una envoltura, aqui aparece un `<div>` de
      // mas y esto se pone rojo — antes de que se mueva el layout de una
      // invitacion publicada.
      const publico = pinta(tipo, CONTENIDO[tipo], false);
      const editor = pinta(tipo, CONTENIDO[tipo], true);
      const desmarcado = editor.replace(/ ?data-bloque="[^"]*"/g, "");
      const publicoSinHero = publico.replace(/ ?data-bloque="[^"]*"/g, "");
      expect(desmarcado).toBe(publicoSinHero);
    },
  );
});

describe("la portada va por NOMBRE y no por indice", () => {
  it("emite title, subtitle y cta", () => {
    expect(anclas(pinta("hero", CONTENIDO.hero, true))).toEqual([
      "title",
      "subtitle",
      "cta",
    ]);
  });

  it("y sus tres bloques declaran el campo de `config` que los alimenta", () => {
    expect(bloquesDe("hero").map((b) => [b.id, b.campo])).toEqual([
      ["title", "title"],
      ["subtitle", "subtitle"],
      ["cta", "ctaLabel"],
    ]);
  });
});
