import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  MODULE_TYPES,
  defaultConfigFor,
  moduleConfigSchemas,
  parseConfig,
} from "@/lib/modules/types";

/**
 * Slot de media por módulo (Fase 11 · P2).
 *
 * El research midió que la fotografía del producto no existe: 0 de 50 heroes
 * con foto y 30 de 30 galerías vacías. Esto le da una superficie de imagen a
 * cada módulo, y `left`/`right` traen el eje horizontal que el renderer no
 * tenía — el «editorial partido», dentro del modelo modular.
 *
 * Verificado por EFECTO, en las dos direcciones:
 *   - con los defectos: 4 miniaturas recapturadas, los 4 md5 idénticos
 *   - control positivo: con `position: "left"` el md5 de baby-shower-neutro
 *     cambió (19daae70… → 60d28c80…), y medido en el navegador real el reparto
 *     es `column` 327+327 a 375 px y `row` 388+388 a 1200 px
 *
 * ⚠️ Lo que casi me engaña, y por eso hay una prueba dedicada: el `.default({…})`
 * del objeto `media` **eclipsa** los defaults de sus campos cuando la clave
 * falta del todo. Mi primer control positivo cambió los defaults INTERNOS, no se
 * aplicó, y el md5 no se movió — lo que se lee igual que «la primitiva no
 * funciona». Las dos capas tienen que coincidir o el defecto real deja de ser
 * el que uno cree.
 */

const CON_MEDIA = MODULE_TYPES.filter((t) => t !== "hero");

describe("el slot existe donde se pinta", () => {
  it.each(CON_MEDIA)("%s trae media en position=none y sin url", (t) => {
    const cfg = defaultConfigFor(t) as { media: Record<string, unknown> };
    expect(cfg.media).toMatchObject({
      url: "",
      position: "none",
      overlay: 0,
      shape: "rect",
    });
  });

  it("hero no lleva slot: su composición es P3", () => {
    expect((defaultConfigFor("hero") as Record<string, unknown>).media).toBeUndefined();
  });

  it("las DOS capas de defecto coinciden", () => {
    // La externa es la que manda cuando `media` falta; la interna, cuando llega
    // a medias. Si divergen, el valor efectivo depende de qué tan completa
    // venga la config guardada — que es un fallo silencioso perfecto.
    const sinClave = moduleConfigSchemas.welcome.parse({}) as {
      media: Record<string, unknown>;
    };
    const claveVacia = moduleConfigSchemas.welcome.parse({ media: {} }) as {
      media: Record<string, unknown>;
    };
    expect(sinClave.media).toEqual(claveVacia.media);
  });
});

describe("retro-compatibilidad", () => {
  it("una config guardada sin `media` sigue siendo válida", () => {
    const cfg = parseConfig("welcome", { title: "Bienvenidos", message: "Hola" });
    expect(cfg.title).toBe("Bienvenidos");
    expect((cfg.media as Record<string, unknown>).position).toBe("none");
  });

  it("una posición inventada no valida", () => {
    expect(
      moduleConfigSchemas.welcome.safeParse({ media: { position: "diagonal" } })
        .success,
    ).toBe(false);
  });

  it("el velo está acotado a 0–1", () => {
    expect(
      moduleConfigSchemas.welcome.safeParse({ media: { overlay: 2 } }).success,
    ).toBe(false);
  });
});

describe("el velo del hero deja de estar hardcodeado", () => {
  const src = readFileSync(
    fileURLToPath(new URL("../../components/modules/previews.tsx", import.meta.url)),
    "utf8",
  );

  it("el defecto sigue siendo 0.45, que es lo que ya tenían las guardadas", () => {
    expect((defaultConfigFor("hero") as { overlay: number }).overlay).toBe(0.45);
  });

  it("el gradiente usa el valor de config, no un número escrito a mano", () => {
    // Hasta el SIGUIENTE `export function`, y no hasta el primer `\n}`: ese
    // cierra el desestructurado de los props y dejaba el cuerpo fuera del
    // recorte. Tercera vez esta sesión que un slice mal anclado miente.
    const i = src.indexOf("export function HeroPreview");
    const cuerpo = src.slice(i, src.indexOf("export function", i + 20));
    expect(cuerpo).toContain("config.overlay");
    expect(cuerpo).not.toContain("rgba(0,0,0,.45)");
  });
});

describe("sin imagen, el árbol es el de antes", () => {
  const src = readFileSync(
    fileURLToPath(new URL("../../components/modules/previews.tsx", import.meta.url)),
    "utf8",
  );

  it("Section sólo envuelve cuando hay imagen que pintar", () => {
    const i = src.indexOf("function Section(");
    const cuerpo = src.slice(i, src.indexOf("</section>", i));
    // Las tres condiciones importan: sin prop, en `none`, o sin url, el
    // contenido pasa TAL CUAL. Es lo que sostiene la igualdad de md5.
    expect(cuerpo).toContain('media.position !== "none"');
    expect(cuerpo).toContain("media.url");
    expect(cuerpo).toMatch(/contenido = conMedia \?/);
  });

  it("los 12 <Section> reciben el slot", () => {
    const usos = src.match(/<Section[\s>]/g) ?? [];
    const cableados = src.match(/media=\{config\.media\}/g) ?? [];
    expect(usos.length).toBeGreaterThanOrEqual(12);
    expect(cableados.length).toBe(usos.length);
  });
});
