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

const MIGRACIONES = [
  "0032_seed_piloto_fase11_f4_f5.sql",
  "0033_seed_piloto_fase11_f1_f3.sql",
] as const;

const leerMigracion = (nombre: string) =>
  readFileSync(
    fileURLToPath(
      new URL(`../../../supabase/migrations/${nombre}`, import.meta.url),
    ),
    "utf8",
  );

const SQL = MIGRACIONES.map(leerMigracion).join("\n");

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
  const trozos = MIGRACIONES.flatMap((nombre) => {
    const sql = leerMigracion(nombre);
    const iValues = sql.indexOf("\nvalues");
    const cuerpo = sql.slice(iValues, sql.indexOf("on conflict", iValues));
    return cuerpo.split(/\n\(\n/).slice(1);
  });
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
  it("trae las 15 del piloto y ningún slug repetido", () => {
    // 8 en la `0032` (F4/F5) + 7 en la `0033` (F1/F3). Sin esta aserción de
    // CONTEO, un extractor roto dejaría los `it.each` con cero casos y la suite
    // en verde sin probar nada — que es justo lo que pasó la primera vez.
    expect(FILAS).toHaveLength(15);
    expect(new Set(FILAS.map((f) => f.slug)).size).toBe(15);
  });

  it("el JSON de las 30 columnas es válido", () => {
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
          expect(
            leido[campo],
            `${f.slug} · ${m.module_type} · ${campo}`,
          ).toEqual(valor);
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
    const clave = url
      .replace(/^\/arte\/(foto\/)?/, "")
      .replace(/\.(svg|jpg)$/, "");
    const arte = buscarArte(clave);
    expect(arte, `${clave} no está en arte.ts`).toBeTruthy();
    expect(t.backgroundImage.overlay, `${f.slug} · velo`).toBe(arte!.overlay);
  });

  it("toda imagen referenciada existe en disco y está registrada en arte.ts", () => {
    // Recorre heroes Y slots de media. Que exista en disco no basta: tiene que
    // estar en `arte.ts`, que es donde vive el velo MEDIDO y la polaridad. Una
    // foto suelta en `public/` sin registrar es una foto sin procedencia.
    const urls = FILAS.flatMap((f) =>
      f.modulos.flatMap((m) => {
        const c = m.config as {
          imageUrl?: string;
          media?: { url?: string };
        };
        return [c.imageUrl, c.media?.url].filter((u): u is string =>
          Boolean(u),
        );
      }),
    );
    expect(urls.length).toBeGreaterThanOrEqual(8);
    for (const url of urls) {
      expect(url.startsWith("/"), `${url} no la sirve la app`).toBe(true);
      expect(existsSync(RAIZ_PUBLIC + url), `${url} no existe en disco`).toBe(
        true,
      );
      const clave = url
        .replace(/^\/arte\/(foto\/)?/, "")
        .replace(/\.(svg|jpg)$/, "");
      expect(
        ARTE.some((a) => a.clave === clave),
        `${clave} no está registrada en arte.ts`,
      ).toBe(true);
    }
  });
});

