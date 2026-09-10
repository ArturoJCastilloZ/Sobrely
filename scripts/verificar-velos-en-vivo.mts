/**
 * ¿El velo que se RENDERIZA alcanza el velo MEDIDO?
 *
 * Uso:
 *   node scripts/verificar-velos-en-vivo.mts
 *
 * Por qué existe. `verificar-contraste-arte.mts` compara el velo medido contra
 * lo que declara `src/lib/theme/arte.ts`, que es el registro. Pero lo que un
 * invitado ve no es el registro: es la FILA de la base. Entre las dos hay
 * catorce migraciones de la campaña de diferenciación, así que pueden divergir
 * —y divergen—.
 *
 * `seed-piloto.test.ts` intentaba cubrir esto exigiendo que el velo del SEED
 * fuera igual al de `arte.ts`, y ese modelo estaba mal: una migración aplicada
 * es historia congelada y el registro es vivo. `boda-papel-y-lino` lo enseña —
 * el seed le puso un telón que hoy ya no tiene—. Este script pregunta lo que sí
 * importa: de las plantillas ACTIVAS, ¿alguna pinta texto sobre un telón con
 * menos velo del que su arte necesita?
 *
 * Decisiones que conviene no deshacer sin leer por qué:
 *
 * - **Sólo se mira el TELÓN.** La misma foto puede ser el `hero.imageUrl` o
 *   vivir en el slot de un módulo, y ahí el velo del telón no aplica: el hero
 *   pinta su propio degradado. Cruzar los tres sitios sin distinguirlos daría
 *   falsos positivos — medido: cinco de las piezas que el gate marca se usan
 *   como hero o slot y ninguna como telón.
 *
 * - **Es de LECTURA y con la llave publicable.** No escribe nada. Las
 *   plantillas son de lectura pública por RLS, así que no necesita secreto.
 *
 * - **El veredicto se acota a lo que se puede afirmar.** Un velo corto NO es lo
 *   mismo que texto ilegible: el velo mínimo se mide sobre la caja de texto
 *   completa, y la caja de un elemento de bloque incluye zona SIN GLIFOS. Dos
 *   casos comprobados mirando a 3x (`boda-elegante` y `xv-noche-estelar`) se
 *   leen perfectamente con el velo corto. Por eso esto avisa con exit 0 por
 *   defecto y sólo falla con `--estricto`: un guard que grita sin razón acaba
 *   borrado, y con él la protección real.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ARTE, buscarArte } from "../src/lib/theme/arte.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ESTRICTO = process.argv.includes("--estricto");

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

type Fila = {
  slug: string;
  theme_config: {
    backgroundImage?: { url?: string; overlay?: number } | null;
  } | null;
};

async function main() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const r = await fetch(
    `${url}/rest/v1/templates?select=slug,theme_config&is_active=eq.true&order=slug`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!r.ok) throw new Error(`No pude leer las plantillas: ${r.status}`);
  const filas: Fila[] = await r.json();

  // El universo primero. Un conteo parcial presentado como total ya se
  // convirtio tres veces en una afirmacion falsa en este proyecto.
  console.log(`UNIVERSO: ${filas.length} plantillas activas`);
  if (filas.length === 0) throw new Error("cero plantillas: sonda invalida");

  const conTelon = filas.filter((f) => f.theme_config?.backgroundImage?.url);
  console.log(`con telón declarado: ${conTelon.length}`);
  console.log(`registro de arte: ${ARTE.length} direcciones\n`);

  const cortos: { slug: string; clave: string; tiene: number; pide: number }[] = [];
  const sinRegistrar: { slug: string; url: string }[] = [];

  for (const f of conTelon) {
    const bi = f.theme_config!.backgroundImage!;
    const clave = bi
      .url!.replace(/^\/arte\/(foto\/)?/, "")
      .replace(/\.(svg|jpe?g)$/i, "");
    const arte = buscarArte(clave);
    if (!arte) {
      sinRegistrar.push({ slug: f.slug, url: bi.url! });
      continue;
    }
    const tiene = bi.overlay ?? 0;
    if (tiene + 1e-9 < arte.overlay) {
      cortos.push({ slug: f.slug, clave, tiene, pide: arte.overlay });
    }
  }

  if (sinRegistrar.length > 0) {
    console.error(`${sinRegistrar.length} telón(es) SIN REGISTRAR en arte.ts:`);
    for (const x of sinRegistrar) console.error(`  ${x.slug} → ${x.url}`);
    console.error(
      "\nUn telón sin registrar es un telón sin velo medido y sin procedencia.",
    );
    process.exit(1);
  }
  console.log("todos los telones vivos están registrados en arte.ts");

  if (cortos.length === 0) {
    console.log("y ninguno se queda corto de velo.");
    return;
  }

  console.log(`\n⚠️  ${cortos.length} plantilla(s) con el velo por DEBAJO del medido:`);
  for (const x of cortos) {
    console.log(
      `  ${x.slug.padEnd(28)} ${x.clave.padEnd(26)} tiene ${x.tiene} · pide ${x.pide}`,
    );
  }
  console.log(
    "\nOJO: velo corto NO es lo mismo que texto ilegible. El velo minimo se\n" +
      "mide sobre la CAJA del texto, y la caja de un elemento de bloque incluye\n" +
      "zona sin glifos. Antes de subir un velo —que oscurece el arte— hay que\n" +
      "MIRAR la plantilla en las tres superficies.",
  );
  if (ESTRICTO) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
