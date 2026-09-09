import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HERO_VARIANTS,
  SECTION_ALIGNS,
  SECTION_FRAMES,
} from "@/lib/modules/types";

/**
 * Contrato de la composición del catálogo, repartida por categorías.
 *
 * Por qué se prueban los `.sql`: sus valores son cadenas sueltas dentro de un
 * `values (...)`, sin tipos que las respalden. Un `'centred'` o un `'lines'` no
 * lo caza `tsc` ni el linter, Postgres lo escribiría igual, y el esquema zod
 * tiraría la config al LEER — la plantilla perdería su composición en silencio.
 *
 * Se comprueba el estado RESULTANTE de aplicar las migraciones en orden, no
 * cada archivo por su cuenta: lo que llega a producción es la suma.
 */

const DIR = join(process.cwd(), "supabase/migrations");
const leer = (f: string) => readFileSync(join(DIR, f), "utf8");

type Fila = { slug: string; variant: string; frame: string; align: string };

function tuplas(sql: string, prefijo: string): Fila[] {
  const re = new RegExp(
    `\\('(${prefijo}[a-z-]*)',\\s*'([a-z]+)',\\s*'([a-z]+)',\\s*'([a-z]+)'\\)`,
    "g",
  );
  return [...sql.matchAll(re)].map((m) => ({
    slug: m[1],
    variant: m[2],
    frame: m[3],
    align: m[4],
  }));
}

/** Las migraciones posteriores pisan a las anteriores, como en producción. */
function estadoFinal(archivos: string[], prefijo: string): Fila[] {
  const m = new Map<string, Fila>();
  for (const f of archivos) {
    for (const fila of tuplas(leer(f), prefijo)) m.set(fila.slug, fila);
  }
  return [...m.values()];
}

/**
 * Variantes cuyo peso visual lo lleva la FOTOGRAFÍA. Sin imagen, `split`
 * reserva media caja vacía y `editorial`/`offset` dejan el título pequeño y a
 * un lado, sin nada que lo sostenga: se lee como el encabezado de un documento.
 *
 * La lista empezó siendo sólo `split`, derivada de leer el CSS. Estaba
 * incompleta y hubo que verlo MIRANDO las miniaturas — costó la `0043`.
 */
const PIDEN_FOTO = ["split", "editorial", "offset"] as const;

/** Categorías repartidas hasta ahora, con las plantillas que SÍ tienen foto. */
const CATEGORIAS = [
  {
    nombre: "Boda",
    prefijo: "boda-",
    esperadas: 13,
    migraciones: [
      "0042_boda_composicion_distinta.sql",
      "0043_editorial_y_offset_tambien_piden_foto.sql",
    ],
    conFoto: [
      "boda-jardin-partido",
      "boda-marco-nuestro",
      "boda-papel-y-lino",
    ],
  },
  {
    nombre: "Cumpleaños",
    prefijo: "cumpleanos-",
    esperadas: 12,
    migraciones: ["0045_cumpleanos_composicion_distinta.sql"],
    conFoto: ["cumpleanos-arco", "cumpleanos-papel-picado"],
  },
  {
    nombre: "XV años",
    prefijo: "xv-",
    esperadas: 12,
    migraciones: ["0048_xv_composicion_distinta.sql"],
    conFoto: ["xv-corona", "xv-seda"],
  },
  {
    nombre: "Baby shower",
    prefijo: "baby-",
    esperadas: 12,
    migraciones: ["0050_baby_shower_composicion_distinta.sql"],
    // `baby-punto-y-flor` NO entra: su imagen vive en el SLOT del módulo, no en
    // la portada, y las variantes que piden foto miran `hero.imageUrl`.
    conFoto: ["baby-nube-de-algodon"],
  },
] as const;

describe.each(CATEGORIAS)(
  "composición · $nombre",
  ({ prefijo, esperadas, migraciones, conFoto }) => {
    const filas = () => estadoFinal([...migraciones], prefijo);

    it("cubre la categoría entera, no el subconjunto que se tocó", () => {
      // Contar el filtro en vez del universo ya provocó tres correcciones.
      expect(filas()).toHaveLength(esperadas);
    });

    it("cada combinación es única — que es el objetivo entero", () => {
      const combos = filas().map((f) => `${f.variant}|${f.frame}|${f.align}`);
      const repetidas = combos.filter((c, i) => combos.indexOf(c) !== i);
      expect(repetidas).toEqual([]);
    });

    it("toda variante, marco y alineación existe en su enum", () => {
      for (const f of filas()) {
        expect(HERO_VARIANTS as readonly string[], f.slug).toContain(f.variant);
        expect(SECTION_FRAMES as readonly string[], f.slug).toContain(f.frame);
        expect(SECTION_ALIGNS as readonly string[], f.slug).toContain(f.align);
      }
    });

    it("ninguna plantilla SIN foto usa una variante que la necesita", () => {
      const infractoras = filas()
        .filter((f) => (PIDEN_FOTO as readonly string[]).includes(f.variant))
        .filter((f) => !(conFoto as readonly string[]).includes(f.slug))
        .map((f) => `${f.slug}:${f.variant}`);
      expect(infractoras).toEqual([]);
    });
  },
);

