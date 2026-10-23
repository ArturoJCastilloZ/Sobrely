import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Las acciones son `"use server"` y tocan Supabase: aquí solo se pinta el HTML.
vi.mock("@/lib/previews/actions", () => ({
  crearVistaPrevia: vi.fn(),
  revocarVistasPrevias: vi.fn(),
}));

import { VistaPreviaControls } from "@/components/editor/vista-previa-controls";
import { AVISO_CAMBIOS_SIN_GUARDAR } from "@/lib/previews/ui";

const leer = (ruta: string) => readFileSync(ruta, "utf8");
const sinComentarios = (s: string) =>
  // Primero el comentario JSX COMPLETO (`{/* … */}`) y después el de bloque: al
  // revés, se llevaba el `/* … */` y dejaba un `{}` suelto que rompía las medidas.
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const html = (dirty: boolean) =>
  renderToStaticMarkup(createElement(VistaPreviaControls, { invitationId: "inv-1", dirty }));

/**
 * ¿La etiqueta de apertura lleva el ATRIBUTO `disabled`? No se busca la palabra
 * suelta: el `Button` trae clases como `disabled:pointer-events-none`, así que
 * «contiene disabled» daba verdadero incluso con el botón HABILITADO y la prueba
 * de «se deshabilita con cambios sin guardar» pasaba por casualidad.
 */
const estaDeshabilitado = (botonHtml: string): boolean =>
  /\sdisabled(=""|\s|>)/.test(botonHtml.match(/^<button\b[^>]*>/)![0]);

/** El `<button …>Texto</button>` que contiene ese texto. */
const boton = (marcado: string, texto: string): string => {
  const m = [...marcado.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].find((x) =>
    x[0].includes(texto),
  );
  expect(m, `no hay un botón con «${texto}»`).toBeTruthy();
  return m![0];
};

describe("VistaPreviaControls · lo que se ve", () => {
  it("sin cambios pendientes: el botón de copiar está HABILITADO y no hay aviso", () => {
    const h = html(false);
    expect(estaDeshabilitado(boton(h, "Copiar liga de vista previa"))).toBe(false);
    expect(h).not.toContain(AVISO_CAMBIOS_SIN_GUARDAR);
  });

  it("con cambios SIN guardar: el botón está deshabilitado, dice por qué, y está vinculado al aviso", () => {
    const h = html(true);
    const b = boton(h, "Copiar liga de vista previa");
    expect(estaDeshabilitado(b)).toBe(true);
    expect(h).toContain(AVISO_CAMBIOS_SIN_GUARDAR);
    // `aria-describedby` apunta al párrafo del aviso (un lector de pantalla lo anuncia).
    const id = b.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(id, "el botón no apunta al aviso").toBeTruthy();
    expect(h).toContain(`id="${id}"`);
  });

  it("«Revocar ligas» NO se bloquea por cambios sin guardar: revocar es independiente", () => {
    expect(estaDeshabilitado(boton(html(true), "Revocar ligas"))).toBe(false);
  });

  it("explica en la pantalla qué es y cuánto dura, sin prometer RSVP", () => {
    const h = html(false);
    expect(h).toContain("Vista previa privada");
    expect(h).toContain("vence en 7 días");
    expect(h).toContain("no permite confirmar asistencia");
  });

  it("ambos botones son de 44 px (el proyecto lo exige en CTAs y en controles destructivos)", () => {
    const h = html(false);
    expect(boton(h, "Copiar liga de vista previa")).toContain("h-11");
    expect(boton(h, "Revocar ligas")).toContain("h-11");
  });

  it("no pinta la liga ni la confirmación hasta que hacen falta", () => {
    const h = html(false);
    expect(h).not.toContain("Liga de vista previa para copiar");
    expect(h).not.toContain("Las ligas que ya compartiste dejarán de abrir");
  });
});

describe("guardas estructurales del botón", () => {
  const componente = sinComentarios(leer("src/components/editor/vista-previa-controls.tsx"));
  const panel = sinComentarios(leer("src/components/editor/shell/panel-propiedades.tsx"));

  it("el ancla existe", () => {
    expect(componente).toContain("export function VistaPreviaControls");
    expect(panel).toContain("<VistaPreviaControls");
  });

  it("el componente de cliente NO importa `token.ts` (arrastraría `node:crypto` al navegador)", () => {
    expect(componente).not.toMatch(/from\s+["']@\/lib\/previews\/token["']/);
    expect(componente).not.toContain("node:");
    expect(componente).toMatch(/from\s+["']@\/lib\/previews\/vigencia["']/);
  });

  it("si el portapapeles falla, MUESTRA la liga en vez de decir «copiada»", () => {
    const ini = componente.indexOf("await navigator.clipboard.writeText(r.url)");
    expect(ini, "ancla del portapapeles no encontrada").toBeGreaterThan(-1);
    const bloque = componente.slice(ini, componente.indexOf("function revocar", ini));
    expect(bloque).toContain("catch");
    expect(bloque).toContain("setLigaParaCopiar(r.url)");
    // El éxito se anuncia DESPUÉS de copiar, no antes.
    expect(bloque.indexOf("toast.success")).toBeGreaterThan(bloque.indexOf("writeText"));
  });

  it("revocar pide confirmación antes de llamar a la acción", () => {
    expect(componente).toContain("<AlertDialog");
    const boton = componente.search(/Revocar ligas\s*<\/Button>/);
    expect(boton, "ancla del botón de revocar no encontrada").toBeGreaterThan(-1);
    const llamada = componente.indexOf("await revocarVistasPrevias(");
    const abre = componente.indexOf("setConfirmando(true)");
    expect(abre).toBeGreaterThan(-1);
    expect(abre).toBeLessThan(boton);
    // La acción solo se invoca desde `revocar`, que cuelga del botón del diálogo.
    expect(componente).toMatch(/<AlertDialogAction onClick=\{revocar\}>/);
    expect(llamada).toBeGreaterThan(-1);
  });

  it("el panel lo monta SIEMPRE (publicada o no), pasando `dirty`", () => {
    const monta = panel.indexOf("<VistaPreviaControls");
    expect(panel).toMatch(/<VistaPreviaControls\s+invitationId=\{invitation\.id\}\s+dirty=\{dirty\}/);
    // Está ANTES de la tarjeta que sí exige estar publicada...
    expect(monta).toBeLessThan(panel.indexOf("<VanitySlugCard"));
    // ...y NO cuelga de ninguna condición: lo que lo precede inmediatamente es el
    // cierre de `PublishControls`, no un `is_published &&` ni un ternario. (La
    // versión anterior buscaba la OTRA condición más adelante y la encontraba:
    // envolver el botón en `is_published &&` no rompía nada. Mutado: sobrevivía.)
    const finPublish = panel.lastIndexOf("/>", monta);
    expect(finPublish, "no se encontró el cierre de PublishControls").toBeGreaterThan(-1);
    const entre = panel.slice(finPublish, monta).replace(/\s+/g, "");
    expect(entre).toBe("/>");
  });
});
