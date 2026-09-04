import { describe, expect, it } from "vitest";
import { extForType, hasAlphaPixel, mayHaveAlpha } from "./compress";

/** Construye un buffer RGBA a partir de los valores alfa dados. */
function rgba(alphas: number[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(alphas.length * 4);
  alphas.forEach((a, i) => {
    out[i * 4] = 10;
    out[i * 4 + 1] = 20;
    out[i * 4 + 2] = 30;
    out[i * 4 + 3] = a;
  });
  return out;
}

describe("mayHaveAlpha", () => {
  it("un JPEG nunca trae alfa, así que no se escanea", () => {
    expect(mayHaveAlpha("image/jpeg")).toBe(false);
    expect(mayHaveAlpha("image/jpg")).toBe(false);
  });

  it("PNG, WebP, GIF, AVIF y SVG sí pueden traerla", () => {
    for (const t of [
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/svg+xml",
    ]) {
      expect(mayHaveAlpha(t), t).toBe(true);
    }
  });

  it("no distingue mayúsculas", () => {
    expect(mayHaveAlpha("IMAGE/PNG")).toBe(true);
  });
});

describe("hasAlphaPixel", () => {
  it("una imagen totalmente opaca no tiene alfa", () => {
    expect(hasAlphaPixel(rgba([255, 255, 255, 255]))).toBe(false);
  });

  it("detecta un solo píxel transparente al final", () => {
    expect(hasAlphaPixel(rgba([255, 255, 255, 0]))).toBe(true);
  });

  it("detecta transparencia parcial, no solo alfa 0", () => {
    expect(hasAlphaPixel(rgba([255, 254, 255]))).toBe(true);
  });

  it("un buffer vacío es opaco", () => {
    expect(hasAlphaPixel(new Uint8ClampedArray(0))).toBe(false);
  });
});

describe("extForType", () => {
  it("mapea los tipos que produce la compresión", () => {
    expect(extForType("image/webp")).toBe("webp");
    expect(extForType("image/png")).toBe("png");
    expect(extForType("image/jpeg")).toBe("jpg");
  });

  it("cae a jpg ante un tipo desconocido o vacío", () => {
    expect(extForType("image/tiff")).toBe("jpg");
    expect(extForType("")).toBe("jpg");
  });
});