/**
 * Un `update` que no llega a ejecutarse no da error: da «Success».
 *
 * Pasó de verdad con la primera versión de la `0044`, que eran DOS `update`
 * sueltos separados por un bloque de comentarios. El editor de Supabase ejecuta
 * la sentencia bajo el cursor, así que se corrió, dijo «Success» y no entró
 * nada — y sólo se descubrió al medir la BD después. Estas migraciones se
 * escriben como UNA sentencia con `returning`, para que el propio editor
 * muestre cuántas filas tocó.
 */
describe("las migraciones nuevas son ejecutables de una sola vez", () => {
  const SIN_COMENTARIOS = (f: string) =>
    leer(f)
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("--"))
      .join("\n");

  const ARCHIVOS = [
    "0044_arte_propio_de_cumpleanos.sql",
    "0045_cumpleanos_composicion_distinta.sql",
    "0047_arte_propio_de_xv.sql",
    "0048_xv_composicion_distinta.sql",
    "0049_arte_propio_de_baby_shower.sql",
    "0050_baby_shower_composicion_distinta.sql",
  ];

  it.each(ARCHIVOS)("%s es UNA sola sentencia", (f) => {
    const puntos = (SIN_COMENTARIOS(f).match(/;/g) ?? []).length;
    expect(puntos).toBe(1);
  });

  it.each(ARCHIVOS)("CADA `update` devuelve las filas que tocó", (f) => {
    // OJO: la primera versión buscaba la palabra `returning` en el archivo y
    // SOBREVIVIÓ a un mutante que se la quitaba a UNO de los dos `update` —
    // la palabra seguía estando, en el otro. Es el mismo falso verde del grep
    // de palabra suelta que ya se pagó con la guarda de `imageUrl`. Se cuentan.
    const sql = SIN_COMENTARIOS(f).toLowerCase();
    const updates = (sql.match(/\bupdate\s+public\.templates\b/g) ?? []).length;
    const returnings = (sql.match(/\breturning\b/g) ?? []).length;
    expect(updates).toBeGreaterThan(0);
    expect(returnings).toBe(updates);
  });
});

describe("guardas SQL de las migraciones de composición", () => {
  /**
   * OJO: la primera versión de estas aserciones buscaba la palabra `imageUrl`
   * suelta y SOBREVIVIÓ a un mutante que borraba la guarda entera — la palabra
   * sigue apareciendo en los comentarios y en el bloque de verificación. Se
   * comprueba la CLÁUSULA completa, con espacios normalizados y sólo dentro del
   * cuerpo del `update`.
   */
  const cuerpo = (f: string) => {
    const sql = leer(f);
    return sql
      .slice(0, sql.indexOf("-- ====", sql.indexOf("values")))
      .replace(/\s+/g, " ");
  };

  it("la 0042 guarda `split` contra la falta de foto", () => {
    expect(cuerpo("0042_boda_composicion_distinta.sql")).toContain(
      "and (v.variant <> 'split' or coalesce(t.modules_config #>> '{0,config,imageUrl}', '') <> '')",
    );
  });

  it("la 0043 sólo toca las que están en la variante equivocada", () => {
    expect(cuerpo("0043_editorial_y_offset_tambien_piden_foto.sql")).toContain(
      "and t.modules_config #>> '{0,config,variant}' in ('editorial', 'offset')",
    );
  });

  it.each([
    "0045_cumpleanos_composicion_distinta.sql",
    "0048_xv_composicion_distinta.sql",
    "0050_baby_shower_composicion_distinta.sql",
  ])("%s guarda LAS TRES variantes que piden foto, no sólo `split`", (f) => {
    // La lección de la 0043, ya incorporada de entrada en las dos categorías
    // posteriores.
    expect(cuerpo(f)).toContain(
      "and (v.variant not in ('split', 'editorial', 'offset') or coalesce(t.modules_config #>> '{0,config,imageUrl}', '') <> '')",
    );
  });

  it.each(["0047_arte_propio_de_xv.sql", "0049_arte_propio_de_baby_shower.sql"])(
    "%s no usa CTE: cada fila se toca UNA vez",
    (f) => {
      // La 0044 metió `cumpleanos-moderno` en DOS ramas de un CTE. Actualizar
      // la misma fila dos veces en una sentencia no está soportado: Postgres
      // descarta una de las dos EN SILENCIO. Salieron 9 filas en vez de 10.
      expect(cuerpo(f)).not.toContain("with ");
    },
  );

});
