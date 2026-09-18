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
  // `description`, no `notes`: `notes` NO existe en el esquema de dresscode.
  // Con el campo inventado el bloque salia vacio y la medicion mentia.
  dresscode: { title: "Código", level: "formal", description: "Nota" },
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

/**
 * Que bloques quedan MARCADOS con `freeMove` apagado — o sea, en el estado en
 * que estan las 18 invitaciones vivas. Medido, no supuesto.
 *
 * No coincide con la tabla entera, y el motivo es concreto: sin `freeMove` el
 * atributo se pone CLONANDO el hijo, y `cloneElement` sobre un COMPONENTE
 * añade la prop pero el componente no la reenvia a su raiz, asi que el atributo
 * se pierde. Les pasa a las figuras de vestimenta, la galeria, el itinerario,
 * los enlaces de regalos y la direccion del mapa. Ninguno es un texto editable
 * salvo `map.address`, que por eso NO se puede editar hoy en el lienzo.
 */
const MARCADOS_SIN_FREEMOVE: Record<string, string[]> = {
  hero: ["title", "subtitle", "cta"],
  welcome: ["0", "1"],
  countdown: ["0", "1"],
  map: ["0", "1"],
  gallery: ["0"],
  video: ["0", "1"],
  itinerary: ["0"],
  dresscode: ["0", "1", "3"],
  gifts: ["0", "1"],
  music: ["0", "1"],
  rsvp: ["0", "1"],
  signatures: ["0", "1", "2", "3"],
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
    "%s: con `freeMove` la secuencia es EXACTAMENTE la tabla",
    (tipo) => {
      // La ruta de `freeMove` envuelve cada hijo en un `div`, asi que marca
      // TODOS. Es la secuencia canonica y aqui se exige igualdad exacta: si un
      // renderer cambia el orden o la cuenta de sus hijos, esto se pone rojo
      // antes de que los `textOffsets` guardados cambien de bloque.
      const vistos = anclas(pinta(tipo, { ...CONTENIDO[tipo], freeMove: true }, true));
      expect(vistos).toEqual(bloquesDe(tipo).map((b) => b.id));
    },
  );

  it.each(MODULE_TYPES.map((t) => [t] as const))(
    "%s: sin `freeMove` es un SUBCONJUNTO en orden, nunca reordenado",
    (tipo) => {
      // Subconjunto y no prefijo, y la diferencia importa: la version anterior
      // afirmaba «prefijo» y eso ENMASCARABA un hueco en medio — `[0,1]` es
      // prefijo de `[0,1,2]`, asi que un bloque intermedio que dejara de
      // marcarse pasaba desapercibido. Medido: `dresscode` da `[0,1,3]`.
      //
      // Por que faltan algunos: sin `freeMove` el atributo se pone CLONANDO el
      // hijo, y `cloneElement` sobre un COMPONENTE (no un elemento del DOM)
      // añade la prop pero el componente no la reenvia a su raiz, asi que el
      // atributo se pierde. Les pasa a las figuras de vestimenta, la galeria,
      // el itinerario y los enlaces de regalos. No son texto, asi que no ser
      // seleccionables no quita nada — pero la NUMERACION tiene que seguir
      // alineada con la ruta de `freeMove`, y eso es lo que se fija aqui.
      const vistos = anclas(pinta(tipo, CONTENIDO[tipo], true));
      const canon = bloquesDe(tipo).map((b) => b.id);
      expect(vistos.every((v) => canon.includes(v))).toBe(true);
      expect(canon.filter((c) => vistos.includes(c))).toEqual(vistos);
      // Y el conjunto EXACTO, fijado por medicion. Un `toBeSubset` no basta:
      // se probo con un mutante que dejaba de marcar el bloque 1 y SOBREVIVIO,
      // porque quitar un elemento deja un subconjunto que sigue en orden. Lo
      // unico que caza un bloque que deja de ser seleccionable es pinchar la
      // lista. Si la pones roja, pregunta primero si acabas de romper la
      // edicion directa de ese bloque.
      expect(vistos).toEqual(MARCADOS_SIN_FREEMOVE[tipo]);
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
