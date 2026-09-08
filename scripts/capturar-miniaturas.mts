/**
 * Captura las miniaturas de las plantillas (Fase 4).
 *
 * Uso:
 *   node scripts/capturar-miniaturas.mts                  # todas
 *   node scripts/capturar-miniaturas.mts boda-elegante    # solo esas
 *
 * La extensión es `.mts` y no `.ts` para que Node lo trate como ESM sin tener
 * que poner `"type": "module"` en el `package.json`, que cambiaría la
 * semántica de módulos de TODO el proyecto (incluidos los archivos de config
 * de Next) para arreglar un warning de un script.
 *
 * Requiere el servidor levantado (`pnpm dev` o `pnpm start`). El origen se
 * puede cambiar con BASE_URL.
 *
 * Decisiones que conviene no deshacer sin leer por qué:
 *
 * - **`playwright-core` y el Chrome del sistema**, no `playwright`. El paquete
 *   completo descarga ~150 MB de Chromium desde el CDN de Microsoft en el
 *   postinstall; `playwright-core` no descarga nada y `channel: "chrome"` usa
 *   el navegador que ya está instalado. En un entorno cuya regla es cero
 *   phone-home, evitar una descarga externa vale más que fijar la versión del
 *   navegador. Contrapartida honesta: la versión de Chrome del sistema deriva
 *   con el tiempo, así que dos tandas separadas por una actualización de Chrome
 *   pueden diferir en un antialiasing. Es aceptable para una miniatura; no lo
 *   sería para una prueba de regresión visual.
 *
 * - **Reloj congelado.** La cuenta atrás se calcula contra `now()`. Sin
 *   congelarlo, la misma plantilla da una imagen distinta cada día y no hay
 *   forma de saber si una miniatura cambió porque cambió el diseño o porque
 *   pasó el tiempo. Medido antes de esto: `boda-elegante` mostraba «277 días».
 *
 * - **Se espera a las FUENTES.** `networkidle` no garantiza que las webfonts
 *   estén aplicadas: sin `document.fonts.ready` la miniatura sale con la fuente
 *   de reserva, que es un fallo silencioso — la imagen se genera, no falla
 *   nada, y el catálogo entero muestra una tipografía que no es la del diseño.
 *
 * - **Se verifica que la página tenga contenido.** Un 404, un error de Next o
 *   una página en blanco producen un JPEG perfectamente válido. Sin esta
 *   comprobación, un fallo se convierte en 50 miniaturas grises que nadie mira
 *   hasta que un cliente las ve.
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RELOJ_CAPTURA,
  ANCHO_CAPTURA,
  ALTO_CAPTURA,
  ESCALA_CAPTURA,
} from "../src/lib/invitations/template-preview.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "public", "previews", "plantillas");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

/** Lee una variable de `.env.local` sin depender de dotenv. */
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

/**
 * Las plantillas activas. Se leen con la llave PUBLICABLE a propósito: son de
 * lectura pública por RLS, así que este script nunca necesita la llave de
 * servicio — y por eso puede correr en CI sin un secreto de escritura.
 */
async function slugsDePlantillas(): Promise<string[]> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const r = await fetch(
    `${url}/rest/v1/templates?select=slug&is_active=eq.true&order=slug`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!r.ok) throw new Error(`No pude leer las plantillas: ${r.status}`);
  return (await r.json()).map((t: { slug: string }) => t.slug);
}

async function capturar(page: Page, slug: string): Promise<number> {
  // El reloj se congela ANTES de navegar: si se hiciera después, el primer
  // render ya habría usado la hora real.
  await page.clock.setFixedTime(new Date(RELOJ_CAPTURA));

  const res = await page.goto(`${BASE}/plantilla/${slug}`, {
    waitUntil: "networkidle",
    timeout: 45_000,
  });
  if (!res || !res.ok()) {
    throw new Error(`HTTP ${res?.status() ?? "sin respuesta"}`);
  }

  // Fuera el indicador de dev de Next. Capturando contra `pnpm dev` se pinta
  // un círculo oscuro con la "N" abajo a la izquierda, y queda QUEMADO en la
  // miniatura: se vio en la primera tanda. Vive en un `nextjs-portal` con
  // shadow DOM, así que se oculta el portal entero. En una build de
  // producción el selector simplemente no encuentra nada.
  await page.addStyleTag({
    content: "nextjs-portal,[data-nextjs-toast]{display:none !important}",
  });

  // Fuentes aplicadas. Sin esto la miniatura sale con la fuente de reserva.
  await page.evaluate(() => document.fonts.ready);

  // Que la página tenga contenido de verdad. Un 404 o un error de Next
  // producen un JPEG válido y vacío.
  const secciones = await page.locator("section").count();
  if (secciones === 0) throw new Error("la página no renderizó ninguna sección");
  const textoError = await page
    .locator("text=/Application error|Unhandled Runtime Error/i")
    .count();
  if (textoError > 0) throw new Error("la página muestra un error de Next");

  const jpeg = await page.screenshot({ type: "jpeg", quality: 82 });
  writeFileSync(join(DESTINO, `${slug}.jpg`), jpeg);
  return jpeg.length;
}

async function main() {
  const pedidos = process.argv.slice(2);
  const slugs = pedidos.length > 0 ? pedidos : await slugsDePlantillas();
  console.log(`Capturando ${slugs.length} plantilla(s) desde ${BASE}`);
  console.log(`Reloj congelado en ${RELOJ_CAPTURA}`);

  // El destino se crea UNA vez, no en cada iteración: `recursive` es
  // idempotente, pero crear el directorio pertenece al arranque.
  mkdirSync(DESTINO, { recursive: true });

  let browser: Browser | undefined;
  const fallos: { slug: string; error: string }[] = [];
  let bytes = 0;

  try {
    // `channel: "chrome"` usa el Chrome instalado: cero descarga de navegador.
    browser = await chromium.launch({ channel: "chrome" });
    const ctx = await browser.newContext({
      viewport: { width: ANCHO_CAPTURA, height: ALTO_CAPTURA },
      deviceScaleFactor: ESCALA_CAPTURA,
      // Tema claro fijo: `prefers-color-scheme` del sistema cambiaría las
      // miniaturas según la máquina que las genere.
      colorScheme: "light",
      // Sin animaciones del sistema tampoco, por si algún día se reactivan.
      reducedMotion: "reduce",
      locale: "es-MX",
      timezoneId: "America/Mexico_City",
    });
    const page = await ctx.newPage();

    for (const slug of slugs) {
      try {
        const n = await capturar(page, slug);
        bytes += n;
        console.log(`  ✓ ${slug} (${Math.round(n / 1024)} KB)`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  ✗ ${slug}: ${msg}`);
        fallos.push({ slug, error: msg });
      }
    }
  } finally {
    await browser?.close();
  }

  console.log(
    `\n${slugs.length - fallos.length}/${slugs.length} capturadas · ` +
      `${Math.round(bytes / 1024)} KB en total · ${DESTINO}`,
  );

  // Salir con error si algo falló: en CI, un fallo silencioso deja miniaturas
  // viejas o ausentes y el catálogo parece funcionar.
  if (fallos.length > 0) {
    console.error(`\n${fallos.length} fallo(s):`);
    for (const f of fallos) console.error(`  ${f.slug}: ${f.error}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
