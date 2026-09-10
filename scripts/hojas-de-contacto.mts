/**
 * Hojas de contacto de las tres superficies que exige la escala del research
 * (§19.10 de `docs/TEMPLATE_VISUAL_RESEARCH_V2.md`), para que el dev revise el
 * arte con SU ojo en vez de fiarse de la autoevaluación del agente.
 *
 * Uso:
 *   node scripts/hojas-de-contacto.mts                 # las 65
 *   node scripts/hojas-de-contacto.mts boda-elegante   # sólo esas
 *
 * Requiere el servidor levantado. BASE_URL cambia el origen.
 * Salida: DESTINO (por defecto el scratchpad, ver SALIDA_HOJAS).
 *
 * Decisiones que conviene no deshacer sin leer por qué:
 *
 * - **Se captura el PLIEGUE, no `fullPage`.** El telón es un `sticky` de
 *   `100svh` (`theme-scope.tsx`) sobre el que se aplica `bg-cover`, así que su
 *   geometría —y por tanto qué franja del lienzo de 900 sobrevive— depende de
 *   la ALTURA DEL VIEWPORT. Una captura de página completa mide el telón una
 *   sola vez arriba y deja el resto del alto sin él: juzgaría un arte que
 *   ningún usuario ve. La superficie donde el arte se juega es el pliegue.
 *
 * - **`reducedMotion: "reduce"`, y no scroll para disparar los reveals.**
 *   `AnimatedModule` calcula `active = ... && !reduce`, así que con
 *   `prefers-reduced-motion` el módulo se renderiza como un `div` plano y
 *   SIEMPRE visible, sin pasar por el IntersectionObserver. Recorrer la página
 *   a scroll para despertar el observer sería peor: los presets con
 *   `once: false` se vuelven a ocultar al salir de vista, así que la captura
 *   dependería del orden del recorrido. Se usa la palanca que el propio
 *   producto honra.
 *
 * - **Reloj congelado** en `RELOJ_CAPTURA`, igual que las miniaturas: la cuenta
 *   atrás se calcula contra `now()` y sin congelarlo dos tandas no se pueden
 *   comparar.
 *
 * - **Se comprueba por EFECTO que no quedó nada oculto.** Además de que la
 *   página renderizó secciones, se cuenta cuántos `.anim` quedaron SIN
 *   `is-revealed` y cuántas secciones tienen `opacity: 0`. Si el mecanismo de
 *   ocultar volviera a morder (el bug del §23 del roadmap), la captura saldría
 *   como un JPEG válido con nueve módulos invisibles y nadie lo notaría.
 */
import { chromium, type Browser, type Page } from "playwright-core";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RELOJ_CAPTURA } from "../src/lib/invitations/template-preview.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DESTINO = process.env.SALIDA_HOJAS ?? join(RAIZ, ".hojas-de-contacto");

/** Las dos superficies de PÁGINA. La de tarjeta ya vive en `public/previews`. */
const SUPERFICIES = [
  { nombre: "375", ancho: 375, alto: 812 },
  { nombre: "1200", ancho: 1200, alto: 900 },
] as const;

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

/** `event_type` y no `category`: la tabla `templates` no tiene columna
 *  `category`. Pedirla devuelve 400, y el 400 no dice cuál falta. */
type Plantilla = { slug: string; name: string; event_type: string };

/**
 * Las plantillas ACTIVAS, con su categoría, leídas con la llave publicable
 * (son de lectura pública por RLS). Se piden todas y se cuenta el UNIVERSO:
 * el conteo que se reporta es el de la BD, no el del filtro de la línea de
 * comandos.
 */
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

type Medida = {
  secciones: number;
  sinRevelar: number;
  opacidadCero: number;
  viewport: number;
  /** El telón, si lo hay, y qué franja de su lienzo sobrevive al `bg-cover`. */
  telon: {
    url: string;
    cajaW: number;
    cajaH: number;
    lienzoW: number;
    lienzoH: number;
    y0: number;
    y1: number;
    x0: number;
    x1: number;
  } | null;
};

