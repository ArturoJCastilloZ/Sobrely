/**
 * Imágenes para las publicaciones de redes sociales: una composición 4:5 con
 * tarjetas COMPLETAS de la galería pública, por tipo de evento, SIN precios ni
 * botones, en tema claro.
 *
 * Uso:
 *   BASE_URL=https://sobrely.com node scripts/capturar-galeria-social.mts          # todas
 *   BASE_URL=https://sobrely.com node scripts/capturar-galeria-social.mts boda xv  # solo esas
 *
 * Escribe `public/social/<tema>-<n>.jpg` (1080×1350). Se sirven como archivos
 * estáticos en `https://sobrely.com/social/<tema>-<n>.jpg`; el escenario de Make
 * elige una por día. Se vuelven a generar a mano cuando cambie el catálogo.
 *
 * Origen: `BASE_URL` (por defecto `http://localhost:3000`). Apúntalo a producción
 * para fotografiar el catálogo real; no necesita sesión, la galería es pública.
 *
 * Decisiones que conviene no deshacer sin leer por qué:
 *
 * - **Se COMPONE la imagen, no se recorta la página.** Un recorte por píxeles cae
 *   en cualquier parte: la primera fila queda cortada a la mitad (se vio en el
 *   prototipo). Aquí se clonan las tarjetas elegidas en un lienzo propio de
 *   1080×1350, con un título y un pie, así el encuadre es siempre el mismo.
 * - **Sin precios, y se COMPRUEBA.** Quitar el precio es solo borrar el bloque de
 *   contenido de cada tarjeta; si la página cambia y deja de funcionar, el
 *   script falla en vez de publicar un precio congelado. Misma razón que la
 *   comprobación de tamaño final.
 * - **Chrome del sistema** (`channel: "chrome"`), igual que `capturar-miniaturas`:
 *   `playwright-core` no descarga nada, y en un entorno de cero phone-home eso
 *   vale más que fijar la versión del navegador.
 * - **Tema claro forzado** (`colorScheme: "light"`): la galería sigue el tema del
 *   sistema, y la misma página sale clara u oscura según quién la ejecute.
 * - **La selección es determinista** (`src/lib/social/seleccion-galeria.ts`): las
 *   preferidas de abajo, curadas a mano, y después el peso de la miniatura.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "playwright-core";
import {
  dimensionesJpeg,
  elegirTarjetas,
  gruposCompletos,
  slugDeImagen,
  type Candidata,
} from "../src/lib/social/seleccion-galeria.ts";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const ANCHO = 1080;
const ALTO = 1350;
const POR_IMAGEN = 6; // 2 filas de 3 tarjetas
const SALIDA = new URL("../public/social/", import.meta.url);

type Tema = {
  /** Prefijo del archivo de salida. */
  archivo: string;
  /** Texto de la pastilla del filtro en la galería (sin el contador). */
  pastilla: string;
  titulo: string;
  /** Cuántas imágenes se intentan; se recorta a las tandas COMPLETAS que haya. */
  grupos: number;
  /**
   * Curadas a mano: solo nombres que vi con mis propios ojos en la galería. El
   * resto del orden lo decide el peso de la miniatura (proxy imperfecto).
   */
  prioritarias: string[];
};

