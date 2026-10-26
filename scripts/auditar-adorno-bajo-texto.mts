/**
 * ¿Cae el texto de cada plantilla encima de un ADORNO del fondo?
 *
 * Uso (requiere el servidor levantado; BASE_URL cambia el origen):
 *   node scripts/auditar-adorno-bajo-texto.mts                # las 65
 *   node scripts/auditar-adorno-bajo-texto.mts boda-jardin    # una
 *
 * Complemento de `auditar-choque-de-texto.mts`, que mide texto contra texto y desbordes pero NO
 * ve el arte: el arte de fondo es una imagen, no un elemento, y por eso ninguna caja lo delata.
 * Aquí se mide el píxel: se esconde todo el texto (`color: transparent`), se captura la página
 * entera y, bajo cada LÍNEA de texto, se cuenta qué fracción del área son BORDES (cambios bruscos
 * de luminancia: filos de hoja, de flor, de línea, de foto). Un fondo liso o un degradado dan
 * ~0 %; un adorno bajo el texto da varios por ciento. Es un indicador de SOSPECHA: el texto sobre
 * una foto velada del héroe también da borde y es intencional, así que se revisa mirando la captura.
 *
 * Mismo peor caso que el otro script: nombres de 60 caracteres en la ranura que les toca.
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RELOJ_CAPTURA } from "../src/lib/invitations/template-preview.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SALIDA = process.env.SALIDA ?? join(RAIZ, ".auditoria-adorno");
const ANCHOS = (process.env.ANCHOS ? process.env.ANCHOS.split(",").map(Number) : [320, 375, 1200]) as number[];
/** Con CAPTURAR=1 guarda la página con el texto visible cuando hay sospechas, para mirarlas. */
const CAPTURAR = process.env.CAPTURAR === "1";
const PEOR_NOMBRE = "María Fernanda Villaseñor-Domínguez y José Luis Ibarra Quiroz".slice(0, 60);
const SLUG_SEGURO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Fracción de píxeles-borde bajo una línea a partir de la cual se sospecha. */
const UMBRAL = Number(process.env.UMBRAL ?? 0.035);
/** Salto de luminancia (0-255) entre vecinos que cuenta como borde. */
const SALTO = 14;

type Linea = { x: number; y: number; w: number; h: number; txt: string; ignorar: boolean };
type Sospecha = { texto: string; borde: number; x: number; y: number; w: number; h: number };

async function slugs(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (usa .env.dev.local)");
  const r = await fetch(`${url}/rest/v1/templates?select=slug&is_active=eq.true&order=event_type,slug`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return ((await r.json()) as { slug: string }[]).map((t) => t.slug);
}

async function portadaDe(slug: string) {
  const r = await fetch(`${BASE}/api/plantillas/${slug}/documento`);
  const d = (await r.json()) as { modules: { module_type: string; config: Record<string, unknown> }[] };
  const h = d.modules.find((m) => m.module_type === "hero");
  return { title: String(h?.config.title ?? ""), subtitle: String(h?.config.subtitle ?? "") };
}

async function lineas(page: Page, peor: boolean, nombre: string, portada: { title: string; subtitle: string }): Promise<Linea[]> {
  return await page.evaluate(
    ({ peor, nombre, portada }) => {
      if (peor) {
        const esNombres = /\S\s(&|y)\s\S/.test(portada.title.trim()) || /^nombre del evento$/i.test(portada.title.trim());
        const objetivo = (esNombres ? portada.title : portada.subtitle).trim();
        for (const e of document.querySelectorAll("body *")) {
          if (objetivo && e.children.length === 0 && (e.textContent ?? "").trim() === objetivo) {
            e.textContent = nombre;
            break;
          }
        }
      }
      const out: { x: number; y: number; w: number; h: number; txt: string; ignorar: boolean }[] = [];
      const sy = window.scrollY;
      for (const el of document.querySelectorAll("body *")) {
        if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
        const nodos = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim());
        if (!nodos.length) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
        // Formularios, botones y fichas con borde propio generan bordes que no son adorno.
        const ignorar = !!el.closest("button, input, textarea, select, label, form, a, [role=button]");
        for (const n of nodos) {
          const rg = document.createRange();
          rg.selectNodeContents(n);
          for (const r of rg.getClientRects()) {
            if (r.width > 3 && r.height > 3) {
              out.push({ x: r.left, y: r.top + sy, w: r.width, h: r.height, txt: (n.textContent ?? "").trim().slice(0, 40), ignorar });
            }
          }
        }
      }
      return out;
    },
    { peor, nombre, portada },
  );
}

