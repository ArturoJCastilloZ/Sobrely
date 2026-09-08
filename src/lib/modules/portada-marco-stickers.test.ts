import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  HERO_VARIANTS,
  SECTION_FRAMES,
  defaultConfigFor,
  imagenUrlSchema,
  moduleConfigSchemas,
} from "@/lib/modules/types";
import { parseTheme } from "@/lib/theme/theme";

/**
 * P3 (variantes de portada), P5 (marco de papelería) y P6 (stickers).
 *
 * Las tres son la mitad barata del piloto: **ninguna consume una licencia de
 * imagen**, que es el punto de las familias F4 y F5 del research.
 *
 * Verificado por efecto, y mirado:
 *   - defectos: 4 miniaturas recapturadas, md5 idénticos byte a byte
 *   - `variant: "split"` con foto → medido en el navegador, `flex-direction`
 *     `row` a 1200 px y `column` a 375 px con la foto a 327
 *   - `frame: "double"` → medido `border-top-style: double`, 4px, color
 *     `srgb(0.486 0.565 0.439 / 0.35)`: el verde salvia DEL TEMA al 35 %, no un
 *     gris fijo
 *   - un sticker servido por la app renderiza en la superficie de captura y
 *     mueve el md5 (19daae70… → e1495cc9…)
 */

const leer = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("P3 · variantes de portada", () => {
  it("el defecto es `centered`, que es la composición de las 50", () => {
    expect((defaultConfigFor("hero") as { variant: string }).variant).toBe(
      "centered",
    );
  });

  it("las clases de `centered` son las de antes, copiadas y no recompuestas", () => {
    const src = leer("../../components/modules/previews.tsx");
    const i = src.indexOf("const HERO_SECTION_CLASSES");
    const mapa = src.slice(i, src.indexOf("};", i));
    // La cadena literal del hero anterior. Si alguien la "ordena", el defecto
    // deja de ser idéntico y las 50 se mueven sin que nadie lo pida.
    expect(mapa).toContain(
      "relative flex min-h-[260px] flex-col items-center justify-center gap-3 overflow-hidden px-6 py-12 text-center @2xl/inv:min-h-[460px] @2xl/inv:py-20 @4xl/inv:min-h-[70svh]",
    );
  });

  it.each(HERO_VARIANTS)("la variante %s tiene clases propias", (v) => {
    const src = leer("../../components/modules/previews.tsx");
    const i = src.indexOf("const HERO_SECTION_CLASSES");
    const mapa = src.slice(i, src.indexOf("};", i));
    expect(mapa).toContain(`${v}:`);
  });

  it("el texto se pone blanco sólo cuando va SOBRE la foto", () => {
    const src = leer("../../components/modules/previews.tsx");
    const i = src.indexOf("export function HeroPreview");
    const cuerpo = src.slice(i, src.indexOf("export function", i + 20));
    // Antes bastaba con que existiera `imageUrl`. En `split` y `editorial` la
    // foto NO está debajo del texto, así que blanco sobre la superficie clara
    // sería invisible — el bug de contraste que la Fase 0 vino a cerrar.
    expect(cuerpo).toContain("sobreFoto");
    expect(cuerpo).not.toContain('config.imageUrl ? "#fff"');
  });

  it("una variante inventada no valida", () => {
    expect(
      moduleConfigSchemas.hero.safeParse({ variant: "diagonal" }).success,
    ).toBe(false);
  });
});