const TEMAS: Tema[] = [
  {
    archivo: "boda",
    pastilla: "Boda",
    titulo: "Plantillas para tu boda",
    grupos: 2,
    prioritarias: ["boda-elegante", "boda-de-lujo", "boda-cinematografica", "boda-terracota"],
  },
  {
    archivo: "xv",
    pastilla: "XV años",
    titulo: "Plantillas para tus XV años",
    grupos: 2,
    prioritarias: ["xv-con-sesion", "xv-con-salon", "xv-produccion-completa"],
  },
  {
    archivo: "cumpleanos",
    pastilla: "Cumpleaños",
    titulo: "Plantillas para tu cumpleaños",
    grupos: 2,
    prioritarias: ["cumpleanos-arco"],
  },
  {
    archivo: "baby",
    pastilla: "Baby shower",
    titulo: "Plantillas para tu baby shower",
    grupos: 2,
    prioritarias: [],
  },
  {
    archivo: "corporativo",
    pastilla: "Corporativo",
    titulo: "Plantillas para eventos corporativos",
    grupos: 2,
    prioritarias: [],
  },
];

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function abrirGaleria(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/plantillas`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const n = await page.locator('[data-slot="card"]').count();
  // Un 404, un error de Next o una página vacía producen una imagen válida y
  // vacía: sin esto el fallo se vuelve una publicación en blanco.
  if (n < 10) throw new Error(`La galería de ${BASE_URL} solo trae ${n} tarjetas; no se genera nada.`);
}

/** Filtra por tipo y espera a que la rejilla muestre EXACTAMENTE las de ese tipo. */
async function filtrar(page: Page, pastilla: string): Promise<number> {
  const boton = page
    .locator(
      '[aria-label="Filtrar por tipo de evento"] button, [aria-label="Filtrar por tipo de evento"] [role=radio]',
    )
    .filter({ hasText: new RegExp(`^${escapar(pastilla)}\\s*\\d+$`) });
  if ((await boton.count()) !== 1) {
    throw new Error(`No encuentro UNA pastilla «${pastilla}» en el filtro de la galería.`);
  }
  const esperadas = Number((await boton.innerText()).replace(/\D+/g, ""));
  await boton.click();
  await page.waitForFunction(
    (n) => document.querySelectorAll('[data-slot="card"]').length === n,
    esperadas,
    { timeout: 15_000 },
  );
  return esperadas;
}

async function pesoDeMiniatura(slug: string): Promise<number> {
  try {
    const r = await fetch(new URL(`/previews/plantillas/${slug}.jpg`, BASE_URL), { method: "HEAD" });
    return Number(r.headers.get("content-length") ?? 0) || 0;
  } catch {
    return 0;
  }
}

async function componer(
  page: Page,
  o: { indices: number[]; titulo: string; pie: string },
): Promise<void> {
  await page.evaluate(async ({ indices, titulo, pie, ancho, alto }) => {
    const tarjetas = [...document.querySelectorAll('[data-slot="card"]')];
    const clones = indices.map((i) => tarjetas[i].cloneNode(true) as HTMLElement);

    document.documentElement.classList.remove("dark");
    document.documentElement.style.background = "#fff";
    document.body.style.cssText = "margin:0;background:#fff";
    document.body.replaceChildren();

    const raiz = document.createElement("div");
    raiz.style.cssText =
      `box-sizing:border-box;width:${ancho}px;height:${alto}px;padding:48px 40px 32px;` +
      "background:#fff;color:#111;display:flex;flex-direction:column;overflow:hidden";
    const h = document.createElement("div");
    h.textContent = titulo;
    h.style.cssText =
      "font-size:44px;font-weight:700;letter-spacing:-0.02em;text-align:center;margin:0 0 24px";
    const rejilla = document.createElement("div");
    rejilla.style.cssText =
      "display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:start";
    for (const t of clones) {
      // Fuera el precio y el botón: es el bloque de contenido de la tarjeta.
      t.querySelector('[data-slot="card-content"]')?.remove();
      // La descripción a 2 renglones como máximo: con 3 la fila crece y el
      // contenido se pasa del lienzo (le pasó al tema de cumpleaños, por 3 px).
      // Así todas las tarjetas miden lo mismo sin importar el texto de cada una.
      const descripcion = t.querySelector<HTMLElement>('[data-slot="card-description"]');
      if (descripcion) {
        descripcion.style.cssText +=
          ";display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden";
      }
      const img = t.querySelector("img");
      if (img) {
        img.loading = "eager";
        img.decoding = "sync";
      }
      rejilla.append(t);
    }
    const pieEl = document.createElement("div");
    pieEl.textContent = pie;
    pieEl.style.cssText =
      "margin-top:auto;padding-top:16px;text-align:center;font-size:26px;font-weight:600;color:#333";
    raiz.append(h, rejilla, pieEl);
    document.body.append(raiz);

    await document.fonts.ready;
    await Promise.all(
      [...raiz.querySelectorAll("img")].map((im) =>
        im.complete ? null : new Promise((r) => ((im.onload = im.onerror = () => r(null)), 0)),
      ),
    );

    // Ajuste al lienzo. La altura de cada tarjeta depende del texto de ESA
    // plantilla (521, 541 o 565 px según cuántos renglones ocupen título y
    // descripción) y la fila más alta decide, así que ningún relleno fijo sirve
    // para todos los temas. Si la rejilla no cabe, se reduce lo justo; si cabe,
    // no se toca. `zoom` es de Chrome, que es el navegador que usa este script.
    const relleno = 48 + 32;
    const disponible = alto - relleno - h.offsetHeight - 24 - pieEl.offsetHeight;
    if (rejilla.offsetHeight > disponible) {
      (rejilla.style as CSSStyleDeclaration & { zoom: string }).zoom = String(
        (disponible / rejilla.offsetHeight) * 0.995,
      );
    }
  }, { ...o, ancho: ANCHO, alto: ALTO });
}

/** Comprobaciones sobre lo que de verdad quedó en el lienzo, antes de fotografiarlo. */
async function verificar(page: Page, tarjetasEsperadas: number): Promise<void> {
  const r = await page.evaluate(() => {
    const raiz = document.body.firstElementChild as HTMLElement;
    const imgs = [...raiz.querySelectorAll("img")];
    return {
      tarjetas: raiz.querySelectorAll('[data-slot="card"]').length,
      imagenesRotas: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
      texto: raiz.innerText,
      sobra: raiz.scrollHeight - raiz.clientHeight,
      // Para diagnosticar un desborde: qué mide cada pieza del lienzo.
      alturas: [...raiz.querySelectorAll('[data-slot="card"]')].map((c) =>
        Math.round(c.getBoundingClientRect().height),
      ),
      rejilla: Math.round((raiz.children[1] as HTMLElement).getBoundingClientRect().height),
    };
  });
  if (r.tarjetas !== tarjetasEsperadas) {
    throw new Error(`El lienzo tiene ${r.tarjetas} tarjetas y esperaba ${tarjetasEsperadas}.`);
  }
  if (r.imagenesRotas > 0) throw new Error(`${r.imagenesRotas} miniatura(s) no cargaron.`);
  // La regla de «sin precios», comprobada en el resultado y no solo en la intención.
  for (const prohibido of ["$", "para publicar", "Usar esta plantilla"]) {
    if (r.texto.includes(prohibido)) {
      throw new Error(`El lienzo contiene «${prohibido}»: la imagen debe salir sin precios ni botones.`);
    }
  }
  // Si el contenido no cabe, el recorte a 1080×1350 cortaría el pie o la fila de abajo.
  if (r.sobra > 0) {
    throw new Error(
      `El contenido se pasa ${r.sobra}px del lienzo de ${ALTO}px ` +
        `(tarjetas: ${r.alturas.join(", ")}; rejilla: ${r.rejilla}px).`,
    );
  }
}

async function main() {
  const pedidos = process.argv.slice(2);
  const temas = pedidos.length ? TEMAS.filter((t) => pedidos.includes(t.archivo)) : TEMAS;
  if (pedidos.length && temas.length !== pedidos.length) {
    throw new Error(`Temas válidos: ${TEMAS.map((t) => t.archivo).join(", ")}.`);
  }

  mkdirSync(SALIDA, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const generadas: string[] = [];
  try {
    const contexto = await browser.newContext({
      viewport: { width: ANCHO, height: ALTO },
      deviceScaleFactor: 1,
      colorScheme: "light",
    });
    for (const tema of temas) {
      const page = await contexto.newPage();
      await abrirGaleria(page);
      const total = await filtrar(page, tema.pastilla);

      const tarjetas: { i: number; src: string }[] = await page.$$eval(
        '[data-slot="card"]',
        (cs) => cs.map((c, i) => ({ i, src: c.querySelector("img")?.getAttribute("src") ?? "" })),
      );
      const porSlug = new Map<string, number>();
      for (const t of tarjetas) {
        const slug = slugDeImagen(t.src);
        if (slug) porSlug.set(slug, t.i);
      }
      const candidatas: Candidata[] = [];
      for (const slug of porSlug.keys()) candidatas.push({ slug, bytes: await pesoDeMiniatura(slug) });

      const n = Math.min(tema.grupos, gruposCompletos(candidatas.length, POR_IMAGEN));
      if (n === 0) {
        console.warn(`· ${tema.archivo}: solo ${candidatas.length} plantillas; no alcanzan para una imagen completa.`);
        await page.close();
        continue;
      }

      for (let g = 0; g < n; g++) {
        const slugs = elegirTarjetas(candidatas, {
          prioritarias: tema.prioritarias,
          cantidad: POR_IMAGEN,
          grupo: g,
        });
        // Cada imagen parte de una galería recién cargada y filtrada: `componer`
        // reemplaza el cuerpo de la página y no se puede reutilizar.
        if (g > 0) {
          await abrirGaleria(page);
          await filtrar(page, tema.pastilla);
        }
        await componer(page, {
          indices: slugs.map((s) => porSlug.get(s)!),
          titulo: tema.titulo,
          pie: "Diseñar es gratis · sobrely.com",
        });
        await verificar(page, slugs.length);

        const buf = await page.screenshot({
          type: "jpeg",
          quality: 90,
          clip: { x: 0, y: 0, width: ANCHO, height: ALTO },
        });
        const dim = dimensionesJpeg(buf);
        if (!dim || dim.ancho !== ANCHO || dim.alto !== ALTO) {
          throw new Error(`La imagen salió de ${dim?.ancho}×${dim?.alto}, no de ${ANCHO}×${ALTO}.`);
        }
        const nombre = `${tema.archivo}-${g + 1}.jpg`;
        writeFileSync(new URL(nombre, SALIDA), buf);
        generadas.push(nombre);
        console.log(`✓ ${nombre}  ${Math.round(buf.length / 1024)} KB  (${total} plantillas de «${tema.pastilla}»)  ${slugs.join(", ")}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  if (generadas.length === 0) throw new Error("No se generó ninguna imagen.");
  console.log(`\n${generadas.length} imágenes en public/social/`);
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
