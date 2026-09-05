import { describe, expect, it } from "vitest";

import {
  isDuplicateSignature,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  normalizeSignatureText,
  sanitizeSignature,
} from "./sanitize";

describe("normalizeSignatureText", () => {
  it("recorta y colapsa espacios horizontales", () => {
    expect(normalizeSignatureText("  Ana   María  ")).toBe("Ana María");
  });

  it("CONSERVA los saltos de línea: firmar en varios renglones es a propósito", () => {
    expect(normalizeSignatureText("Felicidades\nlos queremos")).toBe(
      "Felicidades\nlos queremos",
    );
  });

  it("recorta la avalancha de saltos que empuja las demás firmas", () => {
    expect(normalizeSignatureText("Hola\n\n\n\n\n\nadiós")).toBe("Hola\n\nadiós");
  });

  it("normaliza los saltos de Windows", () => {
    expect(normalizeSignatureText("a\r\nb")).toBe("a\nb");
  });

  it("un texto de puros espacios queda vacío", () => {
    expect(normalizeSignatureText("   \n\n  \t ")).toBe("");
  });
});

describe("sanitizeSignature", () => {
  it("acepta una firma normal", () => {
    const r = sanitizeSignature({
      guestName: "  Ana  ",
      message: "  Felicidades a los dos  ",
    });
    expect(r).toEqual({
      ok: true,
      value: { guestName: "Ana", message: "Felicidades a los dos" },
    });
  });

  it("exige nombre", () => {
    const r = sanitizeSignature({ guestName: "   ", message: "hola" });
    expect(r).toEqual({ ok: false, error: "Escribe tu nombre." });
  });

  it("exige mensaje", () => {
    const r = sanitizeSignature({ guestName: "Ana", message: "  \n " });
    expect(r).toEqual({ ok: false, error: "Escribe tu mensaje." });
  });

  it("rechaza lo que no es texto", () => {
    for (const basura of [null, undefined, 42, {}, []]) {
      expect(sanitizeSignature({ guestName: basura, message: "hola" }).ok).toBe(
        false,
      );
      expect(sanitizeSignature({ guestName: "Ana", message: basura }).ok).toBe(
        false,
      );
    }
  });

  it("rechaza el nombre demasiado largo con su tope", () => {
    const r = sanitizeSignature({
      guestName: "a".repeat(MAX_NAME_LENGTH + 1),
      message: "hola",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(String(MAX_NAME_LENGTH));
  });

  it("rechaza el mensaje largo y DICE cuánto lleva, no lo recorta", () => {
    // Recortar en silencio deja al invitado descubriendo después que su
    // mensaje quedó a la mitad.
    const largo = "a".repeat(MAX_MESSAGE_LENGTH + 25);
    const r = sanitizeSignature({ guestName: "Ana", message: largo });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain(String(MAX_MESSAGE_LENGTH));
      expect(r.error).toContain(String(largo.length));
    }
  });

  it("acepta justo en el tope", () => {
    expect(
      sanitizeSignature({
        guestName: "a".repeat(MAX_NAME_LENGTH),
        message: "b".repeat(MAX_MESSAGE_LENGTH),
      }).ok,
    ).toBe(true);
  });

  it("lo que sale de aquí cumple los CHECK de la 0023", () => {
    // Si esto se rompiera, la base rechazaría con un 23514 en la cara del
    // invitado en vez de un mensaje entendible.
    const r = sanitizeSignature({ guestName: " Ana ", message: " hola " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.guestName.trim().length).toBeGreaterThanOrEqual(1);
      expect(r.value.guestName.trim().length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
      expect(r.value.message.trim().length).toBeGreaterThanOrEqual(1);
      expect(r.value.message.trim().length).toBeLessThanOrEqual(
        MAX_MESSAGE_LENGTH,
      );
    }
  });
});

describe("isDuplicateSignature", () => {
  const nueva = { guestName: "Ana", message: "Felicidades" };

  it("sin firma previa, nunca es duplicado", () => {
    expect(isDuplicateSignature(nueva, null)).toBe(false);
    expect(isDuplicateSignature(nueva, undefined)).toBe(false);
  });

  it("caza el doble clic aunque cambien mayúsculas y acentos", () => {
    // Es la causa real de los duplicados: "no pasó nada, le doy otra vez".
    expect(
      isDuplicateSignature(nueva, { guest_name: "ANA", message: "felicidades" }),
    ).toBe(true);
    expect(
      isDuplicateSignature(
        { guestName: "José", message: "Que vivan" },
        { guest_name: "jose", message: "que vivan" },
      ),
    ).toBe(true);
  });

  it("no confunde a dos personas distintas con el mismo mensaje", () => {
    expect(
      isDuplicateSignature(nueva, { guest_name: "Luis", message: "Felicidades" }),
    ).toBe(false);
  });

  it("no bloquea a la misma persona con un mensaje distinto", () => {
    expect(
      isDuplicateSignature(nueva, { guest_name: "Ana", message: "Otra cosa" }),
    ).toBe(false);
  });
});
