import { describe, expect, it } from "vitest";
import {
  inviteMessage,
  isReachableByWhatsApp,
  normalizePhone,
  whatsappInviteUrl,
} from "./whatsapp";

describe("normalizePhone", () => {
  it("acepta lo que la gente teclea de verdad", () => {
    expect(normalizePhone("5512345678")).toBe("525512345678");
    expect(normalizePhone("55 1234 5678")).toBe("525512345678");
    expect(normalizePhone("(55) 1234-5678")).toBe("525512345678");
    expect(normalizePhone("  55-1234-5678  ")).toBe("525512345678");
  });

  it("respeta una lada internacional explícita", () => {
    expect(normalizePhone("+1 415 555 0132")).toBe("14155550132");
    expect(normalizePhone("+34 612 345 678")).toBe("34612345678");
  });

  it("entiende el prefijo internacional 00", () => {
    expect(normalizePhone("0052 55 1234 5678")).toBe("525512345678");
  });

  it("quita el 1 de larga distancia nacional", () => {
    expect(normalizePhone("1 55 1234 5678")).toBe("525512345678");
  });

  it("normaliza el viejo 521 de México a 52 + 10", () => {
    // WhatsApp ya no exige ese 1; conservarlo duplicaría el contacto.
    expect(normalizePhone("+521 55 1234 5678")).toBe("525512345678");
    expect(normalizePhone("5215512345678")).toBe("525512345678");
  });

  it("no inventa un número cuando no hay uno usable", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("no es un teléfono")).toBeNull();
    expect(normalizePhone("12345")).toBeNull(); // muy corto
    expect(normalizePhone("1".repeat(16))).toBeNull(); // pasa E.164
  });

  it("no confunde un + en medio con una lada internacional", () => {
    // "55+1234..." son 10 dígitos nacionales, no un internacional.
    expect(normalizePhone("55+1234 5678")).toBe("525512345678");
  });

  it("permite cambiar el país por defecto", () => {
    expect(normalizePhone("6123456780", "34")).toBe("346123456780");
  });
});

describe("isReachableByWhatsApp", () => {
  it("distingue un número usable de uno que no lo es", () => {
    expect(isReachableByWhatsApp("5512345678")).toBe(true);
    expect(isReachableByWhatsApp("")).toBe(false);
    expect(isReachableByWhatsApp("abc")).toBe(false);
  });
});

describe("inviteMessage", () => {
  const base = {
    guestName: "Mara González",
    eventTitle: "la boda de Ana y Luis",
    link: "https://sobrely.com/g/abc123",
  };

  it("le habla al invitado por su nombre y le da SU enlace", () => {
    const msg = inviteMessage(base);
    expect(msg).toContain("Mara González");
    expect(msg).toContain("la boda de Ana y Luis");
    expect(msg).toContain("https://sobrely.com/g/abc123");
  });

  it("nombra al anfitrión cuando se conoce", () => {
    expect(inviteMessage({ ...base, hostName: "Ana" })).toContain("Ana te invita");
  });

  it("sin anfitrión no deja un hueco en la frase", () => {
    const msg = inviteMessage({ ...base, hostName: null });
    expect(msg).toContain("Te invitamos a");
    expect(msg).not.toContain("undefined");
    expect(msg).not.toContain("null");
  });
});

describe("whatsappInviteUrl", () => {
  const base = {
    guestName: "Mara",
    eventTitle: "la boda",
    link: "https://sobrely.com/g/abc123",
  };

  it("arma el wa.me con los dígitos normalizados", () => {
    const url = whatsappInviteUrl({ ...base, phone: "55 1234 5678" })!;
    expect(url.startsWith("https://wa.me/525512345678?text=")).toBe(true);
  });

  it("codifica el mensaje para que el enlace no se rompa", () => {
    const url = whatsappInviteUrl({ ...base, phone: "5512345678" })!;
    // Ni saltos de línea ni espacios crudos dentro de la URL.
    expect(url).not.toMatch(/\s/);
    const text = decodeURIComponent(new URL(url).searchParams.get("text")!);
    expect(text).toContain("https://sobrely.com/g/abc123");
    expect(text).toContain("Mara");
  });

  it("devuelve null en vez de abrir un chat roto", () => {
    expect(whatsappInviteUrl({ ...base, phone: null })).toBeNull();
    expect(whatsappInviteUrl({ ...base, phone: "abc" })).toBeNull();
  });
});
