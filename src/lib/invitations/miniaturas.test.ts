import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/**
 * Contrato de las miniaturas de plantillas (Fase 4).
 *
 * Hay DOS sitios que tienen que decir lo mismo sobre dónde vive una miniatura:
 * el script que las escribe (`scripts/capturar-miniaturas.mts`) y la migración
 * que pone la URL en la BD (`0029`). Si se separan, el catálogo apunta a
 * archivos que no existen y el fallo es visual y silencioso: `next/image`
 * devuelve un hueco, nadie ve un error en los logs, y las 50 tarjetas quedan
 * grises hasta que lo ve un cliente.
 *
 * No se puede comprobar contra la BD desde aquí (la suite corre en `node`, sin
 * base), así que se ancla lo que sí es verificable: que las dos rutas
 * coincidan, y que los archivos que hay en disco cumplan ese patrón.
 */
const RAIZ = fileURLToPath(new URL("../../../", import.meta.url));
const DIR_MINIATURAS = join(RAIZ, "public", "previews", "plantillas");

const script = readFileSync(
  join(RAIZ, "scripts", "capturar-miniaturas.mts"),
  "utf8",
);
const migracion = readFileSync(
  join(RAIZ, "supabase", "migrations", "0029_templates_preview_image_url.sql"),
  "utf8",
);

describe("el script y la migración apuntan al MISMO sitio", () => {
  it("la migración deriva la URL del slug con la carpeta y extensión del script", () => {
    // El script escribe en `public/previews/plantillas/<slug>.jpg`, así que la
    // URL pública es `/previews/plantillas/<slug>.jpg`.
    expect(script).toMatch(/"public",\s*"previews",\s*"plantillas"/);
    expect(script).toMatch(/\$\{slug\}\.jpg/);
    expect(migracion).toContain("'/previews/plantillas/' || slug || '.jpg'");
  });

  it("la migración no escribe cincuenta rutas a mano", () => {
    // Derivar del slug es lo que permite que una plantilla nueva solo necesite
    // correr el script; una lista a mano se queda vieja en el primer añadido.
    expect(migracion).not.toMatch(/insert into public\.templates/i);
    expect(migracion.match(/'\/previews\/plantillas\//g)?.length ?? 0).toBeLessThan(4);
  });
});

describe("la proporción es UNA sola fuente", () => {
  const preview = readFileSync(
    join(RAIZ, "src", "lib", "invitations", "template-preview.ts"),
    "utf8",
  );
  const catalogo = readFileSync(
    join(RAIZ, "src", "app", "dashboard", "templates", "page.tsx"),
    "utf8",
  );

  it("el alto de captura se DERIVA de la proporción, no se escribe a mano", () => {
    expect(preview).toMatch(/PROPORCION_MINIATURA/);
    expect(preview).toMatch(/ALTO_CAPTURA\s*=\s*\n?\s*\(ANCHO_CAPTURA/);
    // Si el script volviera a declarar su propio alto, se podría separar del
    // hueco que reserva el catálogo y `object-cover` recortaría en silencio.
    expect(script).not.toMatch(/const ALTO_CAPTURA\s*=\s*\d/);
  });

  it("el catálogo reserva el hueco con esa MISMA proporción", () => {
    expect(catalogo).toMatch(/PROPORCION_MINIATURA/);
    // `aspect-[3/4]` a mano es justo la duplicación que esto viene a cerrar.
    expect(catalogo).not.toMatch(/aspect-\[\d+\/\d+\]/);
  });
});

describe("la caché del optimizador no puede servir miniaturas viejas", () => {
  const catalogo = readFileSync(
    join(RAIZ, "src", "app", "dashboard", "templates", "page.tsx"),
    "utf8",
  );
  const config = readFileSync(join(RAIZ, "next.config.ts"), "utf8");
  const preview = readFileSync(
    join(RAIZ, "src", "lib", "invitations", "template-preview.ts"),
    "utf8",
  );

  /**
   * El modo de fallo que esto atrapa, y que ya ocurrió: las miniaturas se
   * regeneran EN SU SITIO —el archivo cambia y la ruta no— y la caché en disco
   * del optimizador de Next se indexa por URL con 4 h de vida. Tras regenerar
   * las 50 con el arte puesto, el catálogo seguía mostrando las viejas —sin
   * arte y con copy de anfitrión ya retirado— con `X-Nextjs-Cache: HIT` de una
   * entrada anterior a la regeneración, mientras el archivo en crudo ya era el
   * nuevo. Nada avisaba.
   */
  it("el catálogo añade la revisión a la URL de la miniatura", () => {
    expect(catalogo).toMatch(/REVISION_MINIATURAS/);
    expect(catalogo).toMatch(/\?v=\$\{REVISION_MINIATURAS\}/);
  });

  it("la query está permitida en images.localPatterns", () => {
    // Sin declararla, Next 16 no solo ignora la query: TUMBA la página con
    // `next-image-unconfigured-localpatterns`. Pasó al primer intento.
    expect(config).toMatch(/localPatterns/);
    expect(config).toMatch(/previews\/plantillas/);
  });

  it("el script de captura actualiza la revisión", () => {
    // Una revisión que no sube deja el catálogo sirviendo lo cacheado, así que
    // el bump tiene que ser parte de la tanda y no un paso manual.
    expect(script).toMatch(/REVISION_MINIATURAS = "\$\{rev\}"/);
    expect(preview).toMatch(/export const REVISION_MINIATURAS = "\d+";/);
  });
});

describe("las miniaturas en disco", () => {
  const hayCarpeta = existsSync(DIR_MINIATURAS);
  const archivos = hayCarpeta ? readdirSync(DIR_MINIATURAS) : [];

  it("existen y son .jpg con nombre de slug", () => {
    expect(hayCarpeta, `falta ${DIR_MINIATURAS}: corre el script`).toBe(true);
    expect(archivos.length).toBeGreaterThanOrEqual(50);
    const raros = archivos.filter((f) => !/^[a-z0-9-]+\.jpg$/.test(f));
    expect(raros, `archivos que no encajan en <slug>.jpg: ${raros.join(", ")}`)
      .toEqual([]);
  });

  it("ninguna está vacía ni sospechosamente pequeña", () => {
    // Un 404, un error de Next o una página en blanco producen un JPEG
    // perfectamente válido. Un umbral de tamaño es la señal más barata de que
    // la captura tiene contenido: la más liviana de las 50 reales pesa 27 KB.
    const pequenas = archivos
      .map((f) => ({ f, kb: Math.round(statSync(join(DIR_MINIATURAS, f)).size / 1024) }))
      .filter((x) => x.kb < 10);
    expect(
      pequenas,
      `miniaturas de menos de 10KB (probablemente en blanco): ${pequenas
        .map((x) => `${x.f} ${x.kb}KB`)
        .join(", ")}`,
    ).toEqual([]);
  });
});