/**
 * Lo que se comprueba DENTRO de la página, en su propio contexto.
 *
 * La franja del telón que sobrevive se DERIVA de la caja real y del tamaño
 * natural del archivo, no se supone. Está medido y no es lo que dice la
 * regla 1 del §25 del roadmap: `y 170..730` es la geometría de la TARJETA
 * (420×560). En la página real la franja cambia con la proporción del
 * viewport — a 375 px sobrevive el lienzo ENTERO, a 1200 px sólo el 35 % —, y
 * la más apretada es la de escritorio, no la de la tarjeta.
 *
 * El telón se busca por `background-size: cover` y NO por `position: sticky`:
 * en la página pública la capa computa `absolute`, así que buscarla por
 * `sticky` no encuentra nada y el script informaba «sin telón» de una
 * plantilla que sí lo tiene.
 */
async function medir(page: Page): Promise<Medida> {
  return await page.evaluate(async () => {
    const secciones = Array.from(document.querySelectorAll("section"));
    const opacidadCero = secciones.filter(
      (s) => getComputedStyle(s).opacity === "0",
    ).length;
    const anim = Array.from(document.querySelectorAll(".anim"));
    const sinRevelar = anim.filter(
      (a) => !a.classList.contains("is-revealed"),
    ).length;

    const capa = Array.from(document.querySelectorAll<HTMLElement>("*")).find(
      (e) => {
        const cs = getComputedStyle(e);
        return cs.backgroundImage !== "none" && cs.backgroundSize === "cover";
      },
    );

    let telon: Medida["telon"] = null;
    if (capa) {
      const cs = getComputedStyle(capa);
      const r = capa.getBoundingClientRect();
      const url = cs.backgroundImage.slice(5, -2);
      const nat = await new Promise<{ w: number; h: number }>((res) => {
        const im = new Image();
        im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => res({ w: 0, h: 0 });
        im.src = url;
      });
      if (nat.w > 0 && nat.h > 0) {
        const esc = Math.max(r.width / nat.w, r.height / nat.h);
        const visH = Math.min(nat.h, r.height / esc);
        const visW = Math.min(nat.w, r.width / esc);
        const y0 = (nat.h - visH) / 2;
        const x0 = (nat.w - visW) / 2;
        telon = {
          url,
          cajaW: Math.round(r.width),
          cajaH: Math.round(r.height),
          lienzoW: nat.w,
          lienzoH: nat.h,
          y0: Math.round(y0),
          y1: Math.round(y0 + visH),
          x0: Math.round(x0),
          x1: Math.round(x0 + visW),
        };
      }
    }

    return {
      secciones: secciones.length,
      sinRevelar,
      opacidadCero,
      viewport: window.innerHeight,
      telon,
    };
  });
}

/**
 * Un slug seguro como SEGMENTO de ruta. El slug viene de la BD, no del
 * usuario final, pero acaba siendo el nombre de un archivo que este script
 * ESCRIBE: `join(dir, `${slug}.jpg`)` con un slug que trajera `../` escribiría
 * fuera del destino. Se ancla aquí, donde está la primitiva de escritura, en
 * vez de confiar en la validación de otra capa.
 */
const SLUG_SEGURO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function capturar(
  page: Page,
  slug: string,
  superficie: (typeof SUPERFICIES)[number],
): Promise<{ bytes: number; medida: Medida }> {
  if (!SLUG_SEGURO.test(slug)) {
    throw new Error(`slug con forma inesperada, no lo escribo a disco: ${slug}`);
  }
  await page.setViewportSize({ width: superficie.ancho, height: superficie.alto });
  await page.clock.setFixedTime(new Date(RELOJ_CAPTURA));

  const res = await page.goto(`${BASE}/plantilla/${slug}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  if (!res || !res.ok()) {
    throw new Error(`HTTP ${res?.status() ?? "sin respuesta"}`);
  }

  // El indicador de dev de Next queda QUEMADO en la captura contra `pnpm dev`.
  await page.addStyleTag({
    content: "nextjs-portal,[data-nextjs-toast]{display:none !important}",
  });
  await page.evaluate(() => document.fonts.ready);

  const medida = await medir(page);
  if (medida.secciones === 0) {
    throw new Error("la página no renderizó ninguna sección");
  }
  const textoError = await page
    .locator("text=/Application error|Unhandled Runtime Error/i")
    .count();
  if (textoError > 0) throw new Error("la página muestra un error de Next");
  // El bug del §23: un módulo que se queda sin revelar produce una captura
  // válida y vacía. Se falla en voz alta.
  if (medida.sinRevelar > 0) {
    throw new Error(
      `${medida.sinRevelar} módulo(s) sin revelar — la captura mentiría`,
    );
  }
  if (medida.opacidadCero > 0) {
    throw new Error(`${medida.opacidadCero} sección(es) con opacity 0`);
  }

  // Pliegue, no `fullPage`: ver la cabecera.
  const jpeg = await page.screenshot({ type: "jpeg", quality: 84 });
  const dir = join(DESTINO, superficie.nombre);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${slug}.jpg`), jpeg);
  return { bytes: jpeg.length, medida };
}

