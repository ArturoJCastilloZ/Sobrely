/**
 * ¿Choca el texto de cada plantilla con el diseño?
 *
 * Uso (requiere el servidor levantado; BASE_URL cambia el origen):
 *   node scripts/auditar-choque-de-texto.mts                # las 65
 *   node scripts/auditar-choque-de-texto.mts boda-jardin    # una
 *
 * Mide el RENDER, no el código, en dos estados y cuatro anchos:
 *   · «muestra»: la plantilla tal como se ve en el catálogo.
 *   · «peor caso»: con unos NOMBRES de 60 caracteres, que es lo que el servidor deja escribir
 *     (`NOMBRES_MAXIMO`) y un nombre compuesto real («María Fernanda Villaseñor-Domínguez y
 *     José Luis Ibarra Quiroz»). Es el estado que ninguna miniatura enseña y donde chocan los
 *     diseños hechos a la medida de «Ana & Carlos».
 *   · anchos 320, 375, 768 y 1200.
 *
 * Qué busca (cada hallazgo guarda el texto y la caja para poder mirarlo):
 *   · desborde-x:        algo se sale del ancho de la ventana (scroll horizontal).
 *   · texto-recortado:   un texto con `overflow` oculto que no cabe en su caja.
 *   · texto-sobre-texto: dos textos distintos cuyas LÍNEAS se pisan (se miden las líneas con
 *     `Range`, no las cajas: la caja de un bloque ocupa todo el ancho aunque el texto no).
 *   · texto-fuera-de-caja: el texto sobresale de la tarjeta o sección que lo contiene.
 *
 * No mide legibilidad contra el fondo: eso lo hace `verificar-contraste-en-vivo.mts`.
 * El peor caso reescribe el texto en el DOM después de cargar (el reemplazo equivale a cambiar
 * el dato para efectos de caja de texto, pero no vuelve a pasar por React); por eso la salida
 * es una lista de SOSPECHAS que se confirman mirando la captura (`--capturas`).
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RELOJ_CAPTURA } from "../src/lib/invitations/template-preview.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SALIDA = process.env.SALIDA ?? join(RAIZ, ".auditoria-choque");
const ANCHOS = [320, 375, 768, 1200] as const;
const PEOR_NOMBRE = "María Fernanda Villaseñor-Domínguez y José Luis Ibarra Quiroz".slice(0, 60);
const SLUG_SEGURO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Hallazgo = { tipo: string; texto: string; detalle: string };
type Medida = { slug: string; estado: "muestra" | "peor"; ancho: number; hallazgos: Hallazgo[]; scrollX: number };

async function slugs(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (usa .env.dev.local)");
  const r = await fetch(`${url}/rest/v1/templates?select=slug&is_active=eq.true&order=event_type,slug`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`No pude leer las plantillas: ${r.status}`);
  return ((await r.json()) as { slug: string }[]).map((t) => t.slug);
}

const cachePortada = new Map<string, { title: string; subtitle: string }>();
async function portadaDe(slug: string) {
  const c = cachePortada.get(slug);
  if (c) return c;
  const r = await fetch(`${BASE}/api/plantillas/${slug}/documento`);
  const d = (await r.json()) as { modules: { module_type: string; config: Record<string, unknown> }[] };
  const h = d.modules.find((m) => m.module_type === "hero");
  const p = { title: String(h?.config.title ?? ""), subtitle: String(h?.config.subtitle ?? "") };
  cachePortada.set(slug, p);
  return p;
}

async function medir(page: Page, peor: boolean, nombre: string, portada: { title: string; subtitle: string }) {
  return await page.evaluate(
    ({ peor, nombre, portada }) => {
      const hallazgos: { tipo: string; texto: string; detalle: string }[] = [];
      const W = document.documentElement.clientWidth;

      // 1) Peor caso: los nombres van donde `ranuraDeNombres` los pondría. Se buscan las hojas
      // de texto cuyo contenido es EXACTAMENTE el título o el subtítulo de la portada.
      let reemplazado = false;
      if (peor) {
        const esNombres = /\S\s(&|y)\s\S/.test(portada.title.trim()) || /^nombre del evento$/i.test(portada.title.trim());
        const objetivo = (esNombres ? portada.title : portada.subtitle).trim();
        if (objetivo) {
          for (const e of document.querySelectorAll("body *")) {
            if (e.children.length === 0 && (e.textContent ?? "").trim() === objetivo) {
              e.textContent = nombre;
              reemplazado = true;
              break;
            }
          }
        }
        if (!reemplazado) hallazgos.push({ tipo: "sonda", texto: objetivo, detalle: "no se encontró el texto de la portada para reemplazarlo" });
      }

      // 2) Hojas de texto visibles y sus LÍNEAS.
      type Hoja = { el: Element; txt: string; lineas: DOMRect[]; caja: DOMRect };
      const hojas: Hoja[] = [];
      for (const el of document.querySelectorAll("body *")) {
        if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH"].includes(el.tagName.toUpperCase())) continue;
        let propio = "";
        const nodos: Text[] = [];
        for (const n of el.childNodes) {
          if (n.nodeType === Node.TEXT_NODE) {
            propio += n.textContent ?? "";
            nodos.push(n as Text);
          }
        }
        propio = propio.trim();
        if (!propio) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
        const caja = el.getBoundingClientRect();
        if (caja.width === 0 || caja.height === 0) continue;
        const lineas: DOMRect[] = [];
        for (const n of nodos) {
          const rg = document.createRange();
          rg.selectNodeContents(n);
          for (const r of rg.getClientRects()) if (r.width > 1 && r.height > 1) lineas.push(r);
        }
        if (lineas.length) hojas.push({ el, txt: propio, lineas, caja });
      }

      const corto = (t: string) => t.replace(/\s+/g, " ").slice(0, 50);
      const sy = window.scrollY;

      // 3) desborde-x
      const scrollX = document.documentElement.scrollWidth - W;
      if (scrollX > 1) {
        const culpables = hojas.filter((h) => h.lineas.some((l) => l.right > W + 1 || l.left < -1)).slice(0, 3);
        hallazgos.push({
          tipo: "desborde-x",
          texto: culpables.map((c) => corto(c.txt)).join(" | ") || "(no es texto)",
          detalle: `scrollWidth excede la ventana en ${Math.round(scrollX)} px`,
        });
      }

      // 4) texto recortado
      for (const h of hojas) {
        const cs = getComputedStyle(h.el);
        const oculta = (v: string) => v === "hidden" || v === "clip";
        const e = h.el as HTMLElement;
        const clamp = cs.getPropertyValue("-webkit-line-clamp") !== "none" && cs.getPropertyValue("-webkit-line-clamp") !== "";
        if (oculta(cs.overflowX) && e.scrollWidth > e.clientWidth + 2 && cs.textOverflow !== "ellipsis") {
          hallazgos.push({ tipo: "texto-recortado", texto: corto(h.txt), detalle: `ancho ${e.scrollWidth} > ${e.clientWidth}` });
        } else if (oculta(cs.overflowY) && !clamp && e.scrollHeight > e.clientHeight + 2) {
          hallazgos.push({ tipo: "texto-recortado", texto: corto(h.txt), detalle: `alto ${e.scrollHeight} > ${e.clientHeight}` });
        }
      }

      // 5) texto sobre texto (líneas que se pisan; área > 6 px² y > 15 % de la línea menor)
      for (let i = 0; i < hojas.length; i++) {
        for (let j = i + 1; j < hojas.length; j++) {
          const a = hojas[i];
          const b = hojas[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          if (a.caja.bottom < b.caja.top - 2 || b.caja.bottom < a.caja.top - 2) continue;
          let peorArea = 0;
          for (const la of a.lineas) {
            for (const lb of b.lineas) {
              const w = Math.min(la.right, lb.right) - Math.max(la.left, lb.left);
              const h = Math.min(la.bottom, lb.bottom) - Math.max(la.top, lb.top);
              if (w > 0 && h > 0) {
                const frac = (w * h) / Math.min(la.width * la.height, lb.width * lb.height);
                if (w * h > 6 && frac > 0.15) peorArea = Math.max(peorArea, frac);
              }
            }
          }
          if (peorArea > 0) {
            hallazgos.push({
              tipo: "texto-sobre-texto",
              texto: `${corto(a.txt)} ⟷ ${corto(b.txt)}`,
              detalle: `solape ${Math.round(peorArea * 100)} % (y≈${Math.round(a.caja.top + sy)})`,
            });
          }
        }
      }

      // 6) texto fuera de la caja que lo contiene (sección o tarjeta con borde/fondo propio)
      for (const h of hojas) {
        let p: Element | null = h.el.parentElement;
        while (p && p !== document.body) {
          const cs = getComputedStyle(p);
          const tieneCaja =
            (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") ||
            parseFloat(cs.borderTopWidth) > 0 ||
            p.tagName === "SECTION";
          if (tieneCaja) break;
          p = p.parentElement;
        }
        if (!p || p === document.body) continue;
        const pc = p.getBoundingClientRect();
        const sobra = Math.max(
          ...h.lineas.map((l) => Math.max(pc.left - l.left, l.right - pc.right, 0)),
        );
        const cs = getComputedStyle(p);
        if (sobra > 2 && cs.overflowX !== "auto" && cs.overflowX !== "scroll") {
          hallazgos.push({ tipo: "texto-fuera-de-caja", texto: corto(h.txt), detalle: `sobresale ${Math.round(sobra)} px de su caja` });
        }
      }

      return { hallazgos, scrollX: Math.round(scrollX) };
    },
    { peor, nombre, portada },
  );
}

async function main() {
  const filtro = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const capturas = process.argv.includes("--capturas");
  const lista = (filtro.length ? filtro : await slugs()).filter((s) => SLUG_SEGURO.test(s));
  mkdirSync(SALIDA, { recursive: true });
  const medidas: Medida[] = [];
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ channel: "chrome" });
    for (const slug of lista) {
      for (const ancho of ANCHOS) {
        const ctx = await browser.newContext({
          viewport: { width: ancho, height: 900 },
          reducedMotion: "reduce",
          deviceScaleFactor: 1,
        });
        const page = await ctx.newPage();
        await page.clock.setFixedTime(new Date(RELOJ_CAPTURA));
        for (const estado of ["muestra", "peor"] as const) {
          const res = await page.goto(`${BASE}/plantilla/${slug}`, { waitUntil: "networkidle", timeout: 60000 });
          if (!res || !res.ok()) {
            medidas.push({ slug, estado, ancho, scrollX: 0, hallazgos: [{ tipo: "carga", texto: "", detalle: `HTTP ${res?.status()}` }] });
            continue;
          }
          await page.evaluate(() => document.fonts.ready);
          const m = await medir(page, estado === "peor", PEOR_NOMBRE, await portadaDe(slug));
          medidas.push({ slug, estado, ancho, ...m });
          if (capturas && (m.hallazgos.length || process.argv.includes("--todas"))) {
            await page.screenshot({ path: join(SALIDA, `${slug}-${estado}-${ancho}.png`), fullPage: true });
          }
        }
        await ctx.close();
      }
      const mios = medidas.filter((m) => m.slug === slug);
      const n = (e: string) => mios.filter((m) => m.estado === e).reduce((s, m) => s + m.hallazgos.length, 0);
      console.log(`${slug.padEnd(34)} muestra:${String(n("muestra")).padStart(3)}  peor:${String(n("peor")).padStart(3)}`);
    }
  } finally {
    await browser?.close();
  }
  writeFileSync(join(SALIDA, "resultado.json"), JSON.stringify(medidas, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