/** Dentro de una página en blanco: carga el PNG y mide borde por línea. */
async function medirBordes(analisis: Page, png: Buffer, ls: Linea[]): Promise<Sospecha[]> {
  return await analisis.evaluate(
    async ({ b64, ls, SALTO, UMBRAL }) => {
      const img = new Image();
      await new Promise<void>((ok, ko) => {
        img.onload = () => ok();
        img.onerror = () => ko(new Error("png"));
        img.src = `data:image/png;base64,${b64}`;
      });
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const sos: { texto: string; borde: number; x: number; y: number; w: number; h: number }[] = [];
      for (const l of ls) {
        if (l.ignorar) continue;
        // Se encoge 1 px por lado: el filo exacto de la caja no es fondo.
        const x = Math.max(0, Math.floor(l.x) + 1);
        const y = Math.max(0, Math.floor(l.y) + 1);
        const w = Math.min(c.width - x, Math.floor(l.w) - 2);
        const h = Math.min(c.height - y, Math.floor(l.h) - 2);
        if (w < 4 || h < 4) continue;
        const d = g.getImageData(x, y, w, h).data;
        let n = 0;
        for (let j = 0; j < h - 1; j++) {
          for (let i = 0; i < w - 1; i++) {
            const k = (j * w + i) * 4;
            const a = lum(d, k);
            if (Math.abs(a - lum(d, k + 4)) > SALTO || Math.abs(a - lum(d, k + w * 4)) > SALTO) n++;
          }
        }
        const frac = n / (w * h);
        if (frac > UMBRAL) sos.push({ texto: l.txt, borde: Math.round(frac * 1000) / 10, x, y, w, h });
      }
      return sos;
    },
    { b64: png.toString("base64"), ls, SALTO, UMBRAL },
  );
}

async function main() {
  const filtro = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const lista = (filtro.length ? filtro : await slugs()).filter((s) => SLUG_SEGURO.test(s));
  mkdirSync(SALIDA, { recursive: true });
  const resultado: Record<string, unknown>[] = [];
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ channel: "chrome" });
    const analisis = await (await browser.newContext()).newPage();
    await analisis.goto("about:blank");
    for (const slug of lista) {
      const portada = await portadaDe(slug);
      const fila: Record<string, number> = {};
      for (const ancho of ANCHOS) {
        const ctx = await browser.newContext({ viewport: { width: ancho, height: 900 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        await page.clock.setFixedTime(new Date(RELOJ_CAPTURA));
        for (const estado of ["muestra", "peor"] as const) {
          await page.goto(`${BASE}/plantilla/${slug}`, { waitUntil: "networkidle", timeout: 60000 });
          await page.evaluate(() => document.fonts.ready);
          const ls = await lineas(page, estado === "peor", PEOR_NOMBRE, portada);
          const visible = CAPTURAR ? await page.screenshot({ fullPage: true, style: "nextjs-portal{display:none !important}" }) : null;
          await page.addStyleTag({ content: "nextjs-portal{display:none !important}*{color:transparent !important;text-shadow:none !important;-webkit-text-fill-color:transparent !important;caret-color:transparent !important}" });
          const png = await page.screenshot({ fullPage: true });
          const sos = await medirBordes(analisis, png, ls);
          fila[`${estado}-${ancho}`] = sos.length;
          if (sos.length) {
            resultado.push({ slug, estado, ancho, sospechas: sos });
            if (visible) writeFileSync(join(SALIDA, `${slug}-${estado}-${ancho}.png`), visible);
          }
        }
        await ctx.close();
      }
      console.log(`${slug.padEnd(34)} ${Object.entries(fila).map(([k, v]) => `${k}:${v}`).join("  ")}`);
    }
  } finally {
    await browser?.close();
  }
  writeFileSync(join(SALIDA, "resultado.json"), JSON.stringify(resultado, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
