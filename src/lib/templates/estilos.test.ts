import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ESTILOS, ESTILO_POR_SLUG, estiloDe } from "./estilos";

/**
 * Las vistas previas (`public/previews/plantillas/<slug>.jpg`) existen para
 * TODAS las plantillas activas: la galería las pinta. Son la lista de slugs que
 * el catálogo realmente muestra y por eso se usan como fuente de verdad: una
 * plantilla nueva trae su imagen y esta prueba exige que traiga su estilo.
 */
const slugsConVistaPrevia = readdirSync("public/previews/plantillas")
  .filter((f) => f.endsWith(".jpg"))
  .map((f) => f.replace(/\.jpg$/, ""));

describe("estilo de las plantillas", () => {
  it("hay vistas previas que revisar", () => {
    expect(slugsConVistaPrevia.length).toBeGreaterThanOrEqual(65);
  });

  it("cada plantilla del catálogo tiene un estilo válido", () => {
    const validos = new Set<string>(ESTILOS.map((e) => e.clave));
    const sinEstilo = slugsConVistaPrevia.filter((s) => !validos.has(estiloDe(s) ?? ""));
    expect(sinEstilo, `sin estilo: ${sinEstilo.join(", ")}`).toEqual([]);
  });

  it("no quedan estilos de plantillas que ya no existen", () => {
    const existentes = new Set(slugsConVistaPrevia);
    const huerfanos = Object.keys(ESTILO_POR_SLUG).filter((s) => !existentes.has(s));
    expect(huerfanos).toEqual([]);
  });

  it("todos los estilos se usan y ninguno concentra más de la mitad", () => {
    const cuenta = new Map<string, number>();
    for (const s of slugsConVistaPrevia) cuenta.set(estiloDe(s)!, (cuenta.get(estiloDe(s)!) ?? 0) + 1);
    for (const e of ESTILOS) expect(cuenta.get(e.clave) ?? 0, e.clave).toBeGreaterThan(0);
    for (const [clave, n] of cuenta) expect(n, clave).toBeLessThanOrEqual(slugsConVistaPrevia.length / 2);
  });

  it("el estilo es transversal: cada uno aparece en al menos dos tipos de evento", () => {
    // El tipo de evento sale del prefijo del slug, que sigue el catálogo.
    const evento = (s: string) => s.split("-")[0];
    for (const e of ESTILOS) {
      const eventos = new Set(
        slugsConVistaPrevia.filter((s) => estiloDe(s) === e.clave).map(evento),
      );
      expect(eventos.size, `${e.clave}: ${[...eventos].join(", ")}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("una plantilla desconocida no tiene estilo", () => {
    expect(estiloDe("no-existe")).toBeNull();
  });
});
