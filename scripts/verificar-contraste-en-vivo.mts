/**
 * ¿Se lee el texto REAL sobre el fondo REAL, en cada plantilla?
 *
 * Uso:
 *   node scripts/verificar-contraste-en-vivo.mts                 # las 65
 *   node scripts/verificar-contraste-en-vivo.mts boda-elegante
 *   node scripts/verificar-contraste-en-vivo.mts --estricto       # exit 1 si falla
 *
 * Requiere el servidor levantado. BASE_URL cambia el origen.
 *
 * ── POR QUÉ EXISTE ────────────────────────────────────────────────────────────
 *
 * `verificar-contraste-arte.mts` mide el arte contra DOS colores de texto
 * FIJOS (`#1f2937` y `#f8fafc`). Medido el 2026-09-09 (3.ª sesión): **27 de las
 * 65 plantillas** tienen un texto PEOR que esos dos —25 de polaridad oscura con
 * texto más claro que `#1f2937`, la peor `kawaii` con `#5a4a52`, y las 2 de
 * polaridad clara con texto más oscuro que `#f8fafc`—. O sea que ese gate era
 * optimista para 27 plantillas: ahí estaba el agujero.
 *
 * Y NO se cierra endureciendo el gate offline. Medido: usar el peor texto real
 * (`#5a4a52`) contra TODAS las piezas tumbaría **29 de 76**, porque le exigiría
 * a `boda-cinematografica` aguantar la paleta de kawaii, con la que no se
 * empareja nunca. Es el mismo error que usar la envolvente del texto como si
 * fuera tinta. El agujero sólo se cierra con el EMPAREJAMIENTO REAL, y eso vive
 * en la base de datos, no en el código.
 *
 * ── CÓMO MIDE, Y POR QUÉ ASÍ ─────────────────────────────────────────────────
 *
 * No reconstruye nada: mide el render. Para cada plantilla y cada superficie
 * de la escala, toma DOS capturas —una normal y otra con todo el texto en
 * `transparent`— y las compara:
 *
 *   · los píxeles que DIFIEREN son los píxeles de GLIFO;
 *   · el fondo de cada uno de ellos se lee de la captura sin texto.
 *
 * Eso elimina el problema que invalidó los números anteriores: la CAJA de un
 * elemento de bloque ocupa el ancho del contenedor aunque sus glifos no, así
 * que medir la caja acusa de ilegible un texto que se lee perfectamente. Pasó
 * dos veces (`boda-elegante` y `xv-noche-estelar`) y las dos veces hubo que
 * mirarlo a 3x para descartarlo. Con los píxeles de glifo no hay envolvente:
 * se mide donde hay tinta y en ningún otro sitio.
 *
 * Otras decisiones que conviene no deshacer sin leer por qué:
 *
 * - **El color del texto sale de `getComputedStyle`**, no de la paleta
 *   declarada: así cubre packs, `colors` inline y el tema por defecto sin
 *   parsear nada. `theme-packs.ts` no se puede importar desde un script suelto
 *   (usa el alias `@/`), y parsearlo seria un modelo mas.
 *
 * - **`reducedMotion: "reduce"`**: sin eso los módulos que revelan al hacer
 *   scroll tienen `clip-path` y su texto no se pinta.
 *
 * - **Se comprueba que la sonda ENCONTRÓ glifos.** Si el diff sale vacío no
 *   significa «todo legible»: significa que no midió. Un `it.each` sobre lista
 *   vacía no falla, desaparece — y esta sonda tiene el mismo modo de fallo.
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RELOJ_CAPTURA } from "../src/lib/invitations/template-preview.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DESTINO = process.env.SALIDA_HOJAS ?? join(RAIZ, ".hojas-de-contacto");
const ESTRICTO = process.argv.includes("--estricto");

/** Umbral WCAG AA para texto normal. El mismo que usa `contrast.ts`. */
const AA_NORMAL = 4.5;

