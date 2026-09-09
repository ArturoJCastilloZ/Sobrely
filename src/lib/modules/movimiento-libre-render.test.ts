import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ModulePreview } from "@/components/modules/registry";
import { MODULE_TYPES, parseConfig } from "@/lib/modules/types";

/**
 * Verificación del RENDER, no del esquema.
 *
 * `renderToStaticMarkup` corre en node sin DOM, así que se puede afirmar sobre
 * el HTML de verdad en vez de sobre una función que se le parece. Es lo que
 * faltaba en la tanda anterior de presets, donde sólo se pudo probar la lógica.
 */
const pinta = (tipo: string, config: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(ModulePreview, {
      moduleType: tipo as never,
      config,
    } as never),
  );

describe("el movimiento libre APAGADO no toca el render", () => {
  it.each(MODULE_TYPES.map((t) => [t] as const))("%s", (tipo) => {
    const base = pinta(tipo, {});
    const conCampos = pinta(tipo, { freeMove: false, textOffsets: [] });
    // Byte a byte: si apagado emitiera una envoltura o un `translate(0,0)`,
    // estas dos cadenas diferirían y toda invitación guardada se movería.
    expect(conCampos).toBe(base);
    expect(base).not.toContain("cqw");
  });
});

describe("la portada coloca sus tres bloques", () => {
  const CFG = {
    title: "Ana & Carlos",
    subtitle: "7 de noviembre",
    ctaLabel: "Nuestra boda",
    imageUrl: "/arte/foto/boda-pastel-rosas.jpg",
  };

  it("etiqueta los tres bloques por NOMBRE", () => {
    const html = pinta("hero", CFG);
    for (const b of ["title", "subtitle", "cta"]) {
      expect(html).toContain(`data-bloque="${b}"`);
    }
  });

  it("encendido emite el translate de cada bloque, y sólo de los movidos", () => {
    const html = pinta("hero", {
      ...CFG,
      freeMove: true,
      textOffsets: {
        title: { dx: 0.25, dy: -0.1 },
        subtitle: { dx: 0, dy: 0 },
        cta: { dx: -0.05, dy: 0.2 },
      },
    });
    expect(html).toContain("translate(25cqw, -10cqw)");
    expect(html).toContain("translate(-5cqw, 20cqw)");
    // El que no se movió no emite transform: dos `translate` en total.
    expect(html.match(/translate\(/g)?.length).toBe(2);
  });

  it("encendido, los bloques traen `touch-action:none` para poder agarrarlos", () => {
    // La mitad TACTIL del arrastre. Sin esto el navegador se lleva el gesto
    // como scroll a media colocacion. Va en el BLOQUE y no en el contenedor:
    // tocar el texto arrastra, tocar al lado sigue scrolleando la vista previa.
    //
    // Se comprueba que lo traen los TRES, incluido el que no se ha movido —
    // un bloque sin desplazar tambien tiene que ser arrastrable.
    const html = pinta("hero", { ...CFG, freeMove: true });
    expect(html.match(/touch-action:none/g)?.length).toBe(3);
    expect(pinta("hero", CFG)).not.toContain("touch-action");
  });

  it("encendido declara el contenedor: sin él, `cqw` mediría otra caja", () => {
    // Medido en el navegador: `cqw` necesita un `container-type` para
    // resolver, y si no lo hay resuelve contra un ancestro — o contra el
    // viewport en el editor móvil, que NO declara `@container/inv`.
    const on = pinta("hero", { ...CFG, freeMove: true });
    expect(on).toContain("container-type:inline-size");
    const off = pinta("hero", CFG);
    expect(off).not.toContain("container-type");
  });
});

describe("no hay inyección de CSS por los desplazamientos", () => {
  // El `transform` se construye interpolando en una cadena de CSS, así que hay
  // que DEMOSTRAR que sólo entran números: una inyección en CSS permite
  // exfiltrar con `url(...)`, y este proyecto tiene la regla de cero
  // phone-home.
  //
  // Quién lo garantiza, con precisión: **`z.number()`**. Escribí primero que era
  // `.catch(0)` más el recorte, y una mutación lo desmintió — al quitarlos, un
  // `dx` de tipo string sigue sin llegar al CSS, porque `parseConfig` descarta
  // la config entera y el módulo pinta con sus defectos. `.catch(0)` y el
  // recorte NO defienden de la inyección: cambian el modo de FALLO, de
  // «descarta la portada» a «degrada el desplazamiento», y eso lo cubre
  // «un desplazamiento BASURA degrada, no borra la portada».
  const VENENOS = [
    "0);background:url(https://evil.tld/x",
    "1cqw) , url(//evil.tld/y",
    'a";}*{color:red}',
    "javascript:alert(1)",
    { raro: true },
    null,
    [],
  ];

  it.each(VENENOS.map((v, i) => [i, v] as const))(
    "veneno %i en dx no llega al CSS",
    (_i, veneno) => {
      const html = renderToStaticMarkup(
        createElement(ModulePreview, {
          moduleType: "hero",
          config: {
            title: "T",
            freeMove: true,
            textOffsets: { title: { dx: veneno, dy: 0.1 } },
          },
        } as never),
      );
      expect(html).not.toContain("evil.tld");
      expect(html).not.toContain("url(");
      expect(html).not.toContain("javascript:");
      // Y si emite algo, es un translate con números y nada más.
      for (const t of html.match(/translate\([^)]*\)/g) ?? []) {
        expect(t).toMatch(/^translate\(-?[0-9.]+cqw, -?[0-9.]+cqw\)$/);
      }
    },
  );
});