/** Ancho y alto de un JPEG, leídos de sus marcadores SOF. Sin dependencias. */
function medidasJpeg(ruta: string): { w: number; h: number } | null {
  const b = readFileSync(ruta);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marca = b[i + 1];
    // SOF0..SOF15, saltando DHT(c4), JPG(c8) y DAC(cc), que no llevan medidas.
    if (
      marca >= 0xc0 &&
      marca <= 0xcf &&
      marca !== 0xc4 &&
      marca !== 0xc8 &&
      marca !== 0xcc
    ) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

/**
 * Estado EFECTIVO del piloto: los seeds, con lo que sobrescriben las
 * migraciones posteriores.
 *
 * Una migración aplicada no se edita, así que la verdad no vive en un solo
 * archivo: es la `0032`/`0033` más lo que corrigen la `0034` (proporción del
 * slot de media) y la `0035` (conversión de las F4 y proporción del hero). Todo
 * se PARSEA del SQL — una lista escrita a mano aquí se quedaría vieja sin
 * avisar.
 */
type Sobrescritura = {
  mediaRatio?: string;
  variant?: string;
  imageUrl?: string;
  imageRatio?: string;
};

function sobrescrituras(): Map<string, Sobrescritura> {
  const m = new Map<string, Sobrescritura>();
  const poner = (slug: string, s: Sobrescritura) =>
    m.set(slug, { ...(m.get(slug) ?? {}), ...s });

  const s34 = leerMigracion("0034_fix_proporcion_media_piloto.sql");
  const r34 = /'\{1,config,media,ratio\}',\s*'"([^"]+)"'/.exec(s34)?.[1];
  if (r34) {
    const lista = /where slug in \(([^)]+)\)/.exec(s34)?.[1] ?? "";
    for (const g of lista.match(/'([a-z0-9-]+)'/g) ?? [])
      poner(g.replace(/'/g, ""), { mediaRatio: r34 });
  }

  const s35 = leerMigracion("0035_convertir_f4_a_fotografia.sql")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  for (const t of s35.matchAll(
    /\('([a-z0-9-]+)',\s*'([a-z]+)',\s*'([^']+)',\s*'([0-9/]+)'\)/g,
  ))
    poner(t[1], { variant: t[2], imageUrl: t[3], imageRatio: t[4] });
  for (const t of s35.matchAll(/\('([a-z0-9-]+)',\s*'([0-9/]+)'\)/g))
    poner(t[1], { imageRatio: t[2] });
  const solo = /slug = '([a-z0-9-]+)'/.exec(s35)?.[1];
  const foto = /'"(\/arte\/foto\/[^"]+)"'::jsonb/.exec(s35)?.[1];
  if (solo && foto) poner(solo, { variant: "centered", imageUrl: foto });

  return m;
}

describe("la proporción del slot coincide con la de la fotografía", () => {
  // El hueco que dejó pasar el fallo: el slot pinta con `object-fit: cover`, así
  // que declarar una proporción que no es la de la fuente NO da error — recorta
  // en silencio. En `baby-punto-y-flor` costaba el 50 % del ancho, y como el
  // sujeto está a un lado y el recorte es CENTRADO, la miniatura salía con la
  // pared vacía. Sólo se vio mirándola; ahora lo caza la suite.
  const OVER = sobrescrituras();

  /** Proporción efectiva de la figura del hero cuando dice `auto`. */
  const AUTO: Record<string, string> = { split: "3/4", editorial: "4/3" };

  const slots = FILAS.flatMap((f) =>
    f.modulos.flatMap((m) => {
      const o = OVER.get(f.slug) ?? {};
      const c = m.config as {
        media?: { url?: string; ratio?: string };
        imageUrl?: string;
        variant?: string;
        imageRatio?: string;
      };
      const out: { slug: string; url: string; ratio: string; donde: string }[] =
        [];
      if (c.media?.url) {
        out.push({
          slug: f.slug,
          url: c.media.url,
          ratio: o.mediaRatio ?? c.media.ratio ?? "4/3",
          donde: "media",
        });
      }
      // El HERO también recorta, y ese era el hueco: `boda-jardin-partido`
      // perdía el 50 % del ancho y la prueba no lo miraba porque sólo cubría el
      // slot de media.
      const url = o.imageUrl ?? c.imageUrl;
      const variant = o.variant ?? c.variant;
      // `centered` pinta la foto A SANGRE, no dentro de una figura: no hay caja
      // que pueda desencajar, así que esa variante no entra aquí.
      if (url && (variant === "split" || variant === "editorial")) {
        const decl = o.imageRatio ?? c.imageRatio;
        const r = decl && decl !== "auto" ? decl : AUTO[variant];
        out.push({ slug: f.slug, url, ratio: r, donde: `hero/${variant}` });
      }
      return out;
    }),
  );

  it("hay slots que comprobar", () => {
    expect(slots.length).toBeGreaterThanOrEqual(2);
  });

  it.each(
    slots.map((s) => [`${s.slug} · ${s.donde} · ${s.ratio}`, s] as const),
  )("%s no recorta más del 15 %", (_t, s) => {
    const med = medidasJpeg(RAIZ_PUBLIC + s.url);
    expect(med, `${s.url} no es un JPEG legible`).toBeTruthy();
    const [a, b] = s.ratio.split("/").map(Number);
    const pCaja = a / b;
    const pFuente = med!.w / med!.h;
    // LOS DOS EJES. La primera versión sólo miraba el recorte lateral, y una
    // caja MÁS ANCHA que la fuente recorta igual, sólo que por arriba y abajo.
    const recorte = pCaja < pFuente ? 1 - pCaja / pFuente : 1 - pFuente / pCaja;
    const eje = pCaja < pFuente ? "lateral" : "vertical";
    expect(
      Math.round(recorte * 100),
      `${s.slug} · ${s.donde}: caja ${pCaja.toFixed(2)} vs fuente ${pFuente.toFixed(2)} (${eje})`,
    ).toBeLessThanOrEqual(15);
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
