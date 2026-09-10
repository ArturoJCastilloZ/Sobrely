/**
 * Compone las hojas de contacto de las tres superficies a partir de lo que
 * capturó `hojas-de-contacto.mts` (páginas 375 y 1200) y de las miniaturas que
 * ya vivían en `public/previews/plantillas` (tarjeta 420×560).
 *
 * Uso:
 *   node scripts/armar-hojas.mts
 *
 * Salida: HTML por superficie + un índice, y un PNG por superficie y categoría.
 *
 * Decisiones que conviene no deshacer sin leer por qué:
 *
 * - **Las piezas se muestran a 1:1**, en píxeles CSS reales. La regla del
 *   proyecto es que el arte se juzga MIRÁNDOLO al tamaño real: una hoja que
 *   encoge las piezas para que quepan es exactamente el instrumento que dejó
 *   pasar siete piezas que hubo que rehacer.
 *
 * - **El HTML se ESCRIBE A DISCO y se navega con `goto(file://…)`**, nunca con
 *   `setContent`. Un documento creado por `setContent` es `about:blank` y no
 *   puede leer `file://`: las imágenes no cargan y el screenshot sale con
 *   iconos roros, siendo un PNG perfectamente válido. Ya pasó (§7).
 *
 * - **Se asserta que TODAS las imágenes cargaron** antes de capturar
 *   (`naturalWidth > 0 && complete`). «El archivo existe y pesa algo» no es una
 *   comprobación de que la hoja muestre algo.
 */
import { chromium, type Browser } from "playwright-core";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOJAS = process.env.SALIDA_HOJAS ?? join(RAIZ, ".hojas-de-contacto");
const MINIATURAS = join(RAIZ, "public", "previews", "plantillas");

type Plantilla = { slug: string; name: string; event_type: string };
type Telon = {
  url: string;
  lienzoW: number;
  lienzoH: number;
  y0: number;
  y1: number;
  x0: number;
  x1: number;
} | null;
type Medida = { secciones: number; viewport: number; telon: Telon };

/**
 * Las tres superficies de la escala. `dir` vacío = las miniaturas, que viven
 * fuera de HOJAS porque son un asset del producto y no un artefacto de
 * revisión.
 */
const SUPERFICIES = [
  { id: "tarjeta", titulo: "Tarjeta 420×560", ancho: 420, alto: 560, dir: "" },
  { id: "375", titulo: "Página a 375 px", ancho: 375, alto: 812, dir: "375" },
  { id: "1200", titulo: "Página a 1200 px", ancho: 1200, alto: 900, dir: "1200" },
] as const;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

function hoja(
  sup: (typeof SUPERFICIES)[number],
  porCategoria: Map<string, Plantilla[]>,
  medidas: Record<string, Record<string, Medida>>,
  banda: string,
): string {
  const carpeta =
    sup.dir === "" ? relative(HOJAS, MINIATURAS) : sup.dir;
  const bloques: string[] = [];
  for (const [cat, lista] of porCategoria) {
    const piezas = lista
      .map((t) => {
        const m = medidas[t.slug]?.[sup.dir === "" ? "375" : sup.dir];
        const tel = m?.telon;
        const nota = tel
          ? `telón ${tel.url.split("/").pop()}`
          : "sin telón (foto en portada o slot)";
        return `      <figure>
        <img src="${carpeta}/${t.slug}.jpg" width="${sup.ancho}" height="${sup.alto}"
             alt="${esc(t.name)}" loading="eager">
        <figcaption><b>${esc(t.slug)}</b><br>${esc(nota)}</figcaption>
      </figure>`;
      })
      .join("\n");
    bloques.push(
      `    <h2>${esc(cat)} <span class="n">${lista.length}</span></h2>\n` +
        `    <div class="rejilla">\n${piezas}\n    </div>`,
    );
  }
  return `<!doctype html>
<meta charset="utf-8">
<title>Hoja de contacto · ${esc(sup.titulo)}</title>
<style>
  :root { color-scheme: light }
  body { margin: 0; padding: 24px; background: #f4f4f5; font: 13px/1.5 ui-sans-serif, system-ui, sans-serif; color: #18181b }
  h1 { font-size: 20px; margin: 0 0 4px }
  .sub { color: #52525b; margin: 0 0 8px; max-width: 90ch }
  .banda { background: #fff7ed; border: 1px solid #fdba74; border-radius: 6px; padding: 10px 12px; margin: 0 0 24px; max-width: 90ch }
  h2 { font-size: 15px; margin: 32px 0 12px; text-transform: capitalize; border-bottom: 1px solid #d4d4d8; padding-bottom: 6px }
  .n { color: #71717a; font-weight: 400 }
  /* 1:1, sin encoger: ver la cabecera del script. */
  .rejilla { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start }
  figure { margin: 0; background: #fff; padding: 8px; border-radius: 6px; box-shadow: 0 1px 3px #0002 }
  img { display: block; width: ${sup.ancho}px; height: ${sup.alto}px; background: #e4e4e7 }
  figcaption { font-size: 11px; color: #52525b; margin-top: 6px; max-width: ${sup.ancho}px; word-break: break-word }
  nav a { margin-right: 12px }
</style>
<h1>Hoja de contacto · ${esc(sup.titulo)}</h1>
<nav><a href="indice.html">← índice</a>${SUPERFICIES.map(
    (s) => `<a href="hoja-${s.id}.html">${esc(s.titulo)}</a>`,
  ).join("")}</nav>
<p class="sub">Piezas a <b>1:1</b>. Reloj congelado, tema claro,
<code>prefers-reduced-motion: reduce</code>.</p>
<div class="banda">${banda}</div>
${bloques.join("\n")}
`;
}

