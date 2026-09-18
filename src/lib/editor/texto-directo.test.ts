import { describe, expect, it } from "vitest";

import { sanearTexto, topeDeCampo, valorDeCampo } from "@/lib/editor/texto-directo";
import { moduleConfigWriteSchemas, MODULE_TYPES, type ModuleType } from "@/lib/modules/types";
import { bloquesDe } from "@/lib/editor/bloques";

/**
 * La edición directa escribe en `config` jsonb y ese texto se re-renderiza en la
 * PÁGINA PÚBLICA, que ven invitados que no son el dueño. Es contenido de usuario
 * mostrado a terceros, así que el saneado es la barrera, no un detalle.
 */

describe("el saneado deja TEXTO PLANO", () => {
  const VENENOS = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<iframe src='javascript:alert(1)'>",
    "</h3><script>fetch('//evil.tld')</script>",
    "javascript:alert(document.domain)",
    "<style>*{display:none}</style>",
  ];

  it.each(VENENOS.map((v, i) => [i, v] as const))(
    "veneno %i sale como una sola línea plana",
    (_i, veneno) => {
      const salida = sanearTexto(veneno, null);
      // No se pretende que el saneado BORRE caracteres: React escapa al pintar,
      // así que `<script>` como TEXTO es inofensivo, y borrarlo destruiría
      // contenido legítimo (un título que hable de «<3», por ejemplo). Lo que
      // se exige es que no quede nada multilínea ni con bordes sucios, que es
      // lo que convierte un pegado en un dato que no se parece a lo que se ve.
      expect(salida).not.toMatch(/[\n\r\t]/);
      expect(salida).toBe(salida.trim());
    },
  );

  it("un pegado de Word no mete kilobytes de estilos ni saltos", () => {
    // El caso REAL: nadie pega `<script>`; la gente pega de Word y arrastra
    // cientos de líneas y tabulaciones. Eso se colapsa a una línea.
    const word = "Mis XV\r\n\r\n   años\n\n\t\tde fiesta   ";
    expect(sanearTexto(word, null)).toBe("Mis XV años de fiesta");
  });

  it("no deja espacios en los extremos", () => {
    expect(sanearTexto("   hola   ", null)).toBe("hola");
  });
});

describe("el tope sale del ESQUEMA, no de una tabla a mano", () => {
  // Si alguien baja `title` de 120 a 80 y aquí hubiera un número escrito a
  // mano, el editor dejaría teclear 120 y el GUARDADO fallaría — y el usuario
  // sólo vería «no se guarda», sin pista de por qué.
  it("lee los topes conocidos", () => {
    expect(topeDeCampo("hero", "title")).toBe(120);
    expect(topeDeCampo("hero", "subtitle")).toBe(200);
    expect(topeDeCampo("hero", "ctaLabel")).toBe(40);
    expect(topeDeCampo("welcome", "message")).toBe(1000);
    expect(topeDeCampo("map", "address")).toBe(300);
    expect(topeDeCampo("signatures", "buttonLabel")).toBe(40);
  });

  it("un campo que no existe devuelve null, no revienta", () => {
    expect(topeDeCampo("hero", "campoInventado")).toBeNull();
  });

  it("TODO campo editable de la tabla de bloques declara su tope", () => {
    // Un `campo` sin tope legible significaría que el editor deja escribir sin
    // límite y el guardado lo rechaza. Esto lo convierte en rojo.
    const sinTope: string[] = [];
    for (const t of MODULE_TYPES) {
      for (const b of bloquesDe(t)) {
        if (b.campo && topeDeCampo(t, b.campo) === null) sinTope.push(t + "." + b.campo);
      }
    }
    expect(sinTope).toEqual([]);
  });
});

describe("lo saneado SIEMPRE pasa el esquema de ESCRITURA", () => {
  // Cierra el círculo: si el saneado dejara pasar algo que el esquema de
  // escritura rechaza, el autoguardado fallaría y el trabajo no se guardaría.
  it.each(MODULE_TYPES.map((t) => [t] as const))("%s", (tipo) => {
    for (const b of bloquesDe(tipo as ModuleType)) {
      if (!b.campo) continue;
      const tope = topeDeCampo(tipo as ModuleType, b.campo);
      const bruto = ("<b>Ana & Carlos</b>\n".repeat(200) + "   ").slice(0, 5000);
      const valor = sanearTexto(bruto, tope);
      expect(valor.length, tipo + "." + b.campo + " excede su tope").toBeLessThanOrEqual(
        tope ?? Infinity,
      );
      const r = moduleConfigWriteSchemas[tipo as ModuleType].safeParse({ [b.campo]: valor });
      expect(r.success, tipo + "." + b.campo + ": el esquema de escritura lo rechaza").toBe(true);
    }
  });
});

describe("el valor se lee de config, no del DOM", () => {
  it("devuelve la cadena cuando la hay", () => {
    expect(valorDeCampo({ title: "Mis XV años" }, "title")).toBe("Mis XV años");
  });

  it("y cadena vacía cuando el campo no es texto o no está", () => {
    // Nunca `undefined`: entraría en el `contentEditable` como "undefined".
    expect(valorDeCampo({}, "title")).toBe("");
    expect(valorDeCampo({ title: 42 }, "title")).toBe("");
    expect(valorDeCampo({ title: null }, "title")).toBe("");
  });
});
