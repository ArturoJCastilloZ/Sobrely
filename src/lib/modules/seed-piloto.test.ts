import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseConfig, type ModuleType } from "@/lib/modules/types";
import { parseTheme } from "@/lib/theme/theme";
import { ARTE, buscarArte } from "@/lib/theme/arte";
import {
  ANCHO_CAPTURA,
  ALTO_CAPTURA,
} from "@/lib/invitations/template-preview";

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

    // El velo no se pone a ojo: sale de `verificar-contraste-arte.mts`. Lo que
    // se exige aquí es que el arte esté REGISTRADO, que es donde vive el velo
    // medido y la procedencia.
    const clave = url
      .replace(/^\/arte\/(foto\/)?/, "")
      .replace(/\.(svg|jpg)$/, "");
    const arte = buscarArte(clave);
    expect(arte, `${clave} no está en arte.ts`).toBeTruthy();
    expect(typeof arte!.overlay, `${clave} sin velo declarado`).toBe("number");

    // ⚠️ Aquí ANTES se exigía `overlay === arte.overlay`, y ese modelo estaba
    // mal (2026-09-09, 3.ª sesión). Una migración de seed es HISTORIA
    // CONGELADA: no se puede reescribir, ya está aplicada. `arte.ts` es un
    // registro VIVO cuyo velo se re-mide cuando cambia el instrumento — y al
    // ensanchar la ventana del gate a la caja de texto medida, nueve velos
    // subieron. La igualdad se volvió imposible de satisfacer sin editar una
    // migración aplicada, que es peor que el problema.
    //
    // Y sobre todo: la igualdad no protegía a nadie. Lo que un usuario ve es la
    // FILA VIVA, no el `insert` original. `boda-papel-y-lino` es el caso: el
    // seed le puso `boda-lino-sello.svg` con velo 0.05, la campaña de
    // diferenciación le dio otro arte, y hoy su `backgroundImage` es NULL en la
    // base — medido. La prueba se ponía roja por un telón que ya no existe.
    //
    // El velo de lo que se RENDERIZA se comprueba contra la base con
    // `scripts/verificar-velos-en-vivo.mts`, que es donde ese invariante puede
    // ser cierto.
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

  // 0035 · conversiones en tuplas (slug, variante, foto, proporción) y ajustes
  // de proporción (slug, proporción).
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

  // Sentencias sueltas de un solo slug (la conversión a telón de la 0035, y la
  // 0036 entera). Se parsean GENÉRICAMENTE —sentencia a sentencia, cada una con
  // su `where slug = '…'` y sus literales— en vez de con un caso especial por
  // migración, que es lo que se queda viejo.
  for (const archivo of [
    "0035_convertir_f4_a_fotografia.sql",
    "0036_xv_seda_a_pastel_de_quince.sql",
    // La 0037 va DESPUÉS a propósito: reescribe el `imageRatio` que la 0035 le
    // había puesto a `boda-marco-nuestro`, y aquí gana el último que habla.
    "0037_las_dos_del_umbral_a_objeto_del_evento.sql",
    // La 0038 va al final: reescribe el `imageRatio` de seis plantillas y aqui
    // gana el ultimo que habla.
    "0038_proporcion_de_tarjeta_en_las_seis.sql",
  ]) {
    const limpio = leerMigracion(archivo)
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    for (const sent of limpio.split(";")) {
      const slug = /where slug = '([a-z0-9-]+)'/.exec(sent)?.[1];
      if (!slug) continue;
      const cambio: Sobrescritura = {};
      for (const t of sent.matchAll(
        /'\{0,config,(variant|imageUrl|imageRatio)\}',\s*'"([^"]+)"'/g,
      )) {
        if (t[1] === "variant") cambio.variant = t[2];
        if (t[1] === "imageUrl") cambio.imageUrl = t[2];
        if (t[1] === "imageRatio") cambio.imageRatio = t[2];
      }
      if (Object.keys(cambio).length) poner(slug, cambio);
    }
  }

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
    f.modulos.flatMap((m, i) => {
      // Las sobrescrituras de hero son del módulo 0 y SÓLO de ése. Antes se
      // aplicaba el objeto entero a CADA módulo, así que en cuanto una
      // sobrescritura traía `variant`, los cuatro módulos de la plantilla
      // pasaban el chequeo de hero con los datos del hero: 6 plantillas
      // generaban su caso 4 veces (medido). La aserción repetida era idéntica,
      // así que ningún veredicto salía mal — pero la prueba decía comprobar «el
      // hero» y estaba anclada también a `welcome`, `countdown` y `rsvp`, que es
      // el mismo mal anclaje que ya costó una sesión.
      //
      // Y se separan las DOS clases de sobrescritura, porque no viven en el
      // mismo módulo: la de la 0034 es del SLOT DE MEDIA —que cuelga de un
      // módulo que no es el hero— y las de la 0035/0036/0037 son del hero.
      // Gatear las dos tras `esHero` dejaba al slot de media sin su
      // sobrescritura, y la suite lo cazó en rojo: `baby-punto-y-flor` volvía a
      // 3/4 contra una fuente 1.50, o sea el 50 % de recorte que la 0034 había
      // arreglado.
      const esHero = i === 0 && m.module_type === "hero";
      const todo = OVER.get(f.slug) ?? {};
      // Del slot de media, en cualquier módulo.
      const oMedia = { mediaRatio: todo.mediaRatio };
      // Del hero, y sólo del módulo 0.
      const o = esHero ? todo : {};
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
          ratio: oMedia.mediaRatio ?? c.media.ratio ?? "4/3",
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

  // HUECO CERRADO (2026-09-08). La prueba de «toda imagen referenciada existe y
  // está registrada en arte.ts» recorre FILAS, o sea el `imageUrl` ORIGINAL del
  // seed — y por tanto NO veía ninguna foto que llegara por `UPDATE`. Las de la
  // 0035, la 0036 y la 0037 entraban todas por ahí: se comprobaba que el JPEG
  // existiera (lo hace el pre-vuelo de proporción, al medirlo) pero NO que
  // estuviera declarada en `arte.ts`, que es donde vive el velo MEDIDO y la
  // procedencia. Una foto sobrescrita sin registrar era una foto sin licencia
  // anotada y sin velo medido, y pasaba en verde.
  const urlsSobrescritas = [...OVER.values()]
    .map((o) => o.imageUrl)
    .filter((u): u is string => Boolean(u));

  it("hay sobrescrituras de imagen que comprobar", () => {
    // Control de que el extractor no devuelve vacío: sin esto, un parser roto
    // deja el `it.each` de abajo con cero casos y la suite en verde.
    expect(urlsSobrescritas.length).toBeGreaterThanOrEqual(6);
  });

  it.each(urlsSobrescritas.map((u) => [u] as const))(
    "%s llega por UPDATE y está registrada en arte.ts",
    (url) => {
      expect(url.startsWith("/"), `${url} no la sirve la app`).toBe(true);
      expect(existsSync(RAIZ_PUBLIC + url), `${url} no existe en disco`).toBe(
        true,
      );
      const clave = url
        .replace(/^\/arte\/(foto\/)?/, "")
        .replace(/\.(svg|jpg)$/, "");
      expect(
        ARTE.some((x) => x.clave === clave),
        `${clave} llega por UPDATE y NO está en arte.ts: sin velo medido ni procedencia`,
      ).toBe(true);
    },
  );

  // ------------------------------------------------------------------------
  // EL SEGUNDO RECORTE (§19.8). Son DOS, independientes, y esta prueba nacio
  // midiendo solo el primero:
  //
  //   1. `object-fit: cover` recorta la FUENTE dentro de la caja  <- arriba
  //   2. el viewport de la TARJETA recorta la CAJA                <- aqui
  //
  // El segundo no lo veia nadie, y dejaba la miniatura de `boda-marco-nuestro`
  // mostrando un trozo de pisos blancos que no se lee como pastel, con el
  // pre-vuelo en verde y con razon. Medido en las 15: 6 de 14 con figura
  // perdian >= 15 %, y `boda-papel-y-lino` perdia el 43 % estando APROBADA.
  //
  // La geometria se deriva de las constantes de la captura para que esto siga
  // valiendo si la tarjeta cambia de tamano:
  const PADDING_X = 24; // `px-6` de la seccion del hero, a cada lado
  const ANCHO_FIGURA = ANCHO_CAPTURA - PADDING_X * 2;
  // MEDIDO en el navegador a 420 px: el bloque de titulo + subtitulo + CTA mas
  // el `py-12` de la seccion dejan la figura arrancando en y=184. Es un valor
  // observado, no un calculo, y por eso se nombra: un titular mucho mas largo
  // lo empujaria mas abajo y el margen real seria menor.
  const TOP_FIGURA_MEDIDO = 184;
  const ALTO_DISPONIBLE = ALTO_CAPTURA - TOP_FIGURA_MEDIDO;

  it("hay figuras de hero que comprobar", () => {
    expect(slots.filter((s) => s.donde.startsWith("hero/")).length)
      .toBeGreaterThanOrEqual(6);
  });

  it.each(
    slots
      .filter((s) => s.donde.startsWith("hero/"))
      .map((s) => [`${s.slug} · ${s.ratio}`, s] as const),
  )("%s: la figura CABE en la tarjeta", (_t, s) => {
    const [a, b] = s.ratio.split("/").map(Number);
    const alto = ANCHO_FIGURA / (a / b);
    expect(
      Math.round(alto),
      `${s.slug}: figura de ${ANCHO_FIGURA}x${Math.round(alto)} en ${ALTO_DISPONIBLE} px disponibles ` +
        `-> la tarjeta le corta el ${Math.round((1 - ALTO_DISPONIBLE / alto) * 100)} %. ` +
        `En esta tarjeta solo caben proporciones >= ${(ANCHO_FIGURA / ALTO_DISPONIBLE).toFixed(3)}`,
    ).toBeLessThanOrEqual(ALTO_DISPONIBLE);
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