/**
 * Umbral WCAG AA para texto GRANDE: >= 24px, o >= 18.66px en negrita.
 *
 * No es un detalle: sin esta regla la sonda marca los digitos de la cuenta
 * atras de medio catalogo. Son grandes y en negrita, asi que su umbral es 3.0
 * y no 4.5 — y tratarlos con 4.5 produce una lista de falsos positivos tan
 * larga que el guard se acaba ignorando.
 */
const AA_GRANDE = 3.0;

/**
 * Cuántos píxeles de glifo por debajo de AA se toleran antes de reportar.
 *
 * No es cero por una razón medida: el antialiasing de un glifo produce píxeles
 * de borde que son una MEZCLA de texto y fondo, y en el borde exacto el
 * contraste contra el fondo tiende a 1 por construcción. Un umbral de cero
 * marcaría el 100 % de los textos. Se cuenta la fracción del CUERPO del glifo,
 * que es lo que se lee.
 */
const TOLERANCIA_BORDE = 0.12;

/** Las tres superficies de la escala del research. */
const SUPERFICIES = [
  { nombre: "tarjeta", ancho: 420, alto: 560 },
  { nombre: "375", ancho: 375, alto: 812 },
  { nombre: "1200", ancho: 1200, alto: 900 },
] as const;

function env(nombre: string): string {
  if (process.env[nombre]) return process.env[nombre] as string;
  const ruta = join(RAIZ, ".env.local");
  if (!existsSync(ruta)) throw new Error(`Falta ${nombre} y no hay .env.local`);
  for (const linea of readFileSync(ruta, "utf8").split("\n")) {
    const i = linea.indexOf("=");
    if (i > 0 && linea.slice(0, i).trim() === nombre) {
      return linea.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error(`Falta ${nombre} en el entorno y en .env.local`);
}

const SLUG_SEGURO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Plantilla = { slug: string; event_type: string };

async function plantillas(): Promise<Plantilla[]> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const r = await fetch(
    `${url}/rest/v1/templates?select=slug,event_type&is_active=eq.true&order=event_type,slug`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!r.ok) throw new Error(`No pude leer las plantillas: ${r.status}`);
  return await r.json();
}

/** El color con el que el producto vela un telón: `theme.colors.background`. */
type Velo = [number, number, number];

type Caja = {
  txt: string;
  color: [number, number, number];
  /** El umbral que le toca a ESTE texto, por su tamaño y peso reales. */
  umbral: number;
  grande: boolean;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type Peor = {
  txt: string;
  ratio: number;
  /**
   * El velo MÍNIMO que haría pasar a TODOS los glifos de este texto, o null si
   * ni al 95 % alcanza. Es el mecanismo que el producto ya tiene
   * (`backgroundImage.overlay`), pero medido sobre los píxeles de GLIFO en vez
   * de sobre la envolvente de la caja — y eso es lo que lo vuelve accionable:
   * la envolvente pedía 0.5 donde los glifos piden mucho menos.
   */
  veloMin: number | null;
  umbral: number;
  grande: boolean;
  glifos: number;
  bajo: number;
  fraccion: number;
};

/** Las cajas de texto del pliegue, con su color computado. */
async function cajas(page: Page, alto: number): Promise<Caja[]> {
  return await page.evaluate(({ H, AA_N, AA_G }) => {
    const out: Caja[] = [];
    for (const el of document.querySelectorAll("body *")) {
      let propio = "";
      for (const n of el.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) propio += n.textContent ?? "";
      }
      propio = propio.trim();
      if (propio.length === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (Number(cs.opacity) === 0) continue;
      const m = cs.color.match(/(\d+(?:\.\d+)?)/g);
      if (!m || m.length < 3) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom <= 0 || r.top >= H) continue;
      // El umbral sale del tamaño y el peso RENDERIZADOS, no de una lista de
      // etiquetas: un `<span>` puede ser enorme y un `<h2>` diminuto.
      const px = parseFloat(cs.fontSize) || 16;
      const peso = Number(cs.fontWeight) || 400;
      const grande = px >= 24 || (px >= 18.66 && peso >= 700);
      out.push({
        txt: propio.slice(0, 36),
        color: [Number(m[0]), Number(m[1]), Number(m[2])],
        umbral: grande ? AA_G : AA_N,
        grande,
        x0: Math.max(0, Math.floor(r.left)),
        y0: Math.max(0, Math.floor(r.top)),
        x1: Math.ceil(r.right),
        y1: Math.min(H, Math.ceil(r.bottom)),
      });
    }
    return out;
  }, { H: alto, AA_N: AA_NORMAL, AA_G: AA_GRANDE });
}

/**
 * Compara las dos capturas DENTRO de la página: los píxeles que difieren son
 * glifo, y su fondo se lee de la captura sin texto.
 */
async function medirGlifos(
  page: Page,
  conTexto: string,
  sinTexto: string,
  lista: Caja[],
  escala: number,
  velo: Velo,
): Promise<{ peores: Peor[]; glifosTotales: number }> {
  return await page.evaluate(
    async ({ conTexto, sinTexto, lista, escala, velo }) => {
      const carga = (uri: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => rej(new Error("no cargo la captura"));
          im.src = uri;
        });
      const [a, b] = await Promise.all([carga(conTexto), carga(sinTexto)]);
      const ca = document.createElement("canvas");
      ca.width = a.naturalWidth;
      ca.height = a.naturalHeight;
      ca.getContext("2d")!.drawImage(a, 0, 0);
      const cb = document.createElement("canvas");
      cb.width = b.naturalWidth;
      cb.height = b.naturalHeight;
      cb.getContext("2d")!.drawImage(b, 0, 0);
      const da = ca.getContext("2d")!.getImageData(0, 0, ca.width, ca.height).data;
      const db = cb.getContext("2d")!.getImageData(0, 0, cb.width, cb.height).data;

      const lumin = (p: number[]) => {
        const f = (c: number) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
      };
      const contra = (p: number[], q: number[]) => {
        const l1 = lumin(p);
        const l2 = lumin(q);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };

      const componer = (px: number[], v: number[], a: number) =>
        [0, 1, 2].map((i) => a * v[i] + (1 - a) * px[i]);

      const peores: Peor[] = [];
      let glifosTotales = 0;
      for (const c of lista) {
        let glifos = 0;
        let bajo = 0;
        let peor = 99;
        for (let y = Math.round(c.y0 * escala); y < Math.round(c.y1 * escala); y++) {
          for (let x = Math.round(c.x0 * escala); x < Math.round(c.x1 * escala); x++) {
            const i = (y * ca.width + x) * 4;
            if (i + 2 >= da.length) continue;
            const d =
              Math.abs(da[i] - db[i]) +
              Math.abs(da[i + 1] - db[i + 1]) +
              Math.abs(da[i + 2] - db[i + 2]);
            // Umbral de 30 sobre la suma de los tres canales: por debajo es
            // ruido de compresion, no tinta.
            if (d <= 30) continue;
            glifos++;
            const k = contra(c.color, [db[i], db[i + 1], db[i + 2]]);
            if (k < c.umbral) bajo++;
            if (k < peor) peor = k;
          }
        }
        glifosTotales += glifos;
        // El velo minimo, y solo si hace falta: se recorren los MISMOS pixeles
        // de glifo componiendo el velo encima, con el paso de 0.05 que usa el
        // resto del proyecto.
        let veloMin: number | null = null;
        if (glifos > 0 && bajo > 0) {
          for (let al = 0.05; al <= 0.95; al += 0.05) {
            let ok = true;
            for (let y = Math.round(c.y0 * escala); y < Math.round(c.y1 * escala) && ok; y++) {
              for (let x = Math.round(c.x0 * escala); x < Math.round(c.x1 * escala); x++) {
                const i = (y * ca.width + x) * 4;
                if (i + 2 >= da.length) continue;
                const d =
                  Math.abs(da[i] - db[i]) +
                  Math.abs(da[i + 1] - db[i + 1]) +
                  Math.abs(da[i + 2] - db[i + 2]);
                if (d <= 30) continue;
                const fondo = componer([db[i], db[i + 1], db[i + 2]], velo, al);
                if (contra(c.color, fondo) < c.umbral) { ok = false; break; }
              }
            }
            if (ok) { veloMin = Math.round(al * 100) / 100; break; }
          }
        }
        if (glifos > 0) {
          peores.push({
            txt: c.txt,
            ratio: Math.round(peor * 100) / 100,
            veloMin,
            umbral: c.umbral,
            grande: c.grande,
            glifos,
            bajo,
            fraccion: Math.round((1000 * bajo) / glifos) / 1000,
          });
        }
      }
      return { peores, glifosTotales };
    },
    { conTexto, sinTexto, lista, escala, velo },
  );
}

