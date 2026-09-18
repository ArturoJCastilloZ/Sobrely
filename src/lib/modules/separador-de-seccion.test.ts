import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ModulePreview } from "@/components/modules/registry";
import {
  MODULE_TYPES,
  SECTION_DIVIDERS,
  SECTION_DIVIDER_LABELS,
  defaultConfigFor,
  moduleConfigSchemas,
  tieneComposicionDeSeccion,
} from "@/lib/modules/types";

/**
 * El separador de seccion (Grupo B del §6), y la prueba de que anadirlo NO
 * movio una sola invitacion.
 *
 * ── Por que hay un fichero de md5 y no un `toMatchSnapshot` ───────────
 *
 * `render-md5.json` se capturo ANTES de que el campo `divider` existiera, con
 * el mismo contenido de ejemplo que se usa aqui. Un snapshot normal se habria
 * escrito DESPUES del cambio y habria bendecido lo que hubiera: no serviria de
 * control. El fichero es el «antes» de verdad.
 *
 * Si esta prueba se pone roja, NO se regenera el fichero: significa que el
 * render de los modulos cambio y hay que mirar por que.
 */

const CONTENIDO: Record<string, Record<string, unknown>> = {
  hero: { title: "Ana & Carlos", subtitle: "7 de noviembre", ctaLabel: "Ver más" },
  welcome: { title: "Hola", message: "Mensaje" },
  countdown: { title: "Faltan", targetDate: "2027-05-13T18:00:00.000Z" },
  map: { title: "Dónde", venueName: "Jardín", address: "Calle 1" },
  gallery: { title: "Fotos", images: ["/arte/foto/boda-pastel-rosas.jpg"] },
  video: { title: "Video", url: "https://www.youtube.com/watch?v=x" },
  itinerary: { title: "Programa", items: [{ time: "18:00", label: "Misa" }] },
  dresscode: { title: "Código", level: "formal", description: "Nota" },
  gifts: {
    title: "Regalos",
    description: "Gracias",
    links: [{ label: "L", url: "https://x.com" }],
  },
  music: { title: "Música", url: "https://open.spotify.com/x" },
  rsvp: { title: "Confirma", description: "Ven" },
  signatures: { title: "Firmas" },
};

const ANTES: Record<string, string> = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("./__antes__/render-md5.json", import.meta.url)),
    "utf8",
  ),
);

const pintar = (tipo: string, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(ModulePreview, {
      moduleType: tipo,
      config: { ...CONTENIDO[tipo], ...extra },
    } as never),
  );

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

describe("con el defecto, el render es IDENTICO al de antes del campo", () => {
  it.each(MODULE_TYPES)("%s no se mueve un byte", (t) => {
    expect(md5(pintar(t))).toBe(ANTES[t]);
  });

  it("control: el fichero de referencia trae los 12, no un subconjunto", () => {
    // Sin esto, un fichero a medias dejaria modulos sin comprobar y la prueba
    // pasaria igual — el verde falso que ya costo caro en la Fase 3.
    expect(Object.keys(ANTES).sort()).toEqual([...MODULE_TYPES].sort());
  });
});

describe("control positivo: el separador SI cambia el render cuando se pide", () => {
  const CON_SEPARADOR = MODULE_TYPES.filter((t) => tieneComposicionDeSeccion(t));

  it("hay 11 secciones que lo heredan", () => {
    expect(CON_SEPARADOR).toHaveLength(11);
  });

  it.each(CON_SEPARADOR)("%s: `line` mueve el md5", (t) => {
    expect(md5(pintar(t, { divider: "line" }))).not.toBe(ANTES[t]);
  });

  it.each(CON_SEPARADOR)("%s: `ornament` mueve el md5 y NO es igual a `line`", (t) => {
    const orn = md5(pintar(t, { divider: "ornament" }));
    expect(orn).not.toBe(ANTES[t]);
    expect(orn).not.toBe(md5(pintar(t, { divider: "line" })));
  });

  it("`hero` NO lo lleva: no pasa por `Section`", () => {
    expect(md5(pintar("hero", { divider: "line" }))).toBe(ANTES.hero);
    expect(defaultConfigFor("hero").divider).toBeUndefined();
  });
});

describe("el esquema aguanta lo que la base pueda traer", () => {
  it("una config vieja, sin la clave, cae al defecto", () => {
    expect(moduleConfigSchemas.welcome.parse({ title: "x" })).toMatchObject({
      divider: "none",
    });
  });

  it("un valor inventado NO invalida la config: `.catch()` lo recorta", () => {
    // Sin `.catch()` esto obligaria a `parseConfig` a su camino lento. Para un
    // adorno, caer al defecto en silencio es lo correcto.
    const r = moduleConfigSchemas.welcome.safeParse({
      title: "x",
      divider: "arcoiris",
    });
    expect(r.success).toBe(true);
    expect(r.success && (r.data as { divider: string }).divider).toBe("none");
  });

  it("cada opcion tiene rotulo", () => {
    const sin = SECTION_DIVIDERS.filter((d) => !SECTION_DIVIDER_LABELS[d]);
    expect(sin).toEqual([]);
  });
});
