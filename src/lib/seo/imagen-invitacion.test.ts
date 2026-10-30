import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatosParaCompartir } from "./compartir-invitacion";

/**
 * El pintor de la imagen OG. `ImageResponse` se sustituye para leer lo que
 * recibe (árbol y opciones) sin rasterizar: lo que se prueba es que las fuentes
 * llegan a Satori y que el árbol las pide por nombre.
 */
const capturas = vi.hoisted(() => [] as { arbol: unknown; opciones: Record<string, unknown> }[]);
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(arbol: unknown, opciones: Record<string, unknown>) {
      capturas.push({ arbol, opciones });
    }
  },
}));

const { imagenDeInvitacion } = await import("./imagen-invitacion");
const { cargarFuentesOG, ARCHIVOS_FUENTE_OG, FAMILIA_OG } = await import("./fuentes-og");

const DATOS: DatosParaCompartir = {
  titulo: "Valeria y Mateo",
  tipoEvento: "Boda",
  fecha: "sábado, 12 de diciembre de 2026",
  colores: { fondo: "#fbf7ef", texto: "#2b2b2b", primario: "#8a6d3b" },
  conMarca: true,
};

const FUENTES = [
  { name: FAMILIA_OG, data: new ArrayBuffer(8), weight: 400 as const, style: "normal" as const },
  { name: FAMILIA_OG, data: new ArrayBuffer(8), weight: 700 as const, style: "normal" as const },
];

function familiaRaiz(arbol: unknown): unknown {
  return (arbol as { props: { style: { fontFamily?: unknown } } }).props.style.fontFamily;
}

beforeEach(() => {
  capturas.length = 0;
});

describe("imagenDeInvitacion: fuentes", () => {
  it("con fuentes: las pasa a ImageResponse y el árbol las pide por nombre", async () => {
    await imagenDeInvitacion(DATOS, { fuentes: FUENTES });
    expect(capturas).toHaveLength(1);
    expect(capturas[0].opciones.fonts).toEqual(FUENTES);
    expect(familiaRaiz(capturas[0].arbol)).toContain(FAMILIA_OG);
  });

  it("sin fuentes: no manda `fonts` (Satori usa su fuente por defecto)", async () => {
    await imagenDeInvitacion(DATOS, { fuentes: undefined });
    expect(capturas[0].opciones).not.toHaveProperty("fonts");
  });

  it("la genérica (null) también recibe las fuentes", async () => {
    await imagenDeInvitacion(null, { fuentes: FUENTES });
    expect(capturas[0].opciones.fonts).toEqual(FUENTES);
  });
});

describe("cargarFuentesOG", () => {
  const dirs: string[] = [];
  afterAll(async () => {
    await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
  });

  it("carpeta sin los archivos → undefined (defecto documentado)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "og-fuentes-"));
    dirs.push(dir);
    await expect(cargarFuentesOG(dir)).resolves.toBeUndefined();
  });

  it("con regular y negrita → dos fuentes de la familia, 400 y 700", async () => {
    const dir = await mkdtemp(join(tmpdir(), "og-fuentes-"));
    dirs.push(dir);
    for (const f of ARCHIVOS_FUENTE_OG) await writeFile(join(dir, f.archivo), "x");
    const fuentes = await cargarFuentesOG(dir);
    expect(fuentes?.map((f) => [f.name, f.weight, f.style])).toEqual([
      [FAMILIA_OG, 400, "normal"],
      [FAMILIA_OG, 700, "normal"],
    ]);
  });
});
