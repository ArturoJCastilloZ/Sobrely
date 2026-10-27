import { describe, expect, it } from "vitest";

import { destinoDeCta } from "@/lib/invitations/destino-cta";

// Las 27 etiquetas distintas que traen hoy las 65 plantillas (medidas en la base el 26 oct 2026).
const VER = ["Ver invitación", "Ver detalles", "Ver todo", "Ver el video", "Ver más", "Ver agenda", "Ver programa", "Ver mi sesión"];
const INVITAN = [
  "Acompáñanos", "Acompáñame", "Te espero", "Regístrate", "Inscríbete", "Celebra con nosotros", "Celébralo conmigo",
  "Confirmar", "¡Sí voy!", "¡Vamos!", "La gran revelación", "Quiero saber", "¡Rawr!", "Entra a la cancha",
  "Súbete a la nave", "Acepto la misión", "Entra", "Nuestra boda",
];

describe("destino de la etiqueta de la portada", () => {
  it("«Ver …» promete más contenido: baja a la sección que sigue", () => {
    for (const e of VER) expect(destinoDeCta(e), e).toBe("siguiente");
  });
  it("las que invitan a decir que sí bajan al formulario de confirmación", () => {
    for (const e of INVITAN) expect(destinoDeCta(e), e).toBe("confirmar");
  });
  it("tolera mayúsculas y espacios", () => {
    expect(destinoDeCta("  VER TODO ")).toBe("siguiente");
    expect(destinoDeCta("verano en familia")).toBe("confirmar");
  });
});
