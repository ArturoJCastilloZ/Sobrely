import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HERO_VARIANTS,
  SECTION_ALIGNS,
  SECTION_FRAMES,
} from "@/lib/modules/types";

/**
 * Contrato de la composición de BODA, repartida por la `0042` y corregida por
 * la `0043`.
 *
 * Por qué se prueban los `.sql`: sus valores son cadenas sueltas dentro de un
 * `values (...)`, sin tipos que las respalden. Un `'centred'` o un `'lines'` no
 * lo caza `tsc` ni el linter, Postgres lo escribiría igual, y el esquema zod
 * tiraría la config al LEER — la plantilla perdería su composición en silencio.
 *
 * Se comprueba el estado RESULTANTE de aplicar las dos en orden, no cada
 * archivo por su cuenta: lo que llega a producción es la suma.
 */

const dir = join(process.cwd(), "supabase/migrations");
const SQL_0042 = readFileSync(
  join(dir, "0042_boda_composicion_distinta.sql"),
  "utf8",
);
const SQL_0043 = readFileSync(
  join(dir, "0043_editorial_y_offset_tambien_piden_foto.sql"),
  "utf8",
);

type Fila = { slug: string; variant: string; frame: string; align: string };

function tuplas(sql: string): Fila[] {
  const re = /\('(boda-[a-z-]+)',\s*'([a-z]+)',\s*'([a-z]+)',\s*'([a-z]+)'\)/g;
  return [...sql.matchAll(re)].map((m) => ({
    slug: m[1],
    variant: m[2],
    frame: m[3],
    align: m[4],
  }));
}

/** Estado final: la `0043` pisa a la `0042` en las filas que toca. */
function estadoFinal(): Fila[] {
  const m = new Map(tuplas(SQL_0042).map((f) => [f.slug, f]));
  for (const f of tuplas(SQL_0043)) m.set(f.slug, f);
  return [...m.values()];
}

/**
 * Las variantes cuyo peso visual lo lleva la FOTOGRAFÍA. Sin imagen, `split`
 * reserva media caja vacía y `editorial`/`offset` dejan el título pequeño y a
 * un lado, sin nada que lo sostenga: se lee como el encabezado de un documento
 * y no como una portada.
 *
 * La `0042` sólo guardaba `split`. Era correcto e INCOMPLETO — las otras dos
 * se colaron y hubo que verlo MIRANDO las miniaturas, no leyendo el código.
 */
const PIDEN_FOTO = ["split", "editorial", "offset"] as const;

/**
 * Las bodas que tienen `hero.imageUrl`. Medido contra la BD el 2026-09-09; si
 * alguna gana o pierde su foto, esta lista miente y hay que actualizarla — por
 * eso la migración lleva ADEMÁS su propia guarda en SQL.
 */
const CON_FOTO = [
  "boda-jardin-partido",
  "boda-marco-nuestro",
  "boda-papel-y-lino",
];

describe("composición de las bodas · 0042 + 0043", () => {
  it("cubre las 13 bodas", () => {
    expect(estadoFinal()).toHaveLength(13);
  });

  it("cada combinación es única — que es el objetivo entero", () => {
    const combos = estadoFinal().map(
      (f) => `${f.variant}|${f.frame}|${f.align}`,
    );
    const repetidas = combos.filter((c, i) => combos.indexOf(c) !== i);
    expect(repetidas).toEqual([]);
  });

  it("toda variante, marco y alineación existe en su enum", () => {
    for (const f of estadoFinal()) {
      expect(HERO_VARIANTS as readonly string[], f.slug).toContain(f.variant);
      expect(SECTION_FRAMES as readonly string[], f.slug).toContain(f.frame);
      expect(SECTION_ALIGNS as readonly string[], f.slug).toContain(f.align);
    }
  });

  it("ninguna plantilla SIN foto usa una variante que la necesita", () => {
    const infractoras = estadoFinal()
      .filter((f) => (PIDEN_FOTO as readonly string[]).includes(f.variant))
      .filter((f) => !CON_FOTO.includes(f.slug))
      .map((f) => `${f.slug}:${f.variant}`);
    expect(infractoras).toEqual([]);
  });

  it("la minimalista va sin adornos, como dice su descripción", () => {
    const m = estadoFinal().find((f) => f.slug === "boda-minimalista")!;
    expect(m.variant).toBe("plain");
    expect(m.frame).toBe("none");
  });

  it("la 0042 conserva su guarda SQL de foto para `split`", () => {
    // OJO: la primera versión buscaba la palabra `imageUrl` suelta y SOBREVIVIÓ
    // a un mutante que borraba la guarda entera — la palabra sigue en los
    // comentarios y en el bloque de verificación. Se comprueba la CLÁUSULA
    // completa, con espacios normalizados y sólo dentro del cuerpo del update.
    const cuerpo = SQL_0042.slice(
      0,
      SQL_0042.indexOf("-- ====", SQL_0042.indexOf("values")),
    );
    expect(cuerpo.replace(/\s+/g, " ")).toContain(
      "and (v.variant <> 'split' or coalesce(t.modules_config #>> '{0,config,imageUrl}', '') <> '')",
    );
  });

  it("la 0043 sólo toca las que están en la variante equivocada", () => {
    const cuerpo = SQL_0043.slice(
      0,
      SQL_0043.indexOf("-- ====", SQL_0043.indexOf("values")),
    );
    expect(cuerpo.replace(/\s+/g, " ")).toContain(
      "and t.modules_config #>> '{0,config,variant}' in ('editorial', 'offset')",
    );
  });
});
