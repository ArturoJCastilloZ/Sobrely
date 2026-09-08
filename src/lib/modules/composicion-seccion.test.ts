import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  MODULE_TYPES,
  defaultConfigFor,
  moduleConfigSchemas,
} from "@/lib/modules/types";

/**
 * Perillas de composición de sección (Fase 11 · P1).
 *
 * El research midió que el renderer sólo sabía hacer una columna centrada: 14
 * `text-center` contra 2 `text-left`, y UN eje horizontal en 652 líneas. `align`
 * y `bleed` abren el primer eje.
 *
 * El invariante que sostiene todo esto —y lo que esta prueba defiende— es que
 * con los valores por defecto **no se emite ni una clase**, así que los 11
 * sitios de llamada conservan su `className` intacto. No son iguales entre sí:
 * casi todos son `flex flex-col items-center text-center`, pero
 * `WelcomePreview` es un BLOQUE. Si `Section` impusiera su propio flex, ese se
 * rompería en silencio.
 *
 * Verificado por EFECTO en las dos direcciones:
 *   - con los defectos: 4 miniaturas recapturadas (una por valor de `font`),
 *     los 4 md5 idénticos byte a byte
 *   - control positivo: forzando `align: "start"` por defecto, el md5 de
 *     `baby-shower-neutro` cambió (19daae70… → 76f7a804…)
 */

const CON_LAYOUT = MODULE_TYPES.filter((t) => t !== "hero");

describe("las perillas existen donde se pintan, y sólo ahí", () => {
  it.each(CON_LAYOUT)("%s trae align=center y bleed=contained por defecto", (t) => {
    const cfg = defaultConfigFor(t);
    expect(cfg.align).toBe("center");
    expect(cfg.bleed).toBe("contained");
  });

  it("hero NO las lleva: no pasa por Section, su composición es P3", () => {
    const cfg = defaultConfigFor("hero");
    expect(cfg.align).toBeUndefined();
    expect(cfg.bleed).toBeUndefined();
  });

  it("una config vieja, sin las claves, sigue siendo válida y cae al defecto", () => {
    const cfg = moduleConfigSchemas.welcome.parse({ title: "Bienvenidos" });
    expect(cfg).toMatchObject({ align: "center", bleed: "contained" });
  });

  it("un valor inventado NO valida (el enum está cerrado)", () => {
    const r = moduleConfigSchemas.welcome.safeParse({ align: "justificado" });
    expect(r.success).toBe(false);
  });
});

describe("el defecto no emite ni una clase", () => {
  const src = readFileSync(
    fileURLToPath(new URL("../../components/modules/previews.tsx", import.meta.url)),
    "utf8",
  );

  const mapa = (nombre: string) => {
    const i = src.indexOf(`const ${nombre}`);
    expect(i, `falta ${nombre}`).toBeGreaterThan(-1);
    return src.slice(i, src.indexOf("};", i));
  };

  it("ALIGN_CLASSES.center es la cadena vacía", () => {
    expect(mapa("ALIGN_CLASSES")).toMatch(/center:\s*""/);
  });

  it("BLEED_CLASSES.contained es la cadena vacía", () => {
    expect(mapa("BLEED_CLASSES")).toMatch(/contained:\s*""/);
  });

  it("las clases se emiten DESPUÉS del className del llamador", () => {
    // `cn` resuelve con tailwind-merge y gana la última. Si ALIGN_CLASSES fuera
    // antes, una alineación explícita no podría borrar el `items-center
    // text-center` que el sitio de llamada trae escrito: quedaría en verde y
    // sin efecto.
    // Acotado al `cn(` y NO al cuerpo de la función: `className,` aparece
    // ANTES, como parámetro desestructurado de la firma, y medir contra esa
    // posición dejaba pasar la inversión — cazado por mutación.
    const i = src.indexOf("className={cn(", src.indexOf("function Section("));
    const cuerpo = src.slice(i, src.indexOf(")}", i));
    const posClassName = cuerpo.indexOf("className,");
    const posAlign = cuerpo.indexOf("ALIGN_CLASSES[align]");
    const posBleed = cuerpo.indexOf("BLEED_CLASSES[bleed]");
    expect(posClassName).toBeGreaterThan(-1);
    expect(posAlign).toBeGreaterThan(posClassName);
    expect(posBleed).toBeGreaterThan(posClassName);
  });

  it("los 11 módulos con perilla se las pasan a Section", () => {
    // `[\s>]` y no `\b`: `\b` casa también dentro de `Record<SectionAlign,…>`
    // y daba un conteo inflado. Lo destapó esta misma prueba al fallar.
    const usos = src.match(/<Section[\s>]/g) ?? [];
    const cableados = src.match(/align=\{config\.align\}/g) ?? [];
    // 12 usos porque el contador tiene dos ramas. Si alguien añade un <Section>
    // sin cablearlo, su módulo ignora la perilla en silencio.
    expect(usos.length).toBeGreaterThanOrEqual(12);
    expect(cableados.length).toBe(usos.length);
    expect(src.match(/bleed=\{config\.bleed\}/g)?.length).toBe(usos.length);
  });
});
