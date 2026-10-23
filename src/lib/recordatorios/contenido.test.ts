import { describe, expect, it } from "vitest";
import {
  armarCorreo,
  escaparHtml,
  tituloSeguro,
} from "@/lib/recordatorios/contenido";
import type { TipoRecordatorio } from "@/lib/recordatorios/ventanas";

const EDITOR = "https://sobrely.test/editor/abc";
const BAJA = "https://sobrely.test/recordatorios/baja?u=1&t=2";

function correo(tipo: TipoRecordatorio, titulo = "Boda de Ana y Luis", dias: number | null = 5) {
  return armarCorreo({ tipo, titulo, diasParaEvento: dias, editorUrl: EDITOR, bajaUrl: BAJA });
}

describe("todo correo lleva baja, motivo y enlace al editor", () => {
  for (const tipo of ["borrador_24h", "borrador_3d", "evento_7d"] as const) {
    it(`${tipo}: HTML y texto`, () => {
      const c = correo(tipo);
      expect(c.html).toContain(escaparHtml(BAJA));
      expect(c.texto).toContain(BAJA);
      expect(c.html).toContain(escaparHtml(EDITOR));
      expect(c.texto).toContain(EDITOR);
      expect(c.texto).toContain("pediste recordatorios");
      expect(c.html).toContain("pediste recordatorios");
    });
  }
  it("sin enlace de baja NO se arma (no es opcional)", () => {
    expect(() =>
      armarCorreo({ tipo: "borrador_24h", titulo: "x", diasParaEvento: null, editorUrl: EDITOR, bajaUrl: "" }),
    ).toThrow();
  });
  it("sin enlace al editor tampoco", () => {
    expect(() =>
      armarCorreo({ tipo: "borrador_24h", titulo: "x", diasParaEvento: null, editorUrl: "", bajaUrl: BAJA }),
    ).toThrow();
  });
});

describe("el título del usuario no inyecta nada", () => {
  const MALO = '<img src=x onerror=alert(1)> "comillas" & \'simples\'';
  it("se escapa en el HTML", () => {
    const c = correo("borrador_24h", MALO);
    expect(c.html).not.toContain("<img");
    expect(c.html).toContain("&lt;img");
    expect(c.html).toContain("&quot;comillas&quot;");
  });
  it("el asunto no admite saltos de línea (inyección de cabeceras)", () => {
    const c = correo("borrador_24h", "Hola\r\nBcc: victima@x.com");
    expect(c.asunto).not.toMatch(/[\r\n]/);
  });
  it("tituloSeguro: una línea, sin control, acotado, con valor por omisión", () => {
    expect(tituloSeguro("a\n\tb\u0000c")).toBe("a b c");
    expect(tituloSeguro("   ")).toBe("tu invitación");
    expect(tituloSeguro("")).toBe("tu invitación");
    expect(tituloSeguro("x".repeat(200)).length).toBe(80);
    expect(tituloSeguro("x".repeat(200)).endsWith("…")).toBe(true);
    expect(tituloSeguro("x".repeat(80))).toBe("x".repeat(80));
  });
  it("tituloSeguro neutraliza separadores de línea Unicode", () => {
    expect(tituloSeguro("a\u2028b\u2029c\u00a0d")).toBe("a b c d");
  });
  it("escaparHtml cubre los cinco caracteres", () => {
    expect(escaparHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("el texto no miente", () => {
  it("evento_7d: dice los días y que publicar requiere un plan de pago", () => {
    const c = correo("evento_7d", "Mi XV", 3);
    expect(c.asunto).toContain("3 días");
    expect(c.texto).toContain("requiere un plan de pago");
  });
  it("evento_7d en singular", () => {
    expect(correo("evento_7d", "Mi XV", 1).asunto).toContain("1 día ");
  });
  it("evento_7d sin días no pretende tenerlos: cae al texto de borrador", () => {
    const c = correo("evento_7d", "Mi XV", null);
    expect(c.asunto).not.toContain("null");
    expect(c.asunto).not.toContain("NaN");
  });
  it("ningún correo promete gratuidad ni urgencia falsa", () => {
    for (const tipo of ["borrador_24h", "borrador_3d", "evento_7d"] as const) {
      const c = correo(tipo);
      expect(c.texto).not.toMatch(/gratis|gratuit|oferta|última oportunidad|descuento/i);
    }
  });
  it("el asunto de cada tipo es distinto", () => {
    const a = new Set(
      (["borrador_24h", "borrador_3d", "evento_7d"] as const).map((t) => correo(t).asunto),
    );
    expect(a.size).toBe(3);
  });
});