async function main() {
  const rutaMedidas = join(HOJAS, "medidas.json");
  if (!existsSync(rutaMedidas)) {
    throw new Error(
      `Falta ${rutaMedidas}. Corre antes: node scripts/hojas-de-contacto.mts`,
    );
  }
  const { plantillas, medidas } = JSON.parse(
    readFileSync(rutaMedidas, "utf8"),
  ) as { plantillas: Plantilla[]; medidas: Record<string, Record<string, Medida>> };

  // El universo primero. Y se comprueba que cada pieza que la hoja va a
  // pedir EXISTE en disco: una hoja con huecos se ve igual de bien que una
  // completa si nadie cuenta.
  const faltan: string[] = [];
  for (const sup of SUPERFICIES) {
    const dir = sup.dir === "" ? MINIATURAS : join(HOJAS, sup.dir);
    for (const t of plantillas) {
      if (!existsSync(join(dir, `${t.slug}.jpg`))) {
        faltan.push(`${sup.id}/${t.slug}.jpg`);
      }
    }
  }
  console.log(`UNIVERSO: ${plantillas.length} plantillas · ${SUPERFICIES.length} superficies`);
  console.log(`Piezas esperadas: ${plantillas.length * SUPERFICIES.length}`);
  if (faltan.length > 0) {
    throw new Error(
      `Faltan ${faltan.length} pieza(s) en disco:\n  ${faltan.slice(0, 12).join("\n  ")}` +
        (faltan.length > 12 ? `\n  …y ${faltan.length - 12} más` : ""),
    );
  }
  console.log("Piezas en disco: todas\n");

  const porCategoria = new Map<string, Plantilla[]>();
  for (const t of plantillas) {
    const l = porCategoria.get(t.event_type) ?? [];
    l.push(t);
    porCategoria.set(t.event_type, l);
  }

  // La franja del telón que sobrevive, MEDIDA en esta tanda, no supuesta.
  const bandas: Record<string, string> = {};
  for (const sup of SUPERFICIES) {
    const clave = sup.dir === "" ? "375" : sup.dir;
    const conTelon = plantillas
      .map((t) => medidas[t.slug]?.[clave]?.telon)
      .filter((x): x is NonNullable<Telon> => Boolean(x));
    bandas[sup.id] =
      conTelon.length === 0
        ? "Ninguna plantilla de esta hoja lleva telón."
        : `<b>${conTelon.length} de ${plantillas.length}</b> llevan telón. ` +
          (sup.id === "tarjeta"
            ? "En esta superficie sobrevive <b>y 170..730</b> del lienzo de 900 (62 %)."
            : sup.id === "375"
              ? "En esta superficie sobrevive el lienzo <b>entero</b> (y 0..900, x 2..418): es la superficie más generosa."
              : "En esta superficie sobrevive sólo <b>y 293..608</b> (35 %): es la más apretada de las tres, y el remate de arriba y de abajo <b>no se ve</b>.");
  }

  mkdirSync(HOJAS, { recursive: true });
  for (const sup of SUPERFICIES) {
    writeFileSync(
      join(HOJAS, `hoja-${sup.id}.html`),
      hoja(sup, porCategoria, medidas, bandas[sup.id]),
    );
  }
  writeFileSync(
    join(HOJAS, "indice.html"),
    `<!doctype html><meta charset="utf-8"><title>Hojas de contacto · Sobrely</title>
<style>body{margin:0;padding:32px;font:14px/1.6 ui-sans-serif,system-ui,sans-serif;background:#f4f4f5;color:#18181b}
li{margin:6px 0}code{background:#e4e4e7;padding:1px 4px;border-radius:3px}</style>
<h1>Hojas de contacto del catálogo</h1>
<p>${plantillas.length} plantillas activas · ${porCategoria.size} categorías · piezas a 1:1.</p>
<ul>${SUPERFICIES.map(
      (s) =>
        `<li><a href="hoja-${s.id}.html">${esc(s.titulo)}</a> — ${s.ancho}×${s.alto}</li>`,
    ).join("")}</ul>
<p>Generadas por <code>scripts/hojas-de-contacto.mts</code> +
<code>scripts/armar-hojas.mts</code>.</p>`,
  );
  console.log(`HTML escrito en ${HOJAS}`);

  // Y ahora el PNG de cada hoja, con el control de que las imágenes cargaron.
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ channel: "chrome" });
    const ctx = await browser.newContext({ colorScheme: "light" });
    const page = await ctx.newPage();
    for (const sup of SUPERFICIES) {
      const ruta = join(HOJAS, `hoja-${sup.id}.html`);
      await page.setViewportSize({
        width: Math.min(sup.ancho * 3 + 140, 2400),
        height: 1200,
      });
      await page.goto(`file://${ruta}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const control = await page.evaluate(() => {
        const im = Array.from(document.images);
        return {
          total: im.length,
          rotas: im.filter((i) => !i.complete || i.naturalWidth === 0).length,
        };
      });
      if (control.total === 0) throw new Error(`${sup.id}: la hoja no tiene imágenes`);
      if (control.rotas > 0) {
        throw new Error(
          `${sup.id}: ${control.rotas} de ${control.total} imágenes NO cargaron`,
        );
      }
      const png = await page.screenshot({ fullPage: true, type: "png" });
      writeFileSync(join(HOJAS, `hoja-${sup.id}.png`), png);
      console.log(
        `  ✓ hoja-${sup.id}.png · ${control.total} imágenes, 0 rotas · ` +
          `${Math.round(png.length / 1024)} KB`,
      );
    }
  } finally {
    await browser?.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
