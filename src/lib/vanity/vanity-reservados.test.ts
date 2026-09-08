import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RESERVED_SLUGS, isValidVanity } from "./validate";

/**
 * Guard contra el envejecimiento de `RESERVED_SLUGS`.
 *
 * En Next un segmento LITERAL gana al dinámico. La vanity vive en el primer
 * segmento (`/<vanity>`), así que cualquier carpeta top-level de `src/app`
 * cuyo nombre alguien pueda reclamar como vanity produce una URL que NUNCA
 * resuelve a su invitación. Y la vanity se cobra: el fallo es silencioso y
 * caro — pagas por un enlace que no lleva a ninguna parte.
 *
 * La lista ya se había quedado vieja: faltaban `blog`, `privacidad`,
 * `terminos` y las cinco landings `invitaciones-digitales-*`. Una lista a mano
 * envejece cada vez que alguien añade una ruta; este barrido no.
 *
 * Se filtra por `isValidVanity` en vez de por una longitud a mano, porque es
 * la MISMA función que decide si un nombre se puede reclamar. Si mañana se
 * permiten nombres de dos letras, `g` y `r` entran solos en el barrido sin que
 * nadie tenga que acordarse.
 */
const DIR_APP = fileURLToPath(new URL("../../app", import.meta.url));

function rutasTopLevel(): string[] {
  return readdirSync(DIR_APP, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    // `[param]` es dinámica y `(grupo)` no aparece en la URL: ninguna colisiona.
    .filter((e) => !e.name.startsWith("[") && !e.name.startsWith("("))
    .map((e) => e.name);
}

describe("toda ruta top-level reclamable está reservada", () => {
  const rutas = rutasTopLevel();

  it("el barrido encuentra rutas (no puede pasar en vacío)", () => {
    // Sin esta guarda, un `readdirSync` que apunte mal dejaría la prueba de
    // abajo verde por no tener nada que mirar.
    expect(rutas.length).toBeGreaterThan(5);
    expect(rutas).toContain("dashboard");
  });

  it("ninguna ruta reclamable como vanity queda fuera de RESERVED_SLUGS", () => {
    const reclamables = rutas.filter((r) => isValidVanity(r));
    const sinReservar = reclamables.filter((r) => !RESERVED_SLUGS.has(r));
    expect(
      sinReservar,
      `estas rutas top-level se pueden reclamar como vanity y NO están ` +
        `reservadas, asi que quien las reclame se queda con una URL que nunca ` +
        `resuelve a su invitacion: ${sinReservar.join(", ")}`,
    ).toEqual([]);
  });

  it("la ruta de captura de plantillas está reservada", () => {
    // Se añadió en la Fase 4 (`/plantilla/<slug>`); si alguien reclamara esa
    // vanity, chocaría con la ruta.
    expect(RESERVED_SLUGS.has("plantilla")).toBe(true);
  });
});