async function main() {
  const pedidos = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const todas = await plantillas();
  const objetivo =
    pedidos.length > 0 ? todas.filter((t) => pedidos.includes(t.slug)) : todas;

  console.log(`UNIVERSO: ${todas.length} plantillas activas en la BD`);
  console.log(`ESTA TANDA: ${objetivo.length} · origen ${BASE}`);
  console.log(`AA normal = ${AA_NORMAL} · AA texto grande = ${AA_GRANDE} · tolerancia de borde = ${TOLERANCIA_BORDE}\n`);
  if (objetivo.length === 0) throw new Error("el filtro no encontró plantillas");

  let browser: Browser | undefined;
  const malos: {
    slug: string;
    superficie: string;
    txt: string;
    ratio: number;
    veloMin: number | null;
    umbral: number;
    grande: boolean;
    fraccion: number;
  }[] = [];
  const fallos: string[] = [];
  let glifosMedidos = 0;

  try {
    browser = await chromium.launch({ channel: "chrome" });
    const ctx = await browser.newContext({
      colorScheme: "light",
      reducedMotion: "reduce",
      locale: "es-MX",
      timezoneId: "America/Mexico_City",
    });
    const page = await ctx.newPage();
    const lab = await ctx.newPage();
    await lab.goto("about:blank");

    for (const sup of SUPERFICIES) {
      console.log(`— superficie ${sup.nombre} —`);
      for (const t of objetivo) {
        if (!SLUG_SEGURO.test(t.slug)) throw new Error(`slug raro: ${t.slug}`);
        try {
          await page.setViewportSize({ width: sup.ancho, height: sup.alto });
          await page.clock.setFixedTime(new Date(RELOJ_CAPTURA));
          const res = await page.goto(`${BASE}/plantilla/${t.slug}`, {
            waitUntil: "networkidle",
            timeout: 60_000,
          });
          if (!res || !res.ok()) throw new Error(`HTTP ${res?.status()}`);
          await page.addStyleTag({
            content: "nextjs-portal,[data-nextjs-toast]{display:none !important}",
          });
          await page.evaluate(() => document.fonts.ready);

          // El velo que el producto aplica sobre un telón es
          // `theme.colors.background`. Se lee del render para no reconstruirlo.
          const velo = await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll<HTMLElement>("*")).find(
              (e) => getComputedStyle(e).getPropertyValue("--inv-bg").trim() !== "",
            );
            const v = el ? getComputedStyle(el).getPropertyValue("--inv-bg").trim() : "";
            const c = document.createElement("canvas").getContext("2d")!;
            c.fillStyle = v || "#ffffff";
            const m = c.fillStyle.match(/^#([0-9a-f]{6})$/i);
            if (!m) return [255, 255, 255] as [number, number, number];
            const h = m[1];
            return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
              number, number, number,
            ];
          });

          const lista = await cajas(page, sup.alto);
          if (lista.length === 0) throw new Error("0 cajas de texto — sonda inválida");

          const conTexto = (await page.screenshot({ type: "png" })).toString("base64");
          // Texto invisible, TODO lo demás igual. `color: transparent` no
          // cambia el layout, así que el fondo se pinta idéntico.
          await page.addStyleTag({
            content:
              "*,*::before,*::after{color:transparent !important;" +
              "text-shadow:none !important;-webkit-text-stroke-color:transparent !important}",
          });
          const sinTexto = (await page.screenshot({ type: "png" })).toString("base64");

          const { peores, glifosTotales } = await medirGlifos(
            lab,
            "data:image/png;base64," + conTexto,
            "data:image/png;base64," + sinTexto,
            lista,
            1,
            velo,
          );
          if (glifosTotales === 0) {
            throw new Error("el diff no encontró NINGÚN glifo — sonda inválida");
          }
          glifosMedidos += glifosTotales;

          for (const p of peores) {
            if (p.fraccion > TOLERANCIA_BORDE) {
              malos.push({
                slug: t.slug,
                superficie: sup.nombre,
                txt: p.txt,
                ratio: p.ratio,
                veloMin: p.veloMin,
                umbral: p.umbral,
                grande: p.grande,
                fraccion: p.fraccion,
              });
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`  ✗ ${t.slug}: ${msg}`);
          fallos.push(`${t.slug}@${sup.nombre}: ${msg}`);
        }
      }
      const n = malos.filter((m) => m.superficie === sup.nombre).length;
      console.log(`  ${objetivo.length} medidas · ${n} texto(s) por debajo de AA`);
    }
  } finally {
    await browser?.close();
  }

  mkdirSync(DESTINO, { recursive: true });
  writeFileSync(
    join(DESTINO, "contraste-en-vivo.json"),
    JSON.stringify({ aa: AA_NORMAL, tolerancia: TOLERANCIA_BORDE, malos }, null, 2),
  );

  console.log(`\nglifos medidos en total: ${glifosMedidos.toLocaleString("es-MX")}`);
  if (malos.length === 0) {
    console.log(
      "Ningún texto por debajo de AA sobre su propio fondo, en ninguna superficie.",
    );
  } else {
    console.log(`\n⚠️  ${malos.length} caso(s) por debajo de AA:`);
    for (const m of malos.sort((a, b) => a.ratio - b.ratio)) {
      console.log(
        `  ${m.slug.padEnd(30)} @${m.superficie.padEnd(8)} ratio ${String(m.ratio).padStart(6)}` +
          ` / umbral ${m.umbral}${m.grande ? " (grande)" : "         "} · ` +
          `${Math.round(m.fraccion * 100)} % del glifo · «${m.txt}»`,
      );
    }
    // El velo MINIMO por plantilla: el mayor de los que piden sus textos, que
    // es el unico que los hace pasar a todos. Es lo accionable del informe.
    const porPlantilla = new Map<string, number | null>();
    for (const m of malos) {
      const y = porPlantilla.get(m.slug);
      if (m.veloMin === null) porPlantilla.set(m.slug, null);
      else if (y !== null) porPlantilla.set(m.slug, Math.max(y ?? 0, m.veloMin));
    }
    console.log(`\nVELO MÍNIMO por plantilla (medido sobre los GLIFOS):`);
    const orden = [...porPlantilla.entries()].sort((a, b) => (b[1] ?? 9) - (a[1] ?? 9));
    for (const [slug, v] of orden) {
      console.log(`  ${slug.padEnd(30)} ${v === null ? "NI AL 95 % — el velo no lo arregla" : v}`);
    }
    const conNumero = orden.filter(([, v]) => v !== null).map(([, v]) => v as number);
    if (conNumero.length) {
      console.log(
        `\n  ${conNumero.length} plantilla(s) se arreglan con velo · ` +
          `mediana ${conNumero.slice().sort((a, b) => a - b)[Math.floor(conNumero.length / 2)]} · ` +
          `máximo ${Math.max(...conNumero)}`,
      );
    }
    const imposibles = orden.filter(([, v]) => v === null).length;
    if (imposibles) console.log(`  ${imposibles} NO se arreglan con velo.`);
    console.log(
      "\nAntes de subir un velo: MIRAR la plantilla a 3x. El velo OSCURECE el\n" +
        "arte, así que un número pequeño es aceptable y uno grande borra la pieza.",
    );
  }

  if (fallos.length > 0) {
    console.error(`\n${fallos.length} fallo(s) de medición:`);
    for (const f of fallos) console.error(`  ${f}`);
    process.exit(1);
  }
  if (malos.length > 0 && ESTRICTO) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
