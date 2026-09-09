import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HERO_VARIANTS,
  SECTION_ALIGNS,
  SECTION_FRAMES,
} from "@/lib/modules/types";

/**
 * Contrato de la migración `0042`, que reparte la composición de las 13 bodas.
 *
 * Por qué se prueba un `.sql`: sus valores son cadenas sueltas dentro de un
 * `values (...)`, sin tipos que las respalden. Un `'centred'` o un `'lines'`
 * no lo caza `tsc` ni el linter — se descubriría al aplicar la migración en
 * PRODUCCIÓN, y el `jsonb_set` la escribiría igual porque a Postgres le da lo
 * mismo. El esquema zod la rechazaría después, al LEER, y la plantilla
 * perdería su config.
 *
 * Y lo segundo que se comprueba es la razón de ser de la migración: que las 13
 * combinaciones sean DISTINTAS. Si dos coinciden, el trabajo no sirvió para
 * nada y nadie lo notaría hasta comparar miniaturas a ojo.
 */

const SQL = readFileSync(
  join(process.cwd(), "supabase/migrations/0042_boda_composicion_distinta.sql"),
  "utf8",
);

type Fila = { slug: string; variant: string; frame: string; align: string };

/** Extrae las tuplas del bloque `values (...)`, que es la fuente de verdad. */
function filas(): Fila[] {
  const re =
    /\('(boda-[a-z-]+)',\s*'([a-z]+)',\s*'([a-z]+)',\s*'([a-z]+)'\)/g;
  return [...SQL.matchAll(re)].map((m) => ({
    slug: m[1],
    variant: m[2],
    frame: m[3],
    align: m[4],
  }));
}

describe("0042 · composición de las bodas", () => {
  it("declara las 13 bodas", () => {
    expect(filas()).toHaveLength(13);
  });

  it("no repite ninguna plantilla", () => {
    const slugs = filas().map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("cada combinación es única — que es el objetivo entero", () => {
    const combos = filas().map((f) => `${f.variant}|${f.frame}|${f.align}`);
    const repetidas = combos.filter((c, i) => combos.indexOf(c) !== i);
    expect(repetidas).toEqual([]);
  });

  it("toda variante existe en HERO_VARIANTS", () => {
    const malas = filas().filter(
      (f) => !(HERO_VARIANTS as readonly string[]).includes(f.variant),
    );
    expect(malas).toEqual([]);
  });

  it("todo marco existe en SECTION_FRAMES", () => {
    const malos = filas().filter(
      (f) => !(SECTION_FRAMES as readonly string[]).includes(f.frame),
    );
    expect(malos).toEqual([]);
  });

  it("toda alineación existe en SECTION_ALIGNS", () => {
    const malas = filas().filter(
      (f) => !(SECTION_ALIGNS as readonly string[]).includes(f.align),
    );
    expect(malas).toEqual([]);
  });

  it("`split` sólo se usa en las dos que tienen foto de portada", () => {
    // Sin imagen, `split` reserva media caja para una figura que no existe.
    // La migración lleva además una guarda SQL, pero el reparto ya no debería
    // proponerlo: esto lo fija por escrito.
    const conSplit = filas().filter((f) => f.variant === "split").map((f) => f.slug);
    expect(conSplit.sort()).toEqual(["boda-jardin-partido", "boda-marco-nuestro"]);
  });

  it("la minimalista va sin adornos, como dice su descripción", () => {
    const m = filas().find((f) => f.slug === "boda-minimalista")!;
    expect(m.frame).toBe("none");
    expect(m.variant).toBe("plain");
  });

  it("la migración conserva la guarda de foto para `split`", () => {
    // OJO: la primera versión de esta prueba buscaba la palabra `imageUrl`
    // suelta y SOBREVIVIÓ a un mutante que borraba la guarda entera — porque
    // la palabra sigue apareciendo en los comentarios y en el bloque de
    // verificación. Se comprueba la CLÁUSULA, no el vocabulario: la condición
    // completa, con sus espacios y saltos normalizados, y sólo en el cuerpo del
    // `update` (antes del primer comentario de cierre).
    const cuerpo = SQL.slice(0, SQL.indexOf("-- ====", SQL.indexOf("values")));
    const plano = cuerpo.replace(/\s+/g, " ");
    expect(plano).toContain(
      "and (v.variant <> 'split' or coalesce(t.modules_config #>> '{0,config,imageUrl}', '') <> '')",
    );
  });
});
