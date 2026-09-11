/**
 * Capturas ANTES/DESPUÉS de las invitaciones PUBLICADAS.
 *
 * Para qué: es la mitigación que el dev puso como requisito antes de mergear el
 * telón a `main` (§26 del roadmap). `ThemeScope` pinta TODAS las invitaciones
 * publicadas, así que un cambio suyo puede romper la de un cliente sin que nada
 * lo avise. Esto compara el render de `main` contra el de la rama.
 *
 * Uso:
 *   1. Levantar `main` en un worktree aparte, en el puerto ANTES.
 *   2. La rama en el puerto DESPUÉS (el dev server de siempre).
 *   3. node scripts/capturas-antes-despues.mts <rutas.txt> <salida/>
 *
 * `rutas.txt` = una ruta pública por línea (`/<username>/<slug>`). Se derivan de
 * la BD contando `is_published`, NUNCA de una lista escrita a mano: cuando se
 * escribió el requisito había 4 publicadas y hoy son 7.
 *
 * Ojo con las imágenes: el telón es un `background-image`. Sin esperar a que
 * carguen se comparan páginas a medio pintar y la diferencia no significa nada.
 */
// `playwright-core` y NO `playwright`: es lo que el repo ya usa a proposito
// —el paquete completo descarga navegadores en el postinstall—, con
// `channel: "chrome"` para el Chrome del sistema. Ver `capturar-miniaturas.mts`.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const RUTAS = readFileSync(process.argv[2], "utf8").trim().split("\n").filter(Boolean);
const SALIDA = process.argv[3];
const SUPERFICIES = [
  { nombre: "escritorio", w: 1200, h: 900 },
  { nombre: "movil", w: 375, h: 812 },
];
const PUERTOS: Record<string, number> = { antes: 3211, despues: 3000 };

const nav = await chromium.launch({ channel: "chrome" });
let n = 0;
const filas: string[] = [];
for (const [etiqueta, puerto] of Object.entries(PUERTOS)) {
  for (const s of SUPERFICIES) {
    const ctx = await nav.newContext({
      viewport: { width: s.w, height: s.h },
      deviceScaleFactor: 1,
    });
    const pg = await ctx.newPage();
    for (const ruta of RUTAS) {
      const slug = ruta.split("/").pop();
      const resp = await pg.goto(`http://localhost:${puerto}${ruta}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await pg
        .waitForFunction(
          () => [...document.images].every((i) => i.complete && i.naturalWidth > 0),
          null,
          { timeout: 20000 },
        )
        .catch(() => {});
      await pg.waitForTimeout(1200);
      const archivo = `${SALIDA}/${slug}__${s.nombre}__${etiqueta}.png`;
      await pg.screenshot({ path: archivo });
      filas.push([slug, s.nombre, etiqueta, resp?.status(), archivo].join("\t"));
      n += 1;
    }
    await ctx.close();
  }
}
await nav.close();
writeFileSync(`${SALIDA}/indice.tsv`, filas.join("\n"));

const esperadas = RUTAS.length * SUPERFICIES.length * 2;
console.log(`capturas: ${n} de ${esperadas} esperadas`);
if (n !== esperadas) {
  console.error("FALTAN CAPTURAS");
  process.exit(1);
}