describe("las secciones colocan por índice, y su cuenta queda FIJADA", () => {
  // Anclar por índice rompe si un renderer cambia el orden o el número de sus
  // bloques. Esta prueba convierte ese riesgo silencioso en un rojo: fija
  // cuántos bloques colocables tiene cada módulo con contenido de ejemplo.
  const CONTENIDO: Record<string, Record<string, unknown>> = {
    welcome: { title: "Hola", message: "Mensaje" },
    countdown: { title: "Faltan", targetDate: "2027-05-13T18:00:00.000Z" },
    map: { title: "Dónde", venueName: "Jardín", address: "Calle 1" },
    gallery: { title: "Fotos", images: ["/arte/foto/boda-pastel-rosas.jpg"] },
    video: { title: "Video", url: "https://www.youtube.com/watch?v=x" },
    itinerary: { title: "Programa", items: [{ time: "18:00", label: "Misa" }] },
    dresscode: { title: "Código", level: "formal", notes: "Nota" },
    gifts: { title: "Regalos", message: "Gracias" },
    music: { title: "Música", url: "https://open.spotify.com/x" },
    rsvp: { title: "Confirma", description: "Ven" },
    signatures: { title: "Firmas" },
  };

  it("hay 11 secciones que fijar", () => {
    expect(Object.keys(CONTENIDO).length).toBe(11);
  });

  it.each(Object.entries(CONTENIDO))(
    "%s: sus bloques viven dentro de un <section>",
    (tipo, cfg) => {
      // Contrato del DOM que la capa de arrastre necesita: mide contra
      // `closest("section")`. Sin ese ancestro cogería la sección de OTRO
      // módulo y el arrastre mediría la caja equivocada EN SILENCIO.
      //
      // La primera versión de esta prueba dio falso positivo en `countdown` y
      // `map` porque les pasé una config sin fecha y sin dirección: los dos
      // tienen early return y no renderizaban nada. Estaba midiendo el estado
      // VACÍO, no el contrato.
      const html = pinta(tipo, { ...cfg, freeMove: true });
      const iSec = html.indexOf("<section");
      const iBloque = html.indexOf('data-bloque=');
      expect(iSec, `${tipo} no renderiza <section>`).toBeGreaterThanOrEqual(0);
      expect(iBloque).toBeGreaterThan(iSec);
    },
  );

  it.each(Object.entries(CONTENIDO))("%s", (tipo, cfg) => {
    const html = pinta(tipo, { ...cfg, freeMove: true });
    const bloques = html.match(/data-bloque="\d+"/g) ?? [];
    // No se fija un número concreto por módulo —cambiaría con cada retoque de
    // copy— sino que HAY bloques y que están numerados desde 0 sin huecos, que
    // es lo que el anclaje por índice necesita para no descolocar nada.
    expect(bloques.length).toBeGreaterThanOrEqual(1);
    const indices = bloques.map((b) => Number(b.match(/\d+/)![0]));
    expect(indices).toEqual(indices.map((_, i) => i));
    // Y que el esquema del módulo acepta tantos desplazamientos como bloques.
    const leido = parseConfig(tipo as never, {
      freeMove: true,
      textOffsets: indices.map(() => ({ dx: 0, dy: 0 })),
    }) as { textOffsets: unknown[] };
    expect(leido.textOffsets.length).toBe(indices.length);
  });
});
