import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  dimensionesJpeg,
  elegirTarjetas,
  gruposCompletos,
  slugDeImagen,
  type Candidata,
} from "@/lib/social/seleccion-galeria";

const c = (slug: string, bytes: number): Candidata => ({ slug, bytes });
const CAT: Candidata[] = [
  c("a-liviana", 30_000),
  c("b-media", 50_000),
  c("c-pesada", 90_000),
  c("d-media2", 50_000),
  c("e-pesadisima", 120_000),
  c("f-liviana2", 31_000),
  c("g-media3", 60_000),
  c("h-media4", 61_000),
];

describe("elegirTarjetas", () => {
  it("sin prioritarias ordena por peso descendente", () => {
    expect(elegirTarjetas(CAT, { prioritarias: [], cantidad: 3, grupo: 0 })).toEqual([
      "e-pesadisima",
      "c-pesada",
      "h-media4",
    ]);
  });

  it("a igualdad de peso desempata por nombre (determinista)", () => {
    const r = elegirTarjetas([c("z", 10), c("a", 10), c("m", 10)], { prioritarias: [], cantidad: 3, grupo: 0 });
    expect(r).toEqual(["a", "m", "z"]);
  });

  it("las prioritarias van PRIMERO y en el orden dado, aunque pesen menos", () => {
    const r = elegirTarjetas(CAT, { prioritarias: ["a-liviana", "b-media"], cantidad: 4, grupo: 0 });
    expect(r.slice(0, 2)).toEqual(["a-liviana", "b-media"]);
    expect(r.slice(2)).toEqual(["e-pesadisima", "c-pesada"]);
  });

  it("una prioritaria que NO existe en el catálogo se ignora (no deja un hueco)", () => {
    const r = elegirTarjetas(CAT, { prioritarias: ["no-existe", "a-liviana"], cantidad: 2, grupo: 0 });
    expect(r).toEqual(["a-liviana", "e-pesadisima"]);
  });

  it("una prioritaria repetida cuenta una sola vez", () => {
    const r = elegirTarjetas(CAT, { prioritarias: ["a-liviana", "a-liviana"], cantidad: 3, grupo: 0 });
    expect(r.filter((s) => s === "a-liviana")).toHaveLength(1);
  });

  it("una candidata repetida en el catálogo ocupa un solo lugar", () => {
    const r = elegirTarjetas([c("x", 5), c("x", 99), c("y", 1)], { prioritarias: [], cantidad: 5, grupo: 0 });
    expect(r.sort()).toEqual(["x", "y"]);
  });

  it("los grupos son tandas consecutivas SIN repetir tarjeta", () => {
    const g0 = elegirTarjetas(CAT, { prioritarias: [], cantidad: 3, grupo: 0 });
    const g1 = elegirTarjetas(CAT, { prioritarias: [], cantidad: 3, grupo: 1 });
    expect(g0).toHaveLength(3);
    expect(g1).toHaveLength(3);
    expect(g0.filter((s) => g1.includes(s))).toEqual([]);
  });

  it("el último grupo puede venir corto y un grupo fuera de rango, vacío", () => {
    expect(elegirTarjetas(CAT, { prioritarias: [], cantidad: 3, grupo: 2 })).toHaveLength(2);
    expect(elegirTarjetas(CAT, { prioritarias: [], cantidad: 3, grupo: 3 })).toEqual([]);
  });

  it("no modifica el arreglo que recibe", () => {
    const copia = JSON.stringify(CAT);
    elegirTarjetas(CAT, { prioritarias: ["a-liviana"], cantidad: 3, grupo: 0 });
    expect(JSON.stringify(CAT)).toBe(copia);
  });

  it("cantidad o grupo inválidos fallan en voz alta", () => {
    expect(() => elegirTarjetas(CAT, { prioritarias: [], cantidad: 0, grupo: 0 })).toThrow();
    expect(() => elegirTarjetas(CAT, { prioritarias: [], cantidad: 2.5, grupo: 0 })).toThrow();
    expect(() => elegirTarjetas(CAT, { prioritarias: [], cantidad: 3, grupo: -1 })).toThrow();
  });
});

describe("gruposCompletos: una tanda incompleta no cuenta", () => {
  it("12 plantillas de 6 → 2; 11 → 1; 5 → 0", () => {
    expect(gruposCompletos(12, 6)).toBe(2);
    expect(gruposCompletos(11, 6)).toBe(1);
    expect(gruposCompletos(5, 6)).toBe(0);
  });
  it("entradas inválidas dan 0 y no lanzan", () => {
    expect(gruposCompletos(-3, 6)).toBe(0);
    expect(gruposCompletos(10, 0)).toBe(0);
    expect(gruposCompletos(10, 1.5)).toBe(0);
  });
});

describe("slugDeImagen", () => {
  it("lee el nombre de la URL real que sirve Next (medida en producción)", () => {
    const real =
      "/_next/image?url=%2Fpreviews%2Fplantillas%2Fxv-con-sesion.jpg%3Fv%3D202610230340&w=3840&q=75";
    expect(slugDeImagen(real)).toBe("xv-con-sesion");
  });
  it("también lee la ruta directa del archivo", () => {
    expect(slugDeImagen("https://sobrely.com/previews/plantillas/boda-elegante.jpg")).toBe("boda-elegante");
  });
  it("una imagen que no es una miniatura da null", () => {
    expect(slugDeImagen("/_next/image?url=%2Flogo.png&w=64")).toBeNull();
    expect(slugDeImagen("")).toBeNull();
  });
});

describe("dimensionesJpeg", () => {
  const dir = join(fileURLToPath(new URL("../../../public/previews/plantillas", import.meta.url)));

  it("lee las dimensiones REALES de todas las miniaturas del repo (840×1120)", () => {
    const archivos = readdirSync(dir).filter((f) => f.endsWith(".jpg"));
    expect(archivos.length).toBeGreaterThan(50); // no-vacuidad: si el directorio cambia, esto avisa
    for (const f of archivos) {
      expect(dimensionesJpeg(readFileSync(join(dir, f))), f).toEqual({ ancho: 840, alto: 1120 });
    }
  });

  it("lo que no es un JPEG da null", () => {
    expect(dimensionesJpeg(new Uint8Array([]))).toBeNull();
    expect(dimensionesJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(dimensionesJpeg(Buffer.from("no soy una imagen"))).toBeNull();
  });

  it("un archivo con la estructura de un JPEG pero SIN su firma inicial da null", () => {
    // Sin esta prueba, quitar la validación de la firma pasaba en verde: los demás
    // casos «no JPEG» eran tan cortos que el lector no encontraba nada de todos
    // modos. Aquí el cuerpo es el de una miniatura real; solo faltan los 2 primeros bytes.
    const real = readFileSync(join(dir, readdirSync(dir).find((f) => f.endsWith(".jpg"))!));
    expect(dimensionesJpeg(real)).not.toBeNull();
    expect(dimensionesJpeg(real.subarray(2))).toBeNull();
  });

  it("un JPEG truncado antes del marco da null en vez de lanzar", () => {
    const completo = readFileSync(join(dir, readdirSync(dir).find((f) => f.endsWith(".jpg"))!));
    expect(dimensionesJpeg(completo.subarray(0, 12))).toBeNull();
  });
});
