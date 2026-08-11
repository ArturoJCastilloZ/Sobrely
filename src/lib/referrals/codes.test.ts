import { describe, it, expect } from "vitest";

import {
  normalizeCode,
  isValidCodeFormat,
  generateCode,
} from "@/lib/referrals/codes";

describe("normalizeCode", () => {
  it("hace trim y pasa a mayúsculas", () => {
    expect(normalizeCode("  abcd123 ")).toBe("ABCD123");
  });
});

describe("isValidCodeFormat", () => {
  it("acepta códigos alfanuméricos de 5–12 chars", () => {
    expect(isValidCodeFormat("ABCD1")).toBe(true);
    expect(isValidCodeFormat("abcd123")).toBe(true); // normaliza internamente
  });

  it("rechaza demasiado corto, demasiado largo o con símbolos", () => {
    expect(isValidCodeFormat("AB12")).toBe(false); // 4
    expect(isValidCodeFormat("ABCDEFGHIJKLM")).toBe(false); // 13
    expect(isValidCodeFormat("ABC-123")).toBe(false); // símbolo
    expect(isValidCodeFormat("")).toBe(false);
  });
});

describe("generateCode", () => {
  it("genera 7 chars del alfabeto legible (sin 0/O/1/I/L)", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCode();
      expect(c).toHaveLength(7);
      expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
    }
  });

  it("produce un código con formato válido", () => {
    expect(isValidCodeFormat(generateCode())).toBe(true);
  });
});