async function main() {
  const pedidos = process.argv.slice(2);
  const todas = await plantillas();
  const objetivo =
    pedidos.length > 0 ? todas.filter((t) => pedidos.includes(t.slug)) : todas;

  // El universo primero, el filtro después. Un conteo parcial presentado como
  // total ya se convirtió tres veces en una afirmación falsa (§7).
  console.log(`UNIVERSO: ${todas.length} plantillas activas en la BD`);
  console.log(`ESTA TANDA: ${objetivo.length}`);
  console.log(`Origen ${BASE} · reloj congelado en ${RELOJ_CAPTURA}`);
  console.log(`Destino ${DESTINO}\n`);
  if (objetivo.length === 0) throw new Error("el filtro no encontró plantillas");

  mkdirSync(DESTINO, { recursive: true });

  let browser: Browser | undefined;
  const fallos: { slug: string; superficie: string; error: string }[] = [];
  const medidas: Record<string, Record<string, Medida>> = {};
  let bytes = 0;

  try {
    browser = await chromium.launch({ channel: "chrome" });
    const ctx = await browser.newContext({
      deviceScaleFactor: 2,
      colorScheme: "light",
      // La palanca que apaga el reveal, ver cabecera.
      reducedMotion: "reduce",
      locale: "es-MX",
      timezoneId: "America/Mexico_City",
    });
    const page = await ctx.newPage();

    for (const superficie of SUPERFICIES) {
      console.log(`— superficie ${superficie.nombre} px —`);
      for (const t of objetivo) {
        try {
          const { bytes: n, medida } = await capturar(page, t.slug, superficie);
          bytes += n;
          medidas[t.slug] ??= {};
          medidas[t.slug][superficie.nombre] = medida;
          const tel = medida.telon
            ? `telón ${medida.telon.lienzoW}x${medida.telon.lienzoH}` +
              ` → y ${medida.telon.y0}..${medida.telon.y1}` +
              ` x ${medida.telon.x0}..${medida.telon.x1}`
            : "SIN telón";
          console.log(
            `  ✓ ${t.slug} (${Math.round(n / 1024)} KB · ${tel})`,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`  ✗ ${t.slug}: ${msg}`);
          fallos.push({ slug: t.slug, superficie: superficie.nombre, error: msg });
        }
      }
    }
  } finally {
    await browser?.close();
  }

  // Una tanda PARCIAL se FUSIONA con lo que ya hay, no lo sobrescribe. Escribir
  // `objetivo` a secas dejaba el archivo con una sola plantilla tras recapturar
  // una, y `armar-hojas.mts` habria compuesto una hoja de UNA pieza con toda
  // apariencia de estar completa. Es el mismo defecto que `capturar-miniaturas`
  // tiene anotado con `REVISION_MINIATURAS`, y aqui se cierra en vez de
  // repetirse.
  const rutaMedidas = join(DESTINO, "medidas.json");
  let acumulado: {
    plantillas: Plantilla[];
    medidas: Record<string, Record<string, Medida>>;
  } = { plantillas: [], medidas: {} };
  if (existsSync(rutaMedidas)) {
    try {
      acumulado = JSON.parse(readFileSync(rutaMedidas, "utf8"));
    } catch {
      // Un archivo corrupto no debe abortar la tanda: se reconstruye.
      acumulado = { plantillas: [], medidas: {} };
    }
  }
  // Las plantillas se toman SIEMPRE del universo recien leido de la BD, no de
  // lo acumulado: si una se desactiva, no debe sobrevivir en el artefacto.
  writeFileSync(
    rutaMedidas,
    JSON.stringify(
      { plantillas: todas, medidas: { ...acumulado.medidas, ...medidas } },
      null,
      2,
    ),
  );

  const hechas = objetivo.length * SUPERFICIES.length - fallos.length;
  console.log(
    `\n${hechas}/${objetivo.length * SUPERFICIES.length} capturas · ` +
      `${Math.round(bytes / 1024)} KB · ${DESTINO}`,
  );

  if (fallos.length > 0) {
    console.error(`\n${fallos.length} fallo(s):`);
    for (const f of fallos) {
      console.error(`  ${f.slug} @${f.superficie}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