describe("P5 · marco de papelería", () => {
  it("el defecto es `none` en los 11 módulos", () => {
    for (const t of ["welcome", "countdown", "rsvp"] as const) {
      expect((defaultConfigFor(t) as { frame: string }).frame).toBe("none");
    }
  });

  it("`none` es la cadena vacía: no emite nada", () => {
    const src = leer("../../components/modules/previews.tsx");
    const i = src.indexOf("const FRAME_CLASSES");
    expect(src.slice(i, src.indexOf("};", i))).toMatch(/none:\s*""/);
  });

  it("sin marco NO se añade ninguna envoltura", () => {
    // Antes el marco vivía en el contenedor y esto comprobaba que no se emitía
    // `style`. Desde que envuelve el contenido —para que no toque los bordes en
    // móvil— la propiedad equivalente, y la que sostiene el «cero píxeles», es
    // que con `none` el contenido pase TAL CUAL, sin un div de más.
    const src = leer("../../components/modules/previews.tsx");
    expect(src).toMatch(/frame === "none" \?\s*\(?\s*cuerpo/);
  });

  it("el color del marco sale del tema de la INVITACIÓN, no de un gris fijo", () => {
    const src = leer("../../components/modules/previews.tsx");
    // Acotado al bloque del marco: `var(--inv-primary` aparece también en las
    // constantes PRIMARY y TINT del principio del archivo, así que buscarlo en
    // el archivo entero pasaba en verde con el color cambiado a un gris fijo.
    // Cazado por mutación.
    const i = src.indexOf("FRAME_CLASSES[frame])");
    const bloque = src.slice(i, src.indexOf("}}", i));
    expect(bloque).toContain("var(--inv-primary");
    expect(bloque).toContain("borderColor");
    expect(bloque).toContain("outlineColor");
  });

  it.each(SECTION_FRAMES)("%s existe en el mapa de clases", (f) => {
    const src = leer("../../components/modules/previews.tsx");
    const i = src.indexOf("const FRAME_CLASSES");
    expect(src.slice(i, src.indexOf("};", i))).toContain(`${f}:`);
  });
});

describe("P6 · stickers: la maquinaria ya estaba, y sigue en pie", () => {
  it("la invitación pública pinta la capa de stickers", () => {
    const src = leer("../../components/public/public-invitation.tsx");
    expect(src).toContain("<StickerLayer");
  });

  it("la superficie de captura de miniaturas usa esa misma vista", () => {
    // Si divergieran, la miniatura mentiría sobre lo que el cliente recibe.
    const src = leer("../../app/plantilla/[slug]/page.tsx");
    expect(src).toContain("PublicInvitationView");
  });

  it("la capa no bloquea clics y es decorativa", () => {
    const src = leer("../../components/theme/sticker-layer.tsx");
    // `pointer-events-none` es lo que impide que un sticker se coma el clic del
    // RSVP; `aria-hidden` es lo correcto para decoración sin contenido.
    expect(src).toContain("pointer-events-none");
    expect(src).toContain("aria-hidden");
  });

  it("un tema sin stickers sigue siendo el caso por defecto", () => {
    expect(parseTheme({}).stickers).toEqual([]);
  });
});

describe("la validación de imagen por ORIGEN es la misma en todo el producto", () => {
  it.each([
    ["/arte/foto/boda-marco-floral.jpg", true],
    ["https://x.supabase.co/storage/v1/object/public/a.jpg", true],
    ["//cdn.ajeno.com/x.png", false],
    ["javascript:alert(1)", false],
    ["data:image/svg+xml;base64,AAA", false],
    ["suelto.jpg", false],
  ])("%s -> %s", (url, ok) => {
    expect(imagenUrlSchema.safeParse(url).success).toBe(ok);
  });

  it("el hero acepta una ruta servida por la app", () => {
    // Antes era `z.string().url()`, que la RECHAZABA: una plantilla no podía
    // traer su propia portada, y sin eso las familias F1 y F2 no existen.
    const r = moduleConfigSchemas.hero.safeParse({
      imageUrl: "/arte/foto/boda-marco-floral.jpg",
    });
    expect(r.success).toBe(true);
  });

  it("la galería también", () => {
    const r = moduleConfigSchemas.gallery.safeParse({
      images: ["/arte/boda-botanica.svg"],
    });
    expect(r.success).toBe(true);
  });

  it("y ninguna de las dos acepta un esquema raro", () => {
    expect(
      moduleConfigSchemas.hero.safeParse({ imageUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      moduleConfigSchemas.gallery.safeParse({ images: ["data:image/png;base64,A"] })
        .success,
    ).toBe(false);
  });
});
