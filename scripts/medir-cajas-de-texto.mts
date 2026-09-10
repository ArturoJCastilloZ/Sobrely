/**
 * ¿DÓNDE cae el texto de verdad sobre el lienzo del telón?
 *
 * Uso:
 *   node scripts/medir-cajas-de-texto.mts            # las 65
 *   node scripts/medir-cajas-de-texto.mts boda-jardin
 *
 * Por qué existe, y por qué ANTES de componer arte nuevo. La regla que el
 * catálogo usa hoy —«deja libre `y 250..650 × x 63..357`»— está SUPUESTA: vive
 * en una aserción de `arte-del-piloto.test.ts` y nadie la midió. Al armar las
 * hojas de contacto salieron dos colisiones reales de arte contra texto en
 * `corporativo-taller` que ese rectángulo no explica: en la tarjeta el título
 * invade la franja lateral `x>357`, que la regla da por libre.
 *
 * Y hay una segunda razón, más grande: romper la arquitectura de banda lateral
 * (§26 punto 2) obliga a meter arte en el CENTRO, o sea justo dentro del
 * rectángulo prohibido. Antes de negociar con una restricción hay que leer
 * dónde se aplica exactamente — y aquí «exactamente» sólo lo puede decir el
 * render, porque la caja del texto depende de la superficie.
 *
 * Qué mide. Para cada superficie, recorre las cajas de los elementos con TEXTO
 * del pliegue y las proyecta al sistema de coordenadas del lienzo de 420×900,
 * deshaciendo el `background-size: cover`. Devuelve la unión por superficie y
 * la unión GLOBAL, que es la zona que el arte no puede pisar en ninguna.
 *
 * Decisiones que conviene no deshacer sin leer por qué:
 *
 * - **Se proyecta al lienzo, no se reporta en píxeles de pantalla.** El arte se
 *   dibuja en coordenadas del SVG; una medida en píxeles de viewport no se
 *   puede aplicar al componerlo. La proyección deshace la misma aritmética que
 *   `cover` aplica, y se valida contra las franjas ya conocidas: la tarjeta
 *   tiene que dar `y 170..730` y la de 1200 `y 293..608`.
 *
 * - **Sólo hojas con texto propio.** Un contenedor abarca a sus hijos, así que
 *   medir cada `div` daría la página entera y la unión saldría 0..900 siempre.
 *   Se toman los elementos cuyo texto directo no está vacío.
 *
 * - **`reducedMotion: "reduce"`**, igual que las hojas de contacto: sin eso los
 *   módulos que revelan al hacer scroll tienen la caja recortada y su medida
 *   sería la del estado oculto.
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RELOJ_CAPTURA } from "../src/lib/invitations/template-preview.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DESTINO = process.env.SALIDA_HOJAS ?? join(RAIZ, ".hojas-de-contacto");

/** El lienzo en el que se dibuja el arte de telón. */
const LIENZO = { w: 420, h: 900 };

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

type Plantilla = { slug: string; name: string; event_type: string };

async function plantillas(): Promise<Plantilla[]> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const r = await fetch(
    `${url}/rest/v1/templates?select=slug,name,event_type&is_active=eq.true&order=event_type,slug`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!r.ok) throw new Error(`No pude leer las plantillas: ${r.status}`);
  return await r.json();
}

const SLUG_SEGURO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Caja = { x0: number; y0: number; x1: number; y1: number };

type MedidaSuperficie = {
  /** La franja del lienzo que esta superficie enseña. */
  visible: Caja;
  /** La unión de las cajas de texto, en coordenadas del LIENZO. */
  texto: Caja | null;
  /** Cuántos elementos con texto se midieron. Cero = sonda inválida. */
  nodos: number;
  /** El texto más ancho, para poder mirarlo si sorprende. */
  masAncho: { texto: string; x0: number; x1: number } | null;
};

function une(a: Caja | null, b: Caja): Caja {
  if (!a) return { ...b };
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}

