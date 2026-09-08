import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseConfig, type ModuleType } from "@/lib/modules/types";
import { parseTheme } from "@/lib/theme/theme";
import { ARTE, buscarArte } from "@/lib/theme/arte";

/**
 * Pre-vuelo del seed del piloto (`0032`), que está **sin aplicar**.
 *
 * Una migración de seed no se puede probar corriéndola: la base es de
 * producción y la aplica el dev a mano. Lo que sí se puede es leer el SQL y
 * pasar cada `theme_config` y cada `modules_config` por los MISMOS esquemas que
 * los leerán en vivo. Eso caza antes de tocar producción lo que si no se
 * descubre después: un enum mal escrito, un arte que no existe, un velo puesto
 * a ojo o un módulo que el plan Free no cubre.
 *
 * Es el mismo principio que ya salvó la fase: `parseConfig` descarta en
 * silencio lo que no valida, así que un typo aquí no daría error — daría una
 * plantilla a la que le faltan campos y nadie se entera.
 */

const SQL = readFileSync(
  fileURLToPath(
    new URL(
      "../../../supabase/migrations/0032_seed_piloto_fase11_f4_f5.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const RAIZ_PUBLIC = fileURLToPath(new URL("../../../public", import.meta.url));

type Fila = {
  slug: string;
  eventType: string;
  theme: unknown;
  modulos: { module_type: ModuleType; config: unknown }[];
};

/** Trocea el `insert` en filas. Cada una es `( … )` terminada en `true`. */
function filas(): Fila[] {
  // El corte busca `on conflict` DESPUÉS de `values`: la frase aparece también
  // en el comentario de cabecera, y cortando desde el principio el slice salía
  // vacío — lo que además dejaba los `it.each` sin casos, o sea en verde sin
  // probar nada. Lo cazó el conteo de 8.
  const iValues = SQL.indexOf("\nvalues");
  const cuerpo = SQL.slice(iValues, SQL.indexOf("on conflict", iValues));
  const trozos = cuerpo.split(/\n\(\n/).slice(1);
  return trozos.map((t) => {
    const textos = [...t.matchAll(/'((?:[^']|'')*)'/g)].map((m) =>
      m[1].replace(/''/g, "'"),
    );
    const theme = t.match(/'(\{[\s\S]*?\})'::jsonb/);
    const mods = t.match(/'(\[[\s\S]*?\])'::jsonb/);
    expect(theme, `sin theme_config en ${textos[1]}`).toBeTruthy();
    expect(mods, `sin modules_config en ${textos[1]}`).toBeTruthy();
    return {
      slug: textos[1],
      eventType: textos[3],
      theme: JSON.parse(theme![1]),
      modulos: JSON.parse(mods![1]),
    };
  });
}

const FILAS = filas();
/** Lo que el plan Free cubre (`src/lib/billing/plans.ts`). */
const MODULOS_FREE = ["hero", "welcome", "countdown", "rsvp"];

describe("el seed del piloto es legible por el producto", () => {
  it("trae las 8 plantillas", () => {
    expect(FILAS).toHaveLength(8);
    expect(new Set(FILAS.map((f) => f.slug)).size).toBe(8);
  });

  it("el JSON de las 16 columnas es válido", () => {
    // Si esto falla, el `insert` reventaría en producción a media migración.
    for (const f of FILAS) {
      expect(typeof f.theme, f.slug).toBe("object");
      expect(Array.isArray(f.modulos), f.slug).toBe(true);
    }
  });

  it.each(FILAS.map((f) => [f.slug, f] as const))(
    "%s · el tema sobrevive a parseTheme con su par tipográfico",
    (_s, f) => {
      const t = parseTheme(f.theme);
      // P4: el par es el punto de estas plantillas. Si `typography` no llegara,
      // renderizarían con una sola familia y nadie lo notaría.
      expect(t.typography).toBeDefined();
      expect(t.typography!.heading).toBeTruthy();
      expect(t.typography!.body).toBeTruthy();
    },
  );

  it.each(FILAS.map((f) => [f.slug, f] as const))(
    "%s · sólo usa módulos que el plan Free cubre",
    (_s, f) => {
      // Deliberado: estas 8 tienen que nacer publicables en gratuito.
      for (const m of f.modulos) {
        expect(MODULOS_FREE, `${f.slug} usa ${m.module_type}`).toContain(
          m.module_type,
        );
      }
    },
  );

  it.each(FILAS.map((f) => [f.slug, f] as const))(
    "%s · cada módulo sobrevive a parseConfig sin perder lo declarado",
    (_s, f) => {
      for (const m of f.modulos) {
        const declarado = m.config as Record<string, unknown>;
        const leido = parseConfig(m.module_type, declarado);
        // `parseConfig` DESCARTA en silencio lo que no valida, así que
        // comparar campo a campo es la única forma de saber que llegó entero.
        for (const [campo, valor] of Object.entries(declarado)) {
          expect(leido[campo], `${f.slug} · ${m.module_type} · ${campo}`).toEqual(
            valor,
          );
        }
      }
    },
  );
});

describe("el arte referenciado existe y su velo es el MEDIDO", () => {
  it.each(FILAS.map((f) => [f.slug, f] as const))("%s", (_s, f) => {
    const t = parseTheme(f.theme);
    const url = t.backgroundImage?.url;
    if (!url) return; // F4 sin textura: es una decisión, no un olvido

    expect(url.startsWith("/"), `${f.slug} enlaza fuera de la app`).toBe(true);
    expect(existsSync(RAIZ_PUBLIC + url), `${f.slug} → ${url} no existe`).toBe(
      true,
    );

    // El velo no se pone a ojo: sale de `verificar-contraste-arte.mts`.
    const clave = url.replace(/^\/arte\/(foto\/)?/, "").replace(/\.(svg|jpg)$/, "");
    const arte = buscarArte(clave);
    expect(arte, `${clave} no está en arte.ts`).toBeTruthy();
    expect(t.backgroundImage.overlay, `${f.slug} · velo`).toBe(arte!.overlay);
  });

  it("la fotografía del hero también sale del arte ya licenciado", () => {
    const conFoto = FILAS.flatMap((f) =>
      f.modulos
        .filter((m) => m.module_type === "hero")
        .map((m) => [f.slug, (m.config as { imageUrl?: string }).imageUrl] as const),
    ).filter(([, u]) => u);
    // Exactamente una: la F5. Si aparecieran más, alguien metió una imagen
    // nueva sin pasar por la conversación de licencias.
    expect(conFoto).toHaveLength(1);
    const [, url] = conFoto[0];
    expect(existsSync(RAIZ_PUBLIC + url!)).toBe(true);
    expect(ARTE.some((a) => url!.includes(a.clave))).toBe(true);
  });
});

describe("no pisa lo que ya existe", () => {
  it("es re-ejecutable", () => {
    expect(SQL).toContain("on conflict (slug) do nothing");
  });

  it("no toca ninguna fila existente: sólo inserta", () => {
    // Un `update` suelto aquí cambiaría las 50 sin que el nombre del archivo lo
    // diga. Los UPDATE de los pasos 2 y 3 van comentados, no ejecutables.
    const ejecutable = SQL.split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    expect(ejecutable).not.toMatch(/\bupdate\b/i);
    expect(ejecutable).not.toMatch(/\bdelete\b/i);
    expect(ejecutable).not.toMatch(/\bdrop\b/i);
  });

  it("las miniaturas se dejan en NULL: no se inventa una URL sin archivo", () => {
    const ejecutable = SQL.split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    expect(ejecutable).not.toContain("/previews/plantillas/");
  });
});
