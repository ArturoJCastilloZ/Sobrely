import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `?publicar=1` reanuda la publicación al volver de crear la cuenta (T13). Publicar es un cambio
 * de estado que se dispara por NAVEGACIÓN, así que la condición del servidor no se puede aflojar
 * sin que alguien lo note: un enlace ajeno a `/editor/<id>?publicar=1` no debe publicar nada en
 * la cuenta de quien lo abra. Esta prueba lee el fuente (el efecto exige un navegador y una base
 * de datos reales) y exige las cuatro condiciones.
 */
const fuente = readFileSync("src/app/editor/[invitationId]/page.tsx", "utf8");
const inicio = fuente.indexOf("const reanudarPublicacion =");
const bloque = fuente.slice(inicio, fuente.indexOf(";", inicio) + 1);

describe("reanudarPublicacion (page del editor)", () => {
  it("existe el bloque", () => {
    expect(inicio).toBeGreaterThan(-1);
  });

  it.each([
    ["el parámetro pedido", /publicar === "1"/],
    ["una cuenta real, no la de un invitado", /is_anonymous !== true/],
    ["una invitación que aún no está publicada", /!initialInvitation\.is_published/],
    ["un inicio de sesión o un cambio de cuenta de hace segundos", /esInicioReciente\(user\.last_sign_in_at\)[\s\S]*esInicioReciente\(user\.updated_at\)/],
  ])("exige %s", (_nombre, patron) => {
    expect(bloque).toMatch(patron);
  });

  it("el cliente solo reanuda una vez y limpia el parámetro", () => {
    const editor = readFileSync("src/components/editor/invitation-editor.tsx", "utf8");
    expect(editor).toMatch(/reanudado\.current/);
    expect(editor).toMatch(/searchParams\.delete\("publicar"\)/);
  });

  it("la lista de progreso no puede deshabilitar Publicar", () => {
    const topBar = readFileSync("src/components/editor/shell/top-bar.tsx", "utf8");
    const progreso = readFileSync("src/components/editor/shell/progreso-esencial.tsx", "utf8");
    expect(topBar).not.toMatch(/progreso/i);
    expect(progreso).not.toMatch(/alternarPublicado|publicando|disabled/);
  });
});