async function medir(
  page: Page,
  superficie: (typeof SUPERFICIES)[number],
): Promise<MedidaSuperficie> {
  return await page.evaluate(
    ({ W, H, LW, LH }) => {
      // Deshace `background-size: cover` sobre un lienzo LW×LH en una caja W×H.
      const esc = Math.max(W / LW, H / LH);
      const ox = (W - LW * esc) / 2;
      const oy = (H - LH * esc) / 2;
      const aLienzo = (sx: number, sy: number) => ({
        x: (sx - ox) / esc,
        y: (sy - oy) / esc,
      });

      const visible = (() => {
        const a = aLienzo(0, 0);
        const b = aLienzo(W, H);
        return {
          x0: Math.max(0, Math.round(a.x)),
          y0: Math.max(0, Math.round(a.y)),
          x1: Math.min(LW, Math.round(b.x)),
          y1: Math.min(LH, Math.round(b.y)),
        };
      })();

      // Sólo HOJAS con texto propio: un contenedor abarca a sus hijos y la
      // unión saldría siempre el lienzo entero.
      const conTexto: { el: Element; txt: string }[] = [];
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
        conTexto.push({ el, txt: propio });
      }

      let texto: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
      } | null = null;
      let nodos = 0;
      let masAncho: { texto: string; x0: number; x1: number } | null = null;

      for (const { el, txt } of conTexto) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Sólo el PLIEGUE: es donde el telón tiene su geometría, y es la
        // superficie que el research juzga.
        if (r.bottom <= 0 || r.top >= H) continue;
        nodos++;
        const a = aLienzo(r.left, Math.max(0, r.top));
        const b = aLienzo(r.right, Math.min(H, r.bottom));
        const caja = { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
        texto = texto
          ? {
              x0: Math.min(texto.x0, caja.x0),
              y0: Math.min(texto.y0, caja.y0),
              x1: Math.max(texto.x1, caja.x1),
              y1: Math.max(texto.y1, caja.y1),
            }
          : caja;
        if (!masAncho || caja.x1 - caja.x0 > masAncho.x1 - masAncho.x0) {
          masAncho = {
            texto: txt.slice(0, 40),
            x0: Math.round(caja.x0),
            x1: Math.round(caja.x1),
          };
        }
      }

      return {
        visible,
        texto: texto
          ? {
              x0: Math.round(texto.x0),
              y0: Math.round(texto.y0),
              x1: Math.round(texto.x1),
              y1: Math.round(texto.y1),
            }
          : null,
        nodos,
        masAncho,
      };
    },
    { W: superficie.ancho, H: superficie.alto, LW: LIENZO.w, LH: LIENZO.h },
  );
}

async function main() {
  const pedidos = process.argv.slice(2);
  const todas = await plantillas();
  const objetivo =
    pedidos.length > 0 ? todas.filter((t) => pedidos.includes(t.slug)) : todas;

  console.log(`UNIVERSO: ${todas.length} plantillas activas en la BD`);
  console.log(`ESTA TANDA: ${objetivo.length}`);
  console.log(`Lienzo del telón: ${LIENZO.w}x${LIENZO.h} · origen ${BASE}\n`);
  if (objetivo.length === 0) throw new Error("el filtro no encontró plantillas");

  let browser: Browser | undefined;
  const porSlug: Record<string, Record<string, MedidaSuperficie>> = {};
  const fallos: string[] = [];

  try {
    browser = await chromium.launch({ channel: "chrome" });
    const ctx = await browser.newContext({
      colorScheme: "light",
      reducedMotion: "reduce",
      locale: "es-MX",
      timezoneId: "America/Mexico_City",
    });
    const page = await ctx.newPage();

    for (const superficie of SUPERFICIES) {
      console.log(`— ${superficie.nombre} (${superficie.ancho}x${superficie.alto}) —`);
      for (const t of objetivo) {
        if (!SLUG_SEGURO.test(t.slug)) throw new Error(`slug raro: ${t.slug}`);
        try {
          await page.setViewportSize({
            width: superficie.ancho,
            height: superficie.alto,
          });
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
          const m = await medir(page, superficie);
          // Una sonda que no encuentra texto no dice «no hay texto»: dice que
          // no midió. Se falla en voz alta.
          if (m.nodos === 0 || m.texto === null) {
            throw new Error("0 nodos con texto — sonda inválida");
          }
          porSlug[t.slug] ??= {};
          porSlug[t.slug][superficie.nombre] = m;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`  ✗ ${t.slug}: ${msg}`);
          fallos.push(`${t.slug}@${superficie.nombre}: ${msg}`);
        }
      }
      const hechas = objetivo.filter((t) => porSlug[t.slug]?.[superficie.nombre]);
      const u = hechas.reduce<Caja | null>(
        (acc, t) => une(acc, porSlug[t.slug][superficie.nombre].texto as Caja),
        null,
      );
      const vis = hechas.length > 0
        ? porSlug[hechas[0].slug][superficie.nombre].visible
        : null;
      console.log(
        `  ${hechas.length}/${objetivo.length} · visible del lienzo ` +
          `y ${vis?.y0}..${vis?.y1} x ${vis?.x0}..${vis?.x1}` +
          ` · UNIÓN del texto y ${u?.y0}..${u?.y1} x ${u?.x0}..${u?.x1}`,
      );
    }
  } finally {
    await browser?.close();
  }

  // La unión GLOBAL: lo que el arte no puede pisar en NINGUNA superficie.
  let global: Caja | null = null;
  for (const s of Object.values(porSlug)) {
    for (const m of Object.values(s)) {
      if (m.texto) global = une(global, m.texto);
    }
  }

  mkdirSync(DESTINO, { recursive: true });
  writeFileSync(
    join(DESTINO, "cajas-de-texto.json"),
    JSON.stringify({ lienzo: LIENZO, global, porSlug }, null, 2),
  );

  console.log(
    `\nUNIÓN GLOBAL del texto sobre el lienzo: ` +
      `y ${global?.y0}..${global?.y1} · x ${global?.x0}..${global?.x1}`,
  );
  console.log(`Escrito en ${join(DESTINO, "cajas-de-texto.json")}`);

  if (fallos.length > 0) {
    console.error(`\n${fallos.length} fallo(s):`);
    for (const f of fallos) console.error(`  ${f}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
